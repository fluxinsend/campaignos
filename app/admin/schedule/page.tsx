'use client'
// app/admin/schedule/page.tsx
import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getGroups, getBatches, getTemplates, getAllProfiles, createCampaign, logActivity } from '@/lib/queries'
import type { Group, Batch, Template, Profile } from '@/types'
import toast from 'react-hot-toast'

export default function SchedulePage() {
  const supabase = useMemo(() => createClient(), [])
  const [groups, setGroups]       = useState<Group[]>([])
  const [batches, setBatches]     = useState<Batch[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [staff, setStaff]         = useState<Profile[]>([])

  const [selGroup, setSelGroup]     = useState<string>('')
  const [selBatches, setSelBatches] = useState<Set<string>>(new Set())
  const [selTemplate, setSelTemplate] = useState<string>('')
  const [assignTo, setAssignTo]     = useState<string>('')
  const [sendDate, setSendDate]     = useState(new Date().toISOString().split('T')[0])
  const [note, setNote]             = useState('')
  const [loading, setLoading]       = useState(false)

  const load = useCallback(async () => {
    const [g, t, s] = await Promise.all([getGroups(supabase), getTemplates(supabase), getAllProfiles(supabase)])
    setGroups(g as Group[])
    setTemplates(t as Template[])
    const staffOnly = (s as Profile[]).filter(p => p.role === 'staff')
    setStaff(staffOnly)
    if (g.length) { setSelGroup(g[0].id); loadBatches(g[0].id) }
    if (t.length) setSelTemplate(t[0].id)
    if (staffOnly.length) setAssignTo(staffOnly[0].id)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function loadBatches(gid: string) {
    const b = await getBatches(supabase, gid)
    setBatches(b as Batch[])
    setSelBatches(new Set())
  }

  function handleGroupClick(gid: string) {
    setSelGroup(gid)
    loadBatches(gid)
  }

  function toggleBatch(id: string) {
    setSelBatches(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSchedule() {
    if (!selGroup)          { toast.error('Select a group');    return }
    if (!selBatches.size)   { toast.error('Select batches');    return }
    if (!selTemplate)       { toast.error('Select a template'); return }
    if (!assignTo)          { toast.error('Assign to a staff member'); return }

    setLoading(true)
    const { data, error } = await createCampaign(supabase, {
      group_id:      selGroup,
      template_id:   selTemplate,
      assigned_to:   assignTo,
      scheduled_for: sendDate,
      note:          note || undefined,
      batch_ids:     Array.from(selBatches),
    })

    if (error) {
      toast.error(error.message)
    } else {
      const grp = groups.find(g => g.id === selGroup)
      const tpl = templates.find(t => t.id === selTemplate)
      const emp = staff.find(s => s.id === assignTo)
      toast.success('Campaign scheduled!')
      await logActivity(supabase, {
        action: `Campaign scheduled: ${grp?.name} · ${selBatches.size} batches · "${tpl?.name}" → ${emp?.email?.split('@')[0]}`,
        entity_type: 'campaign', entity_id: data?.id,
      })
      setSelBatches(new Set()); setNote('')
    }
    setLoading(false)
  }

  // Group batches by batch_group_name for display
  const batchGroups = batches.reduce<Record<string, Batch[]>>((acc, b) => {
    const key = b.batch_group_name || b.name
    acc[key] = acc[key] || []
    acc[key].push(b)
    return acc
  }, {})

  const selectedTpl = templates.find(t => t.id === selTemplate)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '20px', fontWeight: '700', color: '#dde2f5' }}>Schedule Campaign</div>

      <div className="grid2">
        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Step 1 - Group */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '10px' }}>1 · Select Group</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {groups.map(g => (
                <div key={g.id}
                  onClick={() => handleGroupClick(g.id)}
                  style={{
                    background: selGroup === g.id ? 'rgba(91,115,255,.08)' : '#171a2e',
                    border: `1.5px solid ${selGroup === g.id ? '#5b73ff' : '#252a45'}`,
                    borderRadius: '9px', padding: '11px 13px', cursor: 'pointer', transition: 'all .15s',
                  }}>
                  <div style={{ fontWeight: '600', fontSize: '13px' }}>{g.emoji} {g.name} — {g.label}</div>
                  <div style={{ color: '#6b7599', fontSize: '11px', marginTop: '2px' }}>
                    {batches.filter(b => b.group_id === g.id).length} batches in library
                  </div>
                </div>
              ))}
              {groups.length === 0 && <div className="empty">No groups yet. Add batches first.</div>}
            </div>
          </div>

          {/* Step 3 - Template */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '10px' }}>3 · Template</div>
            <div className="field">
              <select value={selTemplate} onChange={e => setSelTemplate(e.target.value)}>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            {selectedTpl && (
              <div className="card-inner" style={{ marginTop: '9px' }}>
                <div style={{ fontSize: '11px', color: '#6b7599', marginBottom: '3px' }}>Subject</div>
                <div style={{ fontWeight: '600', fontSize: '12.5px', marginBottom: '7px' }}>{selectedTpl.subject}</div>
                <div style={{ fontSize: '12px', color: '#6b7599', lineHeight: '1.7' }}
                  dangerouslySetInnerHTML={{ __html: selectedTpl.body.replace(/\{\{(\w+)\}\}/g, '<span style="color:#5b73ff">{{$1}}</span>').replace(/\n/g, '<br>') }} />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Step 2 - Batches */}
          <div className="card">
            <div className="card-hdr">
              <div className="card-title">2 · Select Batches</div>
              <span className="badge b-blue">{selBatches.size} selected</span>
            </div>
            <div className="scroll-box" style={{ maxHeight: '280px' }}>
              {Object.entries(batchGroups).length === 0
                ? <div className="empty">No batches for this group. <a href="/admin/batches" style={{ color: '#5b73ff' }}>Add batches →</a></div>
                : Object.entries(batchGroups).map(([groupName, rows]) => (
                    <div key={groupName} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7599', textTransform: 'uppercase', letterSpacing: '.4px', padding: '2px 0' }}>{groupName}</div>
                      {rows.map(b => {
                        const sel = selBatches.has(b.id)
                        return (
                          <div key={b.id} onClick={() => toggleBatch(b.id)} style={{
                            display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 10px',
                            borderRadius: '7px', background: sel ? 'rgba(91,115,255,.07)' : '#171a2e',
                            border: `1px solid ${sel ? '#5b73ff' : '#252a45'}`, cursor: 'pointer', transition: 'all .15s',
                          }}>
                            <div style={{
                              width: '15px', height: '15px', border: `1.5px solid ${sel ? '#5b73ff' : '#2e3556'}`,
                              borderRadius: '3px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: sel ? '#5b73ff' : 'transparent', transition: 'all .15s',
                            }}>
                              {sel && <svg width="9" height="9" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5"/></svg>}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '12px', fontWeight: '500' }}>{b.name}</div>
                              <div style={{ fontSize: '11px', color: '#6b7599' }}>{b.subscriber_count.toLocaleString()} subscribers</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))
              }
            </div>
          </div>

          {/* Step 4 - Confirm */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '10px' }}>4 · Confirm & Assign</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="field">
                <div className="lbl">Assign to</div>
                <select value={assignTo} onChange={e => setAssignTo(e.target.value)}>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}
                  {staff.length === 0 && <option value="">No staff members yet</option>}
                </select>
              </div>
              <div className="field">
                <div className="lbl">Send date</div>
                <input type="date" value={sendDate} onChange={e => setSendDate(e.target.value)} />
              </div>
              <div className="field">
                <div className="lbl">Note for staff</div>
                <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Start after 10am, check spam first..." />
              </div>
              <button onClick={handleSchedule} disabled={loading} style={{
                background: 'linear-gradient(135deg,#5b73ff,#7c5cfc)', border: 'none',
                borderRadius: '8px', color: '#fff', padding: '10px',
                fontSize: '13px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, fontFamily: 'inherit', marginTop: '4px',
              }}>
                {loading ? 'Scheduling…' : 'Schedule Campaign'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
