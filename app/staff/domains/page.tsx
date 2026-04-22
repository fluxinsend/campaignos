'use client'
// app/staff/domains/page.tsx
import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getDomains, addDomain, logActivity } from '@/lib/queries'
import type { Domain } from '@/types'
import toast from 'react-hot-toast'

export default function StaffDomainsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [domains, setDomains] = useState<Domain[]>([])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const d = await getDomains(supabase)
    setDomains(d as Domain[])
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!input.trim()) { toast.error('Enter a domain name'); return }
    setLoading(true)
    const { error } = await addDomain(supabase, input.trim())
    if (error) toast.error(error.message)
    else {
      toast.success('Domain added — pending activation by admin')
      await logActivity(supabase, { action: `Domain added by staff: ${input.trim()}`, entity_type: 'domain' })
      setInput('')
      load()
    }
    setLoading(false)
  }

  const active   = domains.filter(d => d.status === 'active')
  const inactive = domains.filter(d => d.status === 'inactive')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <div style={{ fontSize: '20px', fontWeight: '700' }}>Domains</div>
        <div style={{ fontSize: '12px', color: '#6b7599', marginTop: '3px' }}>
          All domains are shared with the team. Admin can activate / deactivate.
        </div>
      </div>

      {/* Add */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: '11px' }}>Add Domain</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder="e.g. mynewdomain.com"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            style={{ flex: 1 }} />
          <button onClick={handleAdd} disabled={loading} style={{
            background: 'linear-gradient(135deg,#5b73ff,#7c5cfc)', border: 'none',
            borderRadius: '7px', color: '#fff', padding: '8px 16px',
            fontSize: '12px', fontWeight: '700', cursor: 'pointer',
            opacity: loading ? 0.7 : 1, fontFamily: 'inherit', flexShrink: 0,
          }}>Add</button>
        </div>
        <div style={{ fontSize: '11px', color: '#6b7599', marginTop: '7px' }}>
          New domains start as <span style={{ color: '#f59e0b' }}>inactive</span> — ask admin to activate before use.
        </div>
      </div>

      {/* Stats */}
      <div className="grid2">
        <div className="stat"><div className="stat-val" style={{ color: '#22c97a' }}>{active.length}</div><div className="stat-lbl">Active domains</div></div>
        <div className="stat"><div className="stat-val" style={{ color: '#f16b6b' }}>{inactive.length}</div><div className="stat-lbl">Inactive / pending</div></div>
      </div>

      {/* List */}
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">All Domains</div>
          <span className="badge b-gray">{domains.length} total</span>
        </div>
        {domains.length === 0
          ? <div className="empty">No domains yet.</div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {domains.map(d => (
                <div key={d.id} className="dom-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <span className={`dot ${d.status === 'active' ? 'dot-g' : 'dot-r'}`}></span>
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '12.5px' }}>{d.name}</div>
                      <div style={{ fontSize: '11px', color: '#6b7599' }}>
                        added by {(d as any).adder?.role || 'staff'} · {new Date(d.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <span className={`badge ${d.status === 'active' ? 'b-green' : 'b-warn'}`} style={{ fontSize: '10px' }}>
                    {d.status === 'active' ? '● Active' : '○ Inactive'}
                  </span>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  )
}
