// app/admin/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyProfile } from '@/lib/queries'
import AdminNav from '@/components/admin/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const profile = await getMyProfile(supabase)
  if (!profile) redirect('/login')
  if (profile.role !== 'admin') redirect('/staff')

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0b0d14' }}>
      <AdminNav profile={profile} />
      <main style={{ flex: 1, overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {children}
      </main>
    </div>
  )
}
