'use client'
// app/staff/leads/page.tsx
import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getLeads, addLead, toggleLeadCrm, getMyCampaigns, logActivity } from '@/lib/queries'
import type { Lead } from '@/types'
import toast from 'react-hot-toast'

export default function StaffLeadsPage() {
  const supabase = useMemo(() => createClient(), [])
  const today = new Date().toISOString().split('T')[0]
  const [leads, setLeads] = useState<Lead[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [searchQ, setSearchQ] = useState('')
  const [filter, setFilter] = useState('all')
  // Add form
  const [name, setName]     = useState('')
  const [email, setEmail]   = useState('')
  const [note, setNote]     = useState('')
  const [campId, setCampId] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const [l, c] = await Promise.all([getLeads(supabase), getMyCampaigns(supabase, today)])
    setLeads(l as Lead[])
    setCampaigns(c as any[])
    if (!campId && c.length) setCampId(c[0].id)
  }, [supabase, today, campId])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!name.trim() && !email.trim()) { toast.error('Enter a name or email'); return }
    setLoading(true)
    const { error } = await addLead(supabase, { name, email, note, campaign_id: campId || undefined })
    if (error) toast.error(error.message)
    else {
      toast.success('Lead added ✓')
      await logActivity(supabase, { action: `Lead added: ${name || email}`, entity_type: 'lead' })
      setName(''); setEmail(''); setNote('')
      load()
    }
    setLoading(false)
  }

  async function handleToggleCrm(lead: Lead) {
    const next = !lead.in_crm
    const { error } = await toggleLeadCrm(supabase, lead.id, next)
    if (error) toast.error(error.message)
    else {
      toast.success(next ? `${lead.name} added to SugarCRM ✓` : `${lead.name} removed from CRM`)
      if (next) await logActivity(supabase, { action: `Lead added to CRM: ${lead.name}`, entity_type: 'lead', entity_id: lead.id })
      load()
    }
  }

  function exportLeads() {
    const rows = [['Name','Email','Note','Campaign','In CRM','Date'], ...filtered.map((l: any) => [l.name||'', l.email||'', l.note||'', l.campaign?.group?.name||'', l.in_crm?'Yes':'No', l.created_at.split('T')[0]])]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `leads_${today}.csv`; a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported CSV 📥')
  }

  // Filter
  const filtered = leads.filter(l => {
    const q = searchQ.toLowerCase()
    const mQ = !q || (l.name||'').toLowerCase().includes(q) || (l.email||'').toLowerCase().includes(q) || (l.note||'').toLowerCase().includes(q)
    const mF = filter === 'all' || (filter === 'crm' && l.in_crm) || (filter === 'pending' && !l.in_crm) || (l as any).campaign?.id === filter
    return mQ && mF
  })

  // Group by date
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  const yStr = yesterday.toISOString().split('T')[0]
  const groups: Record<string, Lead[]> = {}
  filtered.forEach(l => {
    const d = l.created_at.split('T')[0]
    const k = d === today ? 'today' : d === yStr ? 'yesterday' : d
    groups[k] = groups[k] || []
    groups[k].push(l)
  })
  const groupOrder = Object.keys(groups).sort((a, b) => {
    if (a === 'today') return -1; if (b === 'today') return 1
    if (a === 'yesterday') return -1; if (b === 'yesterday') return 1
    return b.localeCompare(a)
  })

  const totalLeads = leads.length
  const inCrm = leads.filter(l => l.in_crm).length
  const todayCount = leads.filter(l => l.created_at.split('T')[0] === today).length
  const pending = leads.filter(l => !l.in_crm).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '700' }}>Leads</div>
          <div style={{ fontSize: '12px', color: '#6b7599', marginTop: '3px' }}>
            Track replied leads — click the circle to mark as added to SugarCRM
          </div>
        </div>
        <button onClick={exportLeads} style={{
          padding: '7px 13px', borderRadius: '7px', border: '1px solid rgba(34,211,238,.3)',
          background: 'rgba(34,211,238,.06)', color: '#22d3ee', fontSize: '12px',
          fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
        }}>📥 Export CSV</button>
      </div>

      {/* Stats */}
      <div className="grid4">
        <div className="stat"><div className="stat-val" style={{ color: '#5b73ff' }}>{totalLeads}</div><div className="stat-lbl">Total leads</div></div>
        <div className="stat"><div className="stat-val" style={{ color: '#22d3ee' }}>{todayCount}</div><div className="stat-lbl">Added today</div></div>
        <div className="stat"><div className="stat-val" style={{ color: '#22c97a' }}>{inCrm}</div><div className="stat-lbl">In SugarCRM</div></div>
        <div className="stat"><div className="stat-val" style={{ color: '#f59e0b' }}>{pending}</div><div className="stat-lbl">Pending CRM</div></div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '150px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7599', fontSize: '12px', pointerEvents: 'none' }}>🔍</span>
          <input type="text" placeholder="Search name, email, note..." value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            style={{ paddingLeft: '30px' }} />
        </div>
        {['all','crm','pending'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 11px', borderRadius: '7px', border: '1px solid',
            borderColor: filter === f ? '#5b73ff' : '#2e3556',
            background: filter === f ? 'rgba(91,115,255,.15)' : '#171a2e',
            color: filter === f ? '#818cf8' : '#6b7599',
            fontSize: '11.5px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {f === 'all' ? `All ${totalLeads}` : f === 'crm' ? `In CRM ${inCrm}` : `Pending ${pending}`}
          </button>
        ))}
        {campaigns.map((c: any) => (
          <button key={c.id} onClick={() => setFilter(c.id)} style={{
            padding: '5px 11px', borderRadius: '7px', border: '1px solid',
            borderColor: filter === c.id ? '#5b73ff' : '#2e3556',
            background: filter === c.id ? 'rgba(91,115,255,.15)' : '#171a2e',
            color: filter === c.id ? '#818cf8' : '#6b7599',
            fontSize: '11px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit',
          }}>{c.group?.name}</button>
        ))}
      </div>

      {/* Leads grouped by date */}
      {groupOrder.length === 0
        ? <div className="empty" style={{ marginTop: '16px' }}>No leads found. Add one below.</div>
        : groupOrder.map(k => {
            const rows = groups[k]
            const inCrmCount = rows.filter(l => l.in_crm).length
            const allDone = rows.every(l => l.in_crm)
            const label = k === 'today' ? 'Today' : k === 'yesterday' ? 'Yesterday' : new Date(k).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
            return (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {/* Date header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '2px 0' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7599', textTransform: 'uppercase', letterSpacing: '.6px', whiteSpace: 'nowrap' }}>{label}</div>
                  <span style={{
                    fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '5px',
                    background: k === 'today' ? 'rgba(91,115,255,.15)' : allDone ? 'rgba(34,201,122,.12)' : '#252a45',
                    color: k === 'today' ? '#818cf8' : allDone ? '#22c97a' : '#6b7599',
                  }}>
                    {rows.length} lead{rows.length > 1 ? 's' : ''} · {inCrmCount}/{rows.length} in CRM
                  </span>
                  {allDone && <span className="badge b-green" style={{ fontSize: '10px' }}>✓ All in CRM</span>}
                  <div style={{ flex: 1, height: '1px', background: '#252a45' }}></div>
                </div>

                {/* Lead cards */}
                {rows.map(lead => (
                  <div key={lead.id} style={{
                    background: lead.in_crm ? 'rgba(34,201,122,.025)' : '#171a2e',
                    border: `1px solid ${lead.in_crm ? '#22c97a' : '#252a45'}`,
                    borderLeft: `3px solid ${lead.in_crm ? '#22c97a' : '#252a45'}`,
                    borderRadius: '9px', overflow: 'hidden',
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', alignItems: 'center' }}>
                      {/* Name */}
                      <div style={{ padding: '10px 12px', borderRight: '1px solid #252a45' }}>
                        <div style={{ fontSize: '10px', color: '#6b7599', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '3px' }}>Name</div>
                        <div style={{ fontWeight: '600', fontSize: '13px' }}>{lead.name || '—'}</div>
                        <div style={{ marginTop: '4px' }}>
                          <span style={{
                            padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: '600',
                            background: 'rgba(91,115,255,.15)', color: '#818cf8',
                          }}>{(lead as any).campaign?.group?.name || '—'}</span>
                        </div>
                      </div>
                      {/* Email */}
                      <div style={{ padding: '10px 12px', borderRight: '1px solid #252a45' }}>
                        <div style={{ fontSize: '10px', color: '#6b7599', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '3px' }}>Email</div>
                        <div style={{ color: '#818cf8', fontSize: '12px', wordBreak: 'break-all' }}>{lead.email || '—'}</div>
                      </div>
                      {/* Note */}
                      <div style={{ padding: '10px 12px', borderRight: '1px solid #252a45' }}>
                        <div style={{ fontSize: '10px', color: '#6b7599', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '3px' }}>Note</div>
                        <div style={{ fontSize: '12px', color: lead.note ? '#dde2f5' : '#4a5278', fontStyle: lead.note ? 'normal' : 'italic' }}>{lead.note || 'No note'}</div>
                      </div>
                      {/* Date */}
                      <div style={{ padding: '10px 12px', borderRight: '1px solid #252a45' }}>
                        <div style={{ fontSize: '10px', color: '#6b7599', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '3px' }}>Added</div>
                        <div style={{ fontSize: '11px', color: '#6b7599' }}>{new Date(lead.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      {/* CRM toggle */}
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button onClick={() => handleToggleCrm(lead)} style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          padding: '10px 14px', gap: '4px', background: 'transparent', border: 'none',
                          cursor: 'pointer', minWidth: '68px',
                        }}>
                          <div style={{
                            width: '34px', height: '34px', borderRadius: '50%', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', transition: 'all .2s',
                            border: `2px solid ${lead.in_crm ? '#22c97a' : '#2e3556'}`,
                            background: lead.in_crm ? '#22c97a' : '#1e2238',
                            boxShadow: lead.in_crm ? '0 0 10px rgba(34,201,122,.3)' : 'none',
                          }}>
                            {lead.in_crm
                              ? <svg width="14" height="14" fill="none" stroke="#000" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                              : <svg width="14" height="14" fill="none" stroke="#6b7599" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>}
                          </div>
                          <div style={{ fontSize: '10px', fontWeight: '600', color: lead.in_crm ? '#22c97a' : '#6b7599' }}>
                            {lead.in_crm ? 'In CRM' : 'Add CRM'}
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })
      }

      {/* Add Lead Form */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: '11px' }}>+ Add New Lead</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
          <div>
            <div className="lbl" style={{ marginBottom: '4px' }}>Name</div>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <div className="lbl" style={{ marginBottom: '4px' }}>Email</div>
            <input type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <div>
            <div className="lbl" style={{ marginBottom: '4px' }}>Note</div>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Very interested" />
          </div>
          <div>
            <div className="lbl" style={{ marginBottom: '4px' }}>Campaign</div>
            <select value={campId} onChange={e => setCampId(e.target.value)}>
              {campaigns.map((c: any) => <option key={c.id} value={c.id}>{c.group?.name} Campaign</option>)}
              {!campaigns.length && <option value="">No active campaigns</option>}
            </select>
          </div>
          <button onClick={handleAdd} disabled={loading} style={{
            background: 'linear-gradient(135deg,#5b73ff,#7c5cfc)', border: 'none',
            borderRadius: '7px', color: '#fff', padding: '8px 16px',
            fontSize: '12px', fontWeight: '700', cursor: 'pointer',
            opacity: loading ? 0.7 : 1, fontFamily: 'inherit', height: '36px',
          }}>Add Lead</button>
        </div>
      </div>
    </div>
  )
}
