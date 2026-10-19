-- HappiWell Telemed — ปิดช่องโหว่ RLS (2026-10-19)
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run

-- 1) ลบ policy ที่เปิดให้ทุกคน (รวมคนที่ไม่ได้ล็อกอิน) อ่าน/แก้/ลบข้อมูลสุขภาพได้
drop policy if exists allow_all_bp       on public.hw_bp_records;
drop policy if exists allow_all_dtx      on public.hw_dtx_records;
drop policy if exists allow_all_lab      on public.hw_lab_results;
drop policy if exists allow_all_history  on public.hw_medical_history;
drop policy if exists allow_all_med      on public.hw_medications;
drop policy if exists allow_all_vaccines on public.hw_vaccines;

-- ตัวช่วย: คนไข้คนนี้มีนัดกับหมอที่ล็อกอินอยู่หรือไม่
create or replace function public.is_my_patient(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from hw_appointments a
    join hw_doctors d on d.id = a.doctor_id
    where a.user_id = p_user and d.user_id = auth.uid()
  )
$$;
revoke all on function public.is_my_patient(uuid) from public, anon;
grant execute on function public.is_my_patient(uuid) to authenticated;

-- 2) หมอ: อ่าน + เพิ่มประวัติการรักษาของคนไข้ตัวเอง (ใช้ตอนกด "เสร็จสิ้น")
drop policy if exists doctor_patient_history_select on public.hw_medical_history;
create policy doctor_patient_history_select on public.hw_medical_history
  for select to authenticated using (public.is_my_patient(user_id));
drop policy if exists doctor_patient_history_insert on public.hw_medical_history;
create policy doctor_patient_history_insert on public.hw_medical_history
  for insert to authenticated with check (public.is_my_patient(user_id));

-- 3) หมอ: อ่านข้อมูลห้องวิดีโอของนัดตัวเอง
drop policy if exists doctor_read_consultations on public.hw_consultations;
create policy doctor_read_consultations on public.hw_consultations
  for select to authenticated using (
    appointment_id in (select a.id from hw_appointments a join hw_doctors d on d.id = a.doctor_id where d.user_id = auth.uid())
  );

-- 4) รายการยาใน Rx: คนไข้อ่านได้อย่างเดียว (เดิมแก้ได้)
drop policy if exists rx_items_via_rx on public.hw_rx_items;
drop policy if exists rx_items_staff_all on public.hw_rx_items;
create policy rx_items_staff_all on public.hw_rx_items
  for all to authenticated using (
    rx_id in (select r.id from hw_rx r where
      r.doctor_id in (select id from hw_doctors where user_id = auth.uid())
      or exists (select 1 from hw_users u where u.id = auth.uid() and u.role in ('admin','superadmin')))
  );
drop policy if exists rx_items_patient_read on public.hw_rx_items;
create policy rx_items_patient_read on public.hw_rx_items
  for select to authenticated using (
    rx_id in (select r.id from hw_rx r where r.patient_id = auth.uid())
  );

-- ตรวจผล: ต้องได้ 0 แถว
select tablename, policyname from pg_policies
where schemaname = 'public' and policyname like 'allow_all%';
