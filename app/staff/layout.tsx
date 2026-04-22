// app/staff/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyProfile } from '@/lib/queries'
import StaffNav from '@/components/staff/StaffNav'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const profile = await getMyProfile(supabase)
  if (!profile) redirect('/login')

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0b0d14' }}>
      <StaffNav profile={profile} />
      <main style={{ flex: 1, overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {children}
      </main>
    </div>
  )
}
