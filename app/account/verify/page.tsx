import { redirect } from 'next/navigation'

export default function VerifyRedirect() {
  redirect('/account/profile')
}
