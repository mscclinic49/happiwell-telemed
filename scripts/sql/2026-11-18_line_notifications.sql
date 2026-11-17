-- HappiWell Telemed — แจ้งเตือนนัดหมายผ่าน LINE OA (2026-11-18)
-- รันแล้วผ่าน Supabase migration ชื่อ telemed_line_notifications
--
-- เปิดใช้งาน: ใส่ Channel access token ของ LINE OA (Messaging API) ไว้ใน Vault
--   select vault.create_secret('<token>', 'line_channel_access_token');
-- ก่อนใส่ token ระบบจะข้ามการส่งเฉยๆ ไม่มีอะไรพัง

-- รหัสชั่วคราวสำหรับผูกบัญชี LINE (ใช้ผ่าน service role เท่านั้น)
create table if not exists public.hw_line_link_codes (
  code text primary key,
  user_id uuid not null references public.hw_users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.hw_line_link_codes enable row level security;

-- บันทึกข้อความที่ส่งออกไปแล้ว (กันส่งซ้ำ + ตรวจย้อนหลัง)
create table if not exists public.hw_notifications (
  id bigserial primary key,
  appointment_id uuid references public.hw_appointments(id) on delete cascade,
  user_id uuid references public.hw_users(id) on delete cascade,
  kind text not null,
  channel text not null default 'line',
  request_id bigint,
  created_at timestamptz not null default now()
);
create unique index if not exists hw_notifications_once
  on public.hw_notifications (appointment_id, kind) where appointment_id is not null;
alter table public.hw_notifications enable row level security;
drop policy if exists notifications_own_read on public.hw_notifications;
create policy notifications_own_read on public.hw_notifications
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- ส่ง push ไป LINE (คืน null ถ้ายังไม่ได้ตั้ง token หรือคนไข้ยังไม่ผูก LINE)
create or replace function public.hw_line_push(p_to text, p_messages jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_token text;
begin
  if p_to is null then return null; end if;
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'line_channel_access_token' limit 1;
  if v_token is null then return null; end if;
  return net.http_post(
    url := 'https://api.line.me/v2/bot/message/push',
    body := jsonb_build_object('to', p_to, 'messages', p_messages),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_token),
    timeout_milliseconds := 8000
  );
end $$;
revoke all on function public.hw_line_push(text, jsonb) from public, anon, authenticated;

-- ข้อความ Flex ของแต่ละเหตุการณ์
create or replace function public.hw_appt_flex(p_appt uuid, p_kind text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  base constant text := 'https://happiwell-telemed.vercel.app';
  days constant text[] := array['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
  months constant text[] := array['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  a record; local timestamp; v_date text; v_time text;
  v_title text; v_sub text; v_btn text; v_url text; v_color text := '#128F76';
begin
  select ap.id, ap.scheduled_at, d.full_name as doctor into a
  from hw_appointments ap left join hw_doctors d on d.id = ap.doctor_id where ap.id = p_appt;
  if a.id is null then return null; end if;

  local := a.scheduled_at at time zone 'Asia/Bangkok';
  v_date := 'วัน' || days[extract(dow from local)::int + 1] || 'ที่ ' || extract(day from local)::int
            || ' ' || months[extract(month from local)::int] || ' ' || (extract(year from local)::int + 543);
  v_time := to_char(local, 'HH24:MI') || ' น.';

  case p_kind
    when 'booked' then
      v_title := 'นัดหมายเรียบร้อย'; v_sub := 'เราจะส่งข้อความเตือนก่อนถึงเวลานัด';
      v_btn := 'ดูนัดหมาย'; v_url := base || '/';
    when 'reminder_day' then
      v_title := 'อย่าลืมนัดปรึกษาแพทย์'; v_sub := 'เตรียมกล้อง ไมโครโฟน และอินเทอร์เน็ตให้พร้อม';
      v_btn := 'ดูนัดหมาย'; v_url := base || '/';
    when 'reminder_soon' then
      v_title := 'อีกไม่กี่นาทีถึงเวลานัด'; v_sub := 'กดเข้าห้องปรึกษาเพื่อรอแพทย์ได้เลย';
      v_btn := 'เข้าห้องปรึกษา'; v_url := base || '/consult/' || a.id;
    when 'room_open' then
      v_title := 'แพทย์พร้อมแล้ว'; v_sub := 'แพทย์เปิดห้องปรึกษาแล้ว กดเข้าห้องได้ทันที';
      v_btn := 'เข้าห้องปรึกษา'; v_url := base || '/consult/' || a.id;
    when 'cancelled' then
      v_title := 'นัดหมายถูกยกเลิก'; v_sub := 'หากต้องการพบแพทย์ สามารถนัดเวลาใหม่ได้';
      v_btn := 'นัดเวลาใหม่'; v_url := base || '/doctors'; v_color := '#E94B5C';
    else return null;
  end case;

  return jsonb_build_object(
    'type', 'flex',
    'altText', v_title || ' — ' || v_date || ' ' || v_time,
    'contents', jsonb_build_object(
      'type', 'bubble',
      'body', jsonb_build_object('type', 'box', 'layout', 'vertical', 'spacing', 'md', 'contents', jsonb_build_array(
        jsonb_build_object('type', 'text', 'text', 'HappiWell ปรึกษาแพทย์ออนไลน์', 'size', 'xs', 'color', '#4A63E0', 'weight', 'bold'),
        jsonb_build_object('type', 'text', 'text', v_title, 'size', 'xl', 'weight', 'bold', 'color', v_color, 'wrap', true),
        jsonb_build_object('type', 'text', 'text', v_sub, 'size', 'sm', 'color', '#6B7280', 'wrap', true),
        jsonb_build_object('type', 'separator', 'margin', 'lg'),
        jsonb_build_object('type', 'box', 'layout', 'vertical', 'spacing', 'sm', 'margin', 'lg', 'contents', jsonb_build_array(
          jsonb_build_object('type', 'box', 'layout', 'baseline', 'contents', jsonb_build_array(
            jsonb_build_object('type', 'text', 'text', 'แพทย์', 'size', 'sm', 'color', '#6B7280', 'flex', 2),
            jsonb_build_object('type', 'text', 'text', coalesce(a.doctor, '-'), 'size', 'sm', 'flex', 6, 'wrap', true))),
          jsonb_build_object('type', 'box', 'layout', 'baseline', 'contents', jsonb_build_array(
            jsonb_build_object('type', 'text', 'text', 'วันที่', 'size', 'sm', 'color', '#6B7280', 'flex', 2),
            jsonb_build_object('type', 'text', 'text', v_date, 'size', 'sm', 'flex', 6, 'wrap', true))),
          jsonb_build_object('type', 'box', 'layout', 'baseline', 'contents', jsonb_build_array(
            jsonb_build_object('type', 'text', 'text', 'เวลา', 'size', 'sm', 'color', '#6B7280', 'flex', 2),
            jsonb_build_object('type', 'text', 'text', v_time, 'size', 'sm', 'flex', 6, 'weight', 'bold')))
        ))
      )),
      'footer', jsonb_build_object('type', 'box', 'layout', 'vertical', 'contents', jsonb_build_array(
        jsonb_build_object('type', 'button', 'style', 'primary', 'color', v_color, 'height', 'sm',
          'action', jsonb_build_object('type', 'uri', 'label', v_btn, 'uri', v_url))
      ))
    )
  );
end $$;
revoke all on function public.hw_appt_flex(uuid, text) from public, anon, authenticated;

-- ส่งแจ้งเตือนของนัด 1 ครั้งต่อเหตุการณ์ (ส่งซ้ำไม่ได้ เพราะมี unique index)
create or replace function public.hw_notify_appointment(p_appt uuid, p_kind text)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_line text; v_msg jsonb; v_req bigint;
begin
  select ap.user_id, u.line_user_id into v_user, v_line
  from hw_appointments ap join hw_users u on u.id = ap.user_id where ap.id = p_appt;
  if v_line is null then return; end if;
  if exists (select 1 from hw_notifications where appointment_id = p_appt and kind = p_kind) then return; end if;
  v_msg := public.hw_appt_flex(p_appt, p_kind);
  if v_msg is null then return; end if;
  v_req := public.hw_line_push(v_line, jsonb_build_array(v_msg));
  if v_req is null then return; end if;
  insert into hw_notifications (appointment_id, user_id, kind, request_id)
  values (p_appt, v_user, p_kind, v_req) on conflict do nothing;
exception when others then
  -- แจ้งเตือนพังต้องไม่ทำให้การจอง/ยกเลิกพังตาม
  raise warning 'hw_notify_appointment(%, %) failed: %', p_appt, p_kind, sqlerrm;
end $$;
revoke all on function public.hw_notify_appointment(uuid, text) from public, anon, authenticated;

-- ข้อความต้อนรับหลังผูก LINE สำเร็จ (เรียกจาก API ด้วย service role)
create or replace function public.hw_notify_line_linked(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_line text; v_name text;
begin
  select line_user_id, coalesce(first_name, full_name, '') into v_line, v_name from hw_users where id = p_user;
  perform public.hw_line_push(v_line, jsonb_build_array(jsonb_build_object('type', 'text', 'text',
    'เชื่อมต่อ LINE กับ HappiWell เรียบร้อยแล้ว' || case when v_name <> '' then ' คุณ' || v_name else '' end
    || E'\nเราจะแจ้งยืนยันนัด เตือนก่อนถึงเวลา และส่งลิงก์เข้าห้องปรึกษาทางนี้')));
exception when others then
  raise warning 'hw_notify_line_linked failed: %', sqlerrm;
end $$;
revoke all on function public.hw_notify_line_linked(uuid) from public, anon, authenticated;
grant execute on function public.hw_notify_line_linked(uuid) to service_role;

-- เหตุการณ์จากตาราง
create or replace function public.trg_hw_appt_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.status in ('pending', 'confirmed') then
    perform public.hw_notify_appointment(new.id, 'booked');
  elsif tg_op = 'UPDATE' and new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    perform public.hw_notify_appointment(new.id, 'cancelled');
  end if;
  return null;
end $$;
drop trigger if exists trg_hw_appt_notify on public.hw_appointments;
create trigger trg_hw_appt_notify after insert or update of status on public.hw_appointments
  for each row execute function public.trg_hw_appt_notify();

create or replace function public.trg_hw_room_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.appointment_id is not null and exists (
    select 1 from hw_appointments where id = new.appointment_id and status in ('pending', 'confirmed')
  ) then
    perform public.hw_notify_appointment(new.appointment_id, 'room_open');
  end if;
  return null;
end $$;
drop trigger if exists trg_hw_room_notify on public.hw_consultations;
create trigger trg_hw_room_notify after insert on public.hw_consultations
  for each row execute function public.trg_hw_room_notify();

-- เตือนล่วงหน้า (pg_cron ทุก 5 นาที)
create or replace function public.hw_send_appointment_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0;
begin
  -- เตือนล่วงหน้า (ภายใน 24 ชม.) — ข้ามถ้าเพิ่งจองไม่ถึง 2 ชม.
  for r in
    select ap.id from hw_appointments ap join hw_users u on u.id = ap.user_id
    where ap.status in ('pending', 'confirmed') and u.line_user_id is not null
      and ap.scheduled_at between now() + interval '3 hours' and now() + interval '24 hours'
      and ap.created_at < now() - interval '2 hours'
      and not exists (select 1 from hw_notifications x where x.appointment_id = ap.id and x.kind = 'reminder_day')
  loop
    perform public.hw_notify_appointment(r.id, 'reminder_day'); n := n + 1;
  end loop;
  -- เตือน 15–20 นาทีก่อนนัด พร้อมลิงก์เข้าห้อง
  for r in
    select ap.id from hw_appointments ap join hw_users u on u.id = ap.user_id
    where ap.status in ('pending', 'confirmed') and u.line_user_id is not null
      and ap.consultation_type <> 'walk-in'
      and ap.scheduled_at between now() and now() + interval '20 minutes'
      and ap.created_at < now() - interval '15 minutes'
      and not exists (select 1 from hw_notifications x where x.appointment_id = ap.id and x.kind in ('reminder_soon', 'room_open'))
  loop
    perform public.hw_notify_appointment(r.id, 'reminder_soon'); n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.hw_send_appointment_reminders() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'telemed-appointment-reminders';
select cron.schedule('telemed-appointment-reminders', '*/5 * * * *', 'select public.hw_send_appointment_reminders()');
