import DoctorShell from '@/components/DoctorShell'

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return <DoctorShell>{children}</DoctorShell>
}
