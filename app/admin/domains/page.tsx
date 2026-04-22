'use client'
// app/admin/domains/page.tsx
import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getDomains, addDomain, toggleDomainStatus, deleteDomain, logActivity } from '@/lib/queries'
import type { Domain } from '@/types'
import toast from 'react-hot-toast'

export default function DomainsPage() {
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
      toast.success('Domain added')
      await logActivity(supabase, { action: `Domain added: ${input.trim()}`, entity_type: 'domain' })
      setInput('')
      load()
    }
    setLoading(false)
  }

  async function handleToggle(d: Domain) {
    const next = d.status === 'active' ? 'inactive' : 'active'
    const { error } = await toggleDomainStatus(supabase, d.id, next)
    if (error) toast.error(error.message)
    else {
      toast.success(`${d.name} → ${next}`)
      await logActivity(supabase, { action: `Domain ${next}: ${d.name}`, entity_type: 'domain', entity_id: d.id })
      load()
    }
  }

  async function handleDelete(d: Domain) {
    if (!confirm(`Remove ${d.name}?`)) return
    const { error } = await deleteDomain(supabase, d.id)
    if (error) toast.error(error.message)
    else { toast.success('Domain removed'); load() }
  }

  const active   = domains.filter(d => d.status === 'active')
  const inactive = domains.filter(d => d.status === 'inactive')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '20px', fontWeight: '700', color: '#dde2f5' }}>Domains</div>

      <div className="grid2">
        {/* Add */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: '11px' }}>Add Domain</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="field"><div className="lbl">Domain name</div>
              <input type="text" value={input} onChange={e => setInput(e.target.value)}
                placeholder="e.g. sendgrid1.co" onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            </div>
            <div style={{ fontSize: '11px', color: '#6b7599' }}>
              Both admin and staff can add domains. All domains are shared across the team.
            </div>
            <button onClick={handleAdd} disabled={loading} style={{
              background: 'linear-gradient(135deg,#5b73ff,#7c5cfc)', border: 'none',
              borderRadius: '8px', color: '#fff', padding: '9px',
              fontSize: '12px', fontWeight: '700', cursor: 'pointer',
              opacity: loading ? 0.7 : 1, fontFamily: 'inherit',
            }}>Add Domain</button>
          </div>
        </div>

        {/* List */}
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">All Domains</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span className="badge b-green">{active.length} active</span>
              <span className="badge b-red">{inactive.length} inactive</span>
            </div>
          </div>
          {domains.length === 0
            ? <div className="empty">No domains yet. Add one on the left.</div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {domains.map(d => (
                  <div key={d.id} className="dom-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                      <span className={`dot ${d.status === 'active' ? 'dot-g' : 'dot-r'}`}></span>
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '12.5px' }}>{d.name}</div>
                        <div style={{ fontSize: '11px', color: '#6b7599' }}>
                          added by {(d as any).adder?.role || 'admin'} · {new Date(d.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={() => handleToggle(d)} style={{
                        padding: '4px 10px', borderRadius: '6px', border: '1px solid',
                        borderColor: d.status === 'active' ? 'rgba(241,107,107,.3)' : 'rgba(34,201,122,.3)',
                        background: d.status === 'active' ? 'rgba(241,107,107,.1)' : 'rgba(34,201,122,.1)',
                        color: d.status === 'active' ? '#f16b6b' : '#22c97a',
                        fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                      }}>{d.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                      <button onClick={() => handleDelete(d)} style={{
                        padding: '4px 8px', borderRadius: '6px',
                        background: 'rgba(241,107,107,.1)', border: '1px solid rgba(241,107,107,.2)',
                        color: '#f16b6b', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
                      }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  )
}
