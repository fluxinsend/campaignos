export const dynamic = 'force-dynamic'
// app/dashboard/page.tsx — redirects based on role
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyProfile } from '@/lib/queries'

export default async function DashboardPage() {
  const supabase = createClient()
  const profile = await getMyProfile(supabase)

  if (!profile) redirect('/login')
  if (profile.role === 'admin') redirect('/admin')
  redirect('/staff')
}
