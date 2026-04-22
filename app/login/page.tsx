'use client'
export const dynamic = 'force-dynamic'
// app/login/page.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Welcome back!')
      router.push('/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0b0d14', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        background: '#111420', border: '1px solid #252a45', borderRadius: '16px',
        padding: '40px', width: '380px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '9px',
            background: 'linear-gradient(135deg,#5b73ff,#7c5cfc)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '700', color: '#fff', fontSize: '14px',
          }}>C</div>
          <span style={{ fontWeight: '700', fontSize: '16px', color: '#dde2f5' }}>
            Campaign<span style={{ color: '#5b73ff' }}>OS</span>
          </span>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#dde2f5', marginBottom: '4px' }}>Sign in</div>
          <div style={{ fontSize: '13px', color: '#6b7599' }}>Enter your credentials to continue</div>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#6b7599', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.4px' }}>
              Email
            </label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={{
                width: '100%', background: '#171a2e', border: '1px solid #2e3556',
                borderRadius: '8px', color: '#dde2f5', padding: '9px 12px',
                fontSize: '13px', fontFamily: 'inherit', outline: 'none',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#6b7599', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.4px' }}>
              Password
            </label>
            <input
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', background: '#171a2e', border: '1px solid #2e3556',
                borderRadius: '8px', color: '#dde2f5', padding: '9px 12px',
                fontSize: '13px', fontFamily: 'inherit', outline: 'none',
              }}
            />
          </div>
          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
              background: 'linear-gradient(135deg,#5b73ff,#7c5cfc)', color: '#fff',
              fontSize: '13px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, marginTop: '6px', fontFamily: 'inherit',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
