-- HappiWell Telemed — จองนัดเอง + ปิดช่องแก้สิทธิ์ตัวเอง (2026-11-18)
-- รันแล้วผ่าน Supabase migration ชื่อ booking_and_security

-- 1) กันคนไข้แก้ role / identity_verified / hn / cid / line_user_id ของตัวเอง
--    (เดิม policy users_update_own_profile ให้แก้ได้ทุกคอลัมน์ → ตั้งตัวเองเป็น admin ได้)
create or replace function public.hw_users_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') or public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.identity_verified is distinct from old.identity_verified
     or new.hn is distinct from old.hn
     or new.cid is distinct from old.cid
     or new.line_user_id is distinct from old.line_user_id
     or new.last_visit_date is distinct from old.last_visit_date then
    raise exception 'ไม่มีสิทธิ์แก้ไขข้อมูลนี้' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists trg_hw_users_guard on public.hw_users;
create trigger trg_hw_users_guard before update on public.hw_users
  for each row execute function public.hw_users_guard();

-- trigger นี้ต้องอัปเดต hw_users ข้ามสิทธิ์ (หมอกด "เสร็จสิ้น") — เดิมโดน RLS กันเงียบๆ
alter function public.fn_update_last_visit_date() security definer set search_path = public;

-- 2) คนไข้ไม่ต้องแก้นัดเองโดยตรงแล้ว (ยกเลิกผ่าน /api/appointments/cancel)
drop policy if exists appointments_own_update on public.hw_appointments;

-- 3) กันจองช่องเวลาซ้ำ (walk-in ไม่นับ เพราะเป็นคิวทันที)
create unique index if not exists hw_appointments_doctor_slot_uniq
  on public.hw_appointments (doctor_id, scheduled_at)
  where status in ('pending', 'confirmed') and consultation_type <> 'walk-in';

-- 4) ช่องเวลาที่ถูกจองแล้ว — คืนแค่เวลา ไม่มีข้อมูลคนไข้
create or replace function public.hw_booked_slots(p_doctor uuid, p_from timestamptz, p_to timestamptz)
returns table (scheduled_at timestamptz, duration_minutes integer)
language sql stable security definer set search_path = public as $$
  select a.scheduled_at, coalesce(a.duration_minutes, 15)
  from hw_appointments a
  where a.doctor_id = p_doctor
    and a.status in ('pending', 'confirmed')
    and a.scheduled_at >= p_from and a.scheduled_at < p_to
$$;
revoke all on function public.hw_booked_slots(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.hw_booked_slots(uuid, timestamptz, timestamptz) to authenticated, service_role;
