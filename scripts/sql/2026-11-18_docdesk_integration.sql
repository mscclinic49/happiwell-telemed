-- HappiWell Telemed ↔ DocDesk (2026-11-18)
-- telemed เป็นห้องตรวจ, DocDesk เป็นช่องทางนัด/ข้อความ LINE ทั้งหมด
-- รันแล้วผ่าน Supabase migration ชื่อ telemed_docdesk_integration
--
-- ต้องมีใน Vault (ใส่ครั้งเดียว):
--   docdesk_events_url         = https://docdesk-tau.vercel.app/api/integrations/telemed/events
--   docdesk_integration_secret = รหัสลับเดียวกับ env DOCDESK_INTEGRATION_SECRET (telemed) และ TELEMED_INTEGRATION_SECRET (DocDesk)

-- ── 1) ถอดระบบส่ง LINE ตรงของ telemed (DocDesk ส่งแทน) ─────────────────
select cron.unschedule(jobid) from cron.job where jobname = 'telemed-appointment-reminders';
drop trigger if exists trg_hw_appt_notify on public.hw_appointments;
drop trigger if exists trg_hw_room_notify on public.hw_consultations;
drop function if exists public.trg_hw_appt_notify();
drop function if exists public.trg_hw_room_notify();
drop function if exists public.hw_send_appointment_reminders();
drop function if exists public.hw_notify_line_linked(uuid);
drop function if exists public.hw_notify_appointment(uuid, text);
drop function if exists public.hw_appt_flex(uuid, text);
drop function if exists public.hw_line_push(text, jsonb);
drop table if exists public.hw_line_link_codes;
drop table if exists public.hw_notifications;

-- ── 2) นัดที่มาจาก DocDesk ───────────────────────────────────────────────
alter table public.hw_appointments
  add column if not exists source text not null default 'telemed',
  add column if not exists docdesk_appointment_id text,
  add column if not exists docdesk_conversation_id text;

-- ลิงก์เข้าห้องแบบไม่ต้องล็อกอิน (1 นัด 1 ลิงก์) — อ่าน/เขียนผ่าน service role เท่านั้น
create table if not exists public.hw_join_tokens (
  token text primary key,
  appointment_id uuid not null unique references public.hw_appointments(id) on delete cascade,
  expires_at timestamptz not null,
  last_used_at timestamptz,
  use_count integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.hw_join_tokens enable row level security;

create or replace function public.hw_join_url(p_appt uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_token text; v_at timestamptz;
begin
  select token into v_token from hw_join_tokens where appointment_id = p_appt;
  if v_token is null then
    select scheduled_at into v_at from hw_appointments where id = p_appt;
    if v_at is null then return null; end if;
    v_token := translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/=', '-_');
    insert into hw_join_tokens (token, appointment_id, expires_at)
    values (v_token, p_appt, v_at + interval '1 day')
    on conflict (appointment_id) do update set expires_at = excluded.expires_at
    returning token into v_token;
  else
    -- เลื่อนนัด: ลิงก์ใช้ได้ถึงวันหลังนัดใหม่
    update hw_join_tokens set expires_at = (select scheduled_at from hw_appointments where id = p_appt) + interval '1 day'
    where appointment_id = p_appt;
  end if;
  return 'https://happiwell-telemed.vercel.app/j/' || v_token;
end $$;
revoke all on function public.hw_join_url(uuid) from public, anon, authenticated;
grant execute on function public.hw_join_url(uuid) to service_role;

-- ── 3) ส่งเหตุการณ์ไป DocDesk ──────────────────────────────────────────
create table if not exists public.hw_docdesk_events (
  id bigserial primary key,
  appointment_id uuid references public.hw_appointments(id) on delete cascade,
  event text not null,
  payload jsonb not null,
  request_id bigint,
  created_at timestamptz not null default now()
);
alter table public.hw_docdesk_events enable row level security;
drop policy if exists docdesk_events_admin_read on public.hw_docdesk_events;
create policy docdesk_events_admin_read on public.hw_docdesk_events for select to authenticated using (public.is_admin());

create or replace function public.hw_docdesk_emit(p_appt uuid, p_event text)
returns void language plpgsql security definer set search_path = public as $$
declare v_url text; v_secret text; v_payload jsonb; v_req bigint;
begin
  select jsonb_build_object(
    'event', p_event,
    'sent_at', now(),
    'appointment', jsonb_build_object(
      'telemed_id', a.id,
      'status', a.status,
      'scheduled_at', a.scheduled_at,
      'duration_minutes', coalesce(a.duration_minutes, 15),
      'source', a.source,
      'docdesk_appointment_id', a.docdesk_appointment_id,
      'docdesk_conversation_id', a.docdesk_conversation_id,
      'doctor_name', d.full_name,
      'patient_id', u.id,
      'patient_name', coalesce(nullif(trim(coalesce(u.title, '') || coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), u.full_name),
      'phone', u.phone,
      'hn', u.hn,
      'join_url', public.hw_join_url(a.id),
      'cancelled_reason', a.cancelled_reason
    )
  ) into v_payload
  from hw_appointments a
  left join hw_doctors d on d.id = a.doctor_id
  left join hw_users u on u.id = a.user_id
  where a.id = p_appt;
  if v_payload is null then return; end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'docdesk_events_url' limit 1;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'docdesk_integration_secret' limit 1;
  if v_url is not null and v_secret is not null then
    v_req := net.http_post(
      url := v_url,
      body := v_payload,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-telemed-secret', v_secret),
      timeout_milliseconds := 8000
    );
  end if;
  insert into hw_docdesk_events (appointment_id, event, payload, request_id) values (p_appt, p_event, v_payload, v_req);
exception when others then
  -- ส่งไม่ได้ต้องไม่ทำให้การจอง/ยกเลิก/เปิดห้องพัง
  raise warning 'hw_docdesk_emit(%, %) failed: %', p_appt, p_event, sqlerrm;
end $$;
revoke all on function public.hw_docdesk_emit(uuid, text) from public, anon, authenticated;

create or replace function public.trg_hw_appt_docdesk()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.hw_docdesk_emit(new.id, 'upsert');
  elsif new.status is distinct from old.status and new.status = 'cancelled' then
    perform public.hw_docdesk_emit(new.id, 'cancelled');
  elsif new.status is distinct from old.status and new.status = 'completed' then
    perform public.hw_docdesk_emit(new.id, 'completed');
  elsif new.scheduled_at is distinct from old.scheduled_at or new.doctor_id is distinct from old.doctor_id then
    perform public.hw_docdesk_emit(new.id, 'upsert');
  end if;
  return null;
end $$;
drop trigger if exists trg_hw_appt_docdesk on public.hw_appointments;
create trigger trg_hw_appt_docdesk after insert or update of status, scheduled_at, doctor_id on public.hw_appointments
  for each row execute function public.trg_hw_appt_docdesk();

create or replace function public.trg_hw_room_docdesk()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.appointment_id is not null and exists (
    select 1 from hw_appointments where id = new.appointment_id and status in ('pending', 'confirmed')
  ) then
    perform public.hw_docdesk_emit(new.appointment_id, 'room_open');
  end if;
  return null;
end $$;
drop trigger if exists trg_hw_room_docdesk on public.hw_consultations;
create trigger trg_hw_room_docdesk after insert on public.hw_consultations
  for each row execute function public.trg_hw_room_docdesk();

-- ── 4) แชทกับแพทย์ระหว่างปรึกษา: เห็นแค่คนไข้กับแพทย์ของนัดนั้น ─────────
-- แอดมินอ่านได้เฉพาะแชทที่ไม่ใช่แชทปรึกษา
drop policy if exists admin_all_conversations on public.hw_conversations;
create policy admin_all_conversations on public.hw_conversations
  for all to authenticated using (public.is_admin() and coalesce(type, '') <> 'consult')
  with check (public.is_admin() and coalesce(type, '') <> 'consult');
drop policy if exists admin_all_messages on public.hw_messages;
create policy admin_all_messages on public.hw_messages
  for all to authenticated using (public.is_admin() and exists (
    select 1 from hw_conversations c where c.id = hw_messages.conversation_id and coalesce(c.type, '') <> 'consult'))
  with check (public.is_admin() and exists (
    select 1 from hw_conversations c where c.id = hw_messages.conversation_id and coalesce(c.type, '') <> 'consult'));
-- คนไข้สร้างห้องแชทปรึกษาเองไม่ได้ (สร้างผ่าน hw_consult_conversation)
drop policy if exists patient_insert_conversations on public.hw_conversations;
create policy patient_insert_conversations on public.hw_conversations
  for insert to authenticated with check (patient_id = auth.uid() and coalesce(type, '') <> 'consult');

-- เปิด/คืนห้องแชทของนัด ให้เฉพาะคนไข้หรือแพทย์ของนัดนั้น
create or replace function public.hw_consult_conversation(p_appt uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare a record; v_id uuid;
begin
  select ap.id, ap.user_id, ap.doctor_id, d.user_id as doctor_user, d.full_name into a
  from hw_appointments ap left join hw_doctors d on d.id = ap.doctor_id where ap.id = p_appt;
  if a.id is null or auth.uid() is null or (auth.uid() <> a.user_id and auth.uid() is distinct from a.doctor_user) then
    raise exception 'ไม่มีสิทธิ์' using errcode = '42501';
  end if;
  select id into v_id from hw_conversations where appointment_id = p_appt and type = 'consult' limit 1;
  if v_id is null then
    insert into hw_conversations (type, patient_id, doctor_id, appointment_id, title, last_message_at)
    values ('consult', a.user_id, a.doctor_id, p_appt, 'ปรึกษา ' || coalesce(a.full_name, 'แพทย์'), now())
    returning id into v_id;
  end if;
  return v_id;
end $$;
revoke all on function public.hw_consult_conversation(uuid) from public, anon;
grant execute on function public.hw_consult_conversation(uuid) to authenticated;

-- หลังตรวจเสร็จ/ยกเลิก คนไข้พิมพ์เพิ่มในแชทปรึกษาไม่ได้ (คุยต่อทาง LINE/DocDesk)
create or replace function public.hw_messages_consult_guard()
returns trigger language plpgsql set search_path = public as $$
declare c record;
begin
  select cv.type, cv.patient_id, ap.status into c
  from hw_conversations cv left join hw_appointments ap on ap.id = cv.appointment_id
  where cv.id = new.conversation_id;
  if c.type = 'consult' and new.sender_id = c.patient_id and c.status in ('completed', 'cancelled') then
    raise exception 'การปรึกษานี้จบแล้ว หากมีคำถามเพิ่มเติม แชทกับคลินิกทาง LINE' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists trg_hw_messages_consult_guard on public.hw_messages;
create trigger trg_hw_messages_consult_guard before insert on public.hw_messages
  for each row execute function public.hw_messages_consult_guard();

-- ── 5) รูปในแชทต้องไม่เปิดสาธารณะ ───────────────────────────────────────
update storage.buckets set public = false where id = 'chat-images';
