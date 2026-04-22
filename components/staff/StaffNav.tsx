'use client'
// components/staff/StaffNav.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types'

const NAV = [
  { href: '/staff',          label: 'My Dashboard', icon: '▦' },
  { href: '/staff/leads',    label: 'Leads',         icon: '👥' },
  { href: '/staff/domains',  label: 'Domains',       icon: '🌐' },
]

export default function StaffNav({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside style={{
      width: '210px', flexShrink: 0, background: '#111420',
      borderRight: '1px solid #252a45', display: 'flex',
      flexDirection: 'column', height: '100vh',
    }}>
      {/* Logo */}
      <div style={{ padding: '16px', borderBottom: '1px solid #252a45', display: 'flex', alignItems: 'center', gap: '9px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px',
          background: 'linear-gradient(135deg,#5b73ff,#7c5cfc)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: '700', color: '#fff', flexShrink: 0,
        }}>C</div>
        <div>
          <div style={{ fontWeight: '700', fontSize: '13px', color: '#dde2f5', letterSpacing: '-.2px' }}>
            Campaign<span style={{ color: '#5b73ff' }}>OS</span>
          </div>
          <div style={{ fontSize: '10px', color: '#22c97a', marginTop: '1px' }}>Staff</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV.map(({ href, label, icon }) => {
          const active = href === '/staff' ? pathname === '/staff' : pathname.startsWith(href)
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: '9px',
              padding: '7px 10px', borderRadius: '8px', textDecoration: 'none',
              fontSize: '12.5px', fontWeight: '500', transition: 'all .15s',
              color: active ? '#818cf8' : '#6b7599',
              background: active ? 'rgba(91,115,255,.12)' : 'transparent',
              borderLeft: active ? '3px solid #5b73ff' : '3px solid transparent',
            }}>
              <span style={{ fontSize: '13px', opacity: active ? 1 : 0.7 }}>{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '10px 8px', borderTop: '1px solid #252a45', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {profile.role === 'admin' && (
          <Link href="/admin" style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px',
            borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontWeight: '500',
            color: '#6b7599', background: '#171a2e', border: '1px solid #252a45',
          }}>
            <span>⚙️</span> Admin View →
          </Link>
        )}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
          borderRadius: '8px', background: '#171a2e', border: '1px solid #252a45',
        }}>
          <div style={{
            width: '26px', height: '26px', borderRadius: '50%',
            background: 'rgba(34,201,122,.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', fontWeight: '700', color: '#22c97a', flexShrink: 0,
          }}>
            {(profile.full_name || profile.email).slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#dde2f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.full_name || profile.email.split('@')[0]}
            </div>
            <div style={{ fontSize: '10px', color: '#6b7599' }}>Staff</div>
          </div>
          <button onClick={signOut} title="Sign out" style={{
            background: 'none', border: 'none', color: '#6b7599',
            cursor: 'pointer', fontSize: '13px', padding: '2px', flexShrink: 0,
          }}>⎋</button>
        </div>
      </div>
    </aside>
  )
}
