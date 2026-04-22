'use client'
// app/staff/page.tsx
import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getMyCampaigns, toggleCampaignTask, markBatchSent, completeCampaign, upsertReport, logActivity } from '@/lib/queries'
import type { CampaignWithFull } from '@/types'
import toast from 'react-hot-toast'

export default function StaffDashboard() {
  const supabase = useMemo(() => createClient(), [])
  const today = new Date().toISOString().split('T')[0]
  const [campaigns, setCampaigns] = useState<CampaignWithFull[]>([])
  const [activeCamp, setActiveCamp] = useState(0)
  const [loading, setLoading] = useState(true)
  // Report state per campaign
  const [reports, setReports] = useState<Record<string, { replies: string; autoreplies: string; interested: string; notes: string; saved: boolean }>>({})

  const load = useCallback(async () => {
    const data = await getMyCampaigns(supabase, today)
    setCampaigns(data as CampaignWithFull[])
    setLoading(false)
  }, [supabase, today])

  useEffect(() => { load() }, [load])

  function getRpt(cid: string) {
    return reports[cid] || { replies: '', autoreplies: '', interested: '', notes: '', saved: false }
  }
  function setRpt(cid: string, field: string, val: string) {
    setReports(prev => ({ ...prev, [cid]: { ...getRpt(cid), [field]: val } }))
  }

  async function handleToggleTask(campaignId: string, taskId: string, current: boolean) {
    const { error } = await toggleCampaignTask(supabase, taskId, !current)
    if (error) { toast.error(error.message); return }
    if (!current) await logActivity(supabase, { action: 'Task completed', entity_type: 'campaign_task', entity_id: taskId })
    load()
  }

  async function handleToggleBatch(cbId: string, current: string) {
    const next = current === 'sent' ? false : true
    const { error } = await markBatchSent(supabase, cbId, next)
    if (error) { toast.error(error.message); return }
    if (next) toast.success('Batch marked sent ✓')
    load()
  }

  async function handleComplete(c: CampaignWithFull) {
    const allSent = c.campaign_batches.every(cb => cb.status === 'sent')
    const allTasks = c.campaign_tasks.every(ct => ct.completed)
    if (!allSent)  { toast.error('Mark all batches as sent first'); return }
    if (!allTasks) { toast.error('Complete all tasks first'); return }
    const { error } = await completeCampaign(supabase, c.id)
    if (error) { toast.error(error.message); return }
    await logActivity(supabase, { action: `Campaign completed: ${c.group?.name}`, entity_type: 'campaign', entity_id: c.id })
    toast.success(`${c.group?.name} Campaign completed! 🎉`)
    load()
    // auto-advance to next
    const next = campaigns.findIndex((x, i) => i > activeCamp && x.status !== 'completed')
    if (next !== -1) { setTimeout(() => setActiveCamp(next), 800) }
    else if (campaigns.every((x, i) => i === activeCamp || x.status === 'completed')) {
      toast.success('All campaigns done! Please submit your reports 📋')
    }
  }

  async function handleSaveReport(c: CampaignWithFull) {
    const rpt = getRpt(c.id)
    const { error } = await upsertReport(supabase, {
      campaign_id: c.id,
      replies: parseInt(rpt.replies) || 0,
      autoreplies: parseInt(rpt.autoreplies) || 0,
      interested: parseInt(rpt.interested) || 0,
      notes: rpt.notes,
    })
    if (error) { toast.error(error.message); return }
    await logActivity(supabase, { action: `Report saved: ${c.group?.name} campaign`, entity_type: 'daily_report' })
    setReports(prev => ({ ...prev, [c.id]: { ...getRpt(c.id), saved: true } }))
    toast.success(`${c.group?.name} report saved 💾`)
  }

  if (loading) return <div className="empty" style={{ marginTop: '60px' }}>Loading your campaigns…</div>

  if (!campaigns.length) return (
    <div style={{ textAlign: 'center', marginTop: '80px', color: '#6b7599' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
      <div style={{ fontSize: '15px', fontWeight: '600', color: '#dde2f5', marginBottom: '6px' }}>No campaigns assigned today</div>
      <div style={{ fontSize: '12px' }}>Ask your admin to schedule and assign a campaign to you.</div>
    </div>
  )

  const allDone = campaigns.every(c => c.status === 'completed')
  const showReport = allDone
  const c = campaigns[activeCamp] || campaigns[0]

  const tasksDone = c.campaign_tasks.filter(t => t.completed).length
  const totalTasks = c.campaign_tasks.length
  const sentBatches = c.campaign_batches.filter(b => b.status === 'sent').length
  const totalBatches = c.campaign_batches.length
  const totalSubs = c.campaign_batches.reduce((s, b) => s + ((b.batch as any)?.subscriber_count || 0), 0)
  const allSent = sentBatches === totalBatches
  const allTasks = tasksDone === totalTasks
  const canComplete = allSent && allTasks && c.status !== 'completed'
  const pct = totalTasks ? Math.round(tasksDone / totalTasks * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Campaign tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #252a45', gap: '0', overflowX: 'auto', marginBottom: '-4px' }}>
        {campaigns.map((camp, i) => (
          <div key={camp.id}
            onClick={() => setActiveCamp(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: '500',
              color: camp.status === 'completed' ? '#22c97a' : activeCamp === i ? '#818cf8' : '#6b7599',
              borderBottom: `2px solid ${camp.status === 'completed' ? '#22c97a' : activeCamp === i ? '#5b73ff' : 'transparent'}`,
              whiteSpace: 'nowrap', transition: 'all .15s',
            }}>
            <div style={{
              width: '15px', height: '15px', borderRadius: '50%',
              border: `1.5px solid ${camp.status === 'completed' ? '#22c97a' : '#4a5278'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px',
              background: camp.status === 'completed' ? '#22c97a' : 'transparent',
              color: camp.status === 'completed' ? '#000' : '#6b7599', fontWeight: '700',
            }}>{camp.status === 'completed' ? '✓' : i + 1}</div>
            {camp.group?.name} Campaign
            {camp.status === 'completed' && <span className="badge b-green" style={{ fontSize: '10px' }}>Done</span>}
          </div>
        ))}
        {showReport && (
          <div onClick={() => setActiveCamp(99)}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: '500',
              color: activeCamp === 99 ? '#f59e0b' : '#6b7599',
              borderBottom: `2px solid ${activeCamp === 99 ? '#f59e0b' : 'transparent'}`,
              marginLeft: '8px', borderLeft: '1px solid #252a45', paddingLeft: '16px',
              whiteSpace: 'nowrap',
            }}>
            📋 Daily Report
          </div>
        )}
      </div>

      {/* REPORT VIEW */}
      {activeCamp === 99 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '17px', fontWeight: '700' }}>
            Daily Report — {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
          {campaigns.map((camp, ci) => {
            const rpt = getRpt(camp.id)
            const campLeads: any[] = [] // fetched separately in leads page
            const savedRpt = (camp.daily_reports as any[])?.[0]
            return (
              <div key={camp.id} style={{ background: '#111420', border: '1px solid #252a45', borderRadius: '11px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', background: 'linear-gradient(90deg,rgba(91,115,255,.1),transparent)', borderBottom: '1px solid #252a45', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '700' }}>{camp.group?.name}</span>
                    <span className="badge b-purple">{camp.template?.name}</span>
                    <span className={`badge ${camp.status === 'completed' ? 'b-green' : 'b-warn'}`}>{camp.status}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#6b7599' }}>{today}</span>
                </div>
                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="grid3">
                    <div className="stat"><div className="stat-val" style={{ color: '#5b73ff' }}>{camp.campaign_batches.reduce((s, b) => s + ((b.batch as any)?.subscriber_count || 0), 0).toLocaleString()}</div><div className="stat-lbl">Subscribers</div></div>
                    <div className="stat"><div className="stat-val" style={{ color: '#22c97a' }}>{camp.campaign_batches.filter(b => b.status === 'sent').length}/{camp.campaign_batches.length}</div><div className="stat-lbl">Batches sent</div></div>
                    <div className="stat"><div className="stat-val" style={{ color: '#22d3ee' }}>{camp.campaign_tasks.filter(t => t.completed).length}/{camp.campaign_tasks.length}</div><div className="stat-lbl">Tasks done</div></div>
                  </div>
                  {/* Tasks recap */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#6b7599', marginBottom: '6px' }}>Tasks</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {camp.campaign_tasks.map(ct => (
                        <span key={ct.id} style={{
                          padding: '3px 8px', borderRadius: '5px', fontSize: '10px', fontWeight: '600',
                          background: ct.completed ? 'rgba(34,201,122,.12)' : 'rgba(241,107,107,.1)',
                          color: ct.completed ? '#22c97a' : '#f16b6b',
                          border: `1px solid ${ct.completed ? 'rgba(34,201,122,.2)' : 'rgba(241,107,107,.15)'}`,
                        }}>
                          {ct.completed ? '✓' : '✗'} {(ct.task_definition as any)?.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ height: '1px', background: '#252a45' }}></div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#6b7599', textTransform: 'uppercase', letterSpacing: '.5px' }}>Campaign Data</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div className="field"><div className="lbl">Replies</div>
                      <input type="number" placeholder="0" value={savedRpt?.replies ?? rpt.replies}
                        onChange={e => setRpt(camp.id, 'replies', e.target.value)} disabled={rpt.saved || !!savedRpt} />
                    </div>
                    <div className="field"><div className="lbl">Auto-replies / Bounces</div>
                      <input type="number" placeholder="0" value={savedRpt?.autoreplies ?? rpt.autoreplies}
                        onChange={e => setRpt(camp.id, 'autoreplies', e.target.value)} disabled={rpt.saved || !!savedRpt} />
                    </div>
                    <div className="field"><div className="lbl">Interested leads</div>
                      <input type="number" placeholder="0" value={savedRpt?.interested ?? rpt.interested}
                        onChange={e => setRpt(camp.id, 'interested', e.target.value)} disabled={rpt.saved || !!savedRpt} />
                    </div>
                  </div>
                  <div className="field"><div className="lbl">Notes / Observations</div>
                    <textarea rows={2} placeholder="e.g. High bounce rate on batch #7..." value={savedRpt?.notes ?? rpt.notes}
                      onChange={e => setRpt(camp.id, 'notes', e.target.value)} disabled={rpt.saved || !!savedRpt} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '11px', color: '#6b7599' }}>
                      {(rpt.saved || savedRpt) ? `✓ Saved — ${today}` : 'Fill in data above then save.'}
                    </div>
                    <button onClick={() => handleSaveReport(camp)}
                      disabled={rpt.saved || !!savedRpt}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        padding: '7px 14px', borderRadius: '7px', border: 'none',
                        fontFamily: 'inherit', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                        background: (rpt.saved || savedRpt) ? 'rgba(34,201,122,.15)' : 'linear-gradient(135deg,#5b73ff,#7c5cfc)',
                        color: (rpt.saved || savedRpt) ? '#22c97a' : '#fff',
                      }}>
                      {(rpt.saved || savedRpt) ? '✓ Saved' : `💾 Save ${camp.group?.name} Report`}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* CAMPAIGN VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg,rgba(91,115,255,.18),rgba(124,92,252,.1))', border: '1px solid rgba(91,115,255,.22)', borderRadius: '11px', padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#6b7599' }}>Active campaign</div>
                <div style={{ fontSize: '17px', fontWeight: '700', marginTop: '2px' }}>{c.group?.name} Campaign</div>
                <div style={{ display: 'flex', gap: '5px', marginTop: '7px', flexWrap: 'wrap' }}>
                  <span className="badge b-blue">Group: {c.group?.name}</span>
                  <span className="badge b-purple">{c.template?.name}</span>
                  <span className="badge b-gray">{today}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '11px', color: '#6b7599' }}>Tasks</div>
                <div style={{ fontSize: '24px', fontWeight: '700' }}>{tasksDone}/{totalTasks}</div>
                <div className="prog-bar" style={{ width: '90px', marginTop: '4px' }}>
                  <div className="prog-fill" style={{ width: pct + '%' }}></div>
                </div>
              </div>
            </div>
            {c.note && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(91,115,255,.2)', fontSize: '11.5px' }}>
                <span style={{ color: '#6b7599' }}>Note: </span>{c.note}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid4">
            <div className="stat"><div className="stat-val" style={{ color: '#5b73ff' }}>{totalBatches}</div><div className="stat-lbl">Batches total</div></div>
            <div className="stat"><div className="stat-val" style={{ color: '#22c97a' }}>{totalSubs.toLocaleString()}</div><div className="stat-lbl">Subscribers</div></div>
            <div className="stat"><div className="stat-val" style={{ color: allSent ? '#22c97a' : '#f59e0b' }}>{sentBatches}/{totalBatches}</div><div className="stat-lbl">Batches sent</div></div>
            <div className="stat"><div className="stat-val" style={{ color: '#22d3ee' }}>{tasksDone}/{totalTasks}</div><div className="stat-lbl">Tasks done</div></div>
          </div>

          {/* Tasks horizontal */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '11px' }}>Daily Tasks</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(c.campaign_tasks.length, 1)},1fr)`, gap: '8px' }}>
              {c.campaign_tasks
                .sort((a, b) => ((a.task_definition as any)?.sort_order || 0) - ((b.task_definition as any)?.sort_order || 0))
                .map(ct => (
                  <div key={ct.id}
                    onClick={() => handleToggleTask(c.id, ct.id, ct.completed)}
                    style={{
                      background: ct.completed ? 'rgba(34,201,122,.06)' : '#171a2e',
                      border: `1.5px solid ${ct.completed ? '#22c97a' : '#252a45'}`,
                      borderRadius: '9px', padding: '10px 8px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: '6px', textAlign: 'center', transition: 'all .18s',
                    }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      border: `2px solid ${ct.completed ? '#22c97a' : '#2e3556'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: ct.completed ? '#22c97a' : 'transparent', transition: 'all .18s',
                    }}>
                      {ct.completed && <svg width="11" height="11" fill="none" stroke="#000" strokeWidth="2.5" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5"/></svg>}
                    </div>
                    <div style={{ fontSize: '10.5px', color: ct.completed ? '#22c97a' : '#6b7599', lineHeight: '1.4' }}>
                      {(ct.task_definition as any)?.label}
                    </div>
                    <div style={{
                      fontSize: '10px', fontWeight: '600', padding: '2px 5px', borderRadius: '4px', marginTop: 'auto',
                      background: ct.completed ? 'rgba(34,201,122,.15)' : 'rgba(91,115,255,.15)',
                      color: ct.completed ? '#22c97a' : '#818cf8',
                    }}>
                      {(ct.task_definition as any)?.tag}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Template (left) + Batches (right) */}
          <div className="grid2">
            <div className="card">
              <div className="card-title" style={{ marginBottom: '11px' }}>Template</div>
              <div style={{ fontSize: '11px', color: '#6b7599', marginBottom: '3px' }}>Subject</div>
              <div style={{ fontWeight: '600', fontSize: '12.5px', marginBottom: '10px' }}>{c.template?.subject}</div>
              <div style={{ background: '#171a2e', borderRadius: '7px', padding: '11px', fontSize: '12px', lineHeight: '1.9', border: '1px solid #252a45' }}
                dangerouslySetInnerHTML={{ __html: (c.template?.body || '').replace(/\{\{(\w+)\}\}/g, '<span style="color:#5b73ff">{{$1}}</span>').replace(/\n/g, '<br>') }} />
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '11px' }}>
                <div className="card-title">{c.group?.name} Batches</div>
                {allSent
                  ? <span className="badge b-green">All sent ✓</span>
                  : <span style={{ fontSize: '10px', color: '#4a5278' }}>click row to toggle</span>}
              </div>
              <table>
                <thead><tr><th>Batch</th><th>Subscribers</th><th>Status</th></tr></thead>
                <tbody>
                  {c.campaign_batches.map(cb => (
                    <tr key={cb.id}
                      onClick={() => handleToggleBatch(cb.id, cb.status)}
                      style={{ cursor: 'pointer' }}>
                      <td style={{ fontWeight: '500', fontSize: '12px' }}>{(cb.batch as any)?.name}</td>
                      <td style={{ color: '#6b7599' }}>{((cb.batch as any)?.subscriber_count || 0).toLocaleString()}</td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: '600',
                          background: cb.status === 'sent' ? 'rgba(34,201,122,.15)' : 'rgba(91,115,255,.12)',
                          color: cb.status === 'sent' ? '#22c97a' : '#818cf8',
                          border: `1px solid ${cb.status === 'sent' ? 'rgba(34,201,122,.2)' : 'rgba(91,115,255,.3)'}`,
                        }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: cb.status === 'sent' ? '#22c97a' : '#5b73ff', display: 'inline-block' }}></span>
                          {cb.status === 'sent' ? 'Sent' : 'Scheduled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Hint */}
              {allSent && !allTasks && (
                <div style={{ marginTop: '10px', padding: '8px 10px', borderRadius: '7px', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', fontSize: '11px', color: '#f59e0b' }}>
                  ✓ All batches sent — complete {totalTasks - tasksDone} task{totalTasks - tasksDone > 1 ? 's' : ''} to unlock.
                </div>
              )}
              {allTasks && !allSent && (
                <div style={{ marginTop: '10px', padding: '8px 10px', borderRadius: '7px', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', fontSize: '11px', color: '#f59e0b' }}>
                  ✓ All tasks done — mark {totalBatches - sentBatches} batch{totalBatches - sentBatches > 1 ? 'es' : ''} as sent to unlock.
                </div>
              )}
              {canComplete && (
                <div style={{ marginTop: '10px', padding: '8px 10px', borderRadius: '7px', background: 'rgba(34,201,122,.08)', border: '1px solid rgba(34,201,122,.2)', fontSize: '11px', color: '#22c97a' }}>
                  🎯 Everything done — hit the button below!
                </div>
              )}
            </div>
          </div>

          {/* Complete button */}
          <button
            onClick={() => canComplete && handleComplete(c)}
            style={{
              width: '100%', padding: '13px', borderRadius: '10px', border: 'none',
              fontSize: '13px', fontWeight: '700', fontFamily: 'inherit',
              cursor: canComplete ? 'pointer' : 'not-allowed', transition: 'all .2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: c.status === 'completed'
                ? 'rgba(34,201,122,.12)'
                : canComplete
                  ? 'linear-gradient(135deg,#5b73ff,#7c5cfc)'
                  : '#1e2238',
              color: c.status === 'completed' ? '#22c97a' : canComplete ? '#fff' : '#4a5278',
              ...(canComplete ? { boxShadow: '0 4px 16px rgba(91,115,255,.25)' } : {}),
            }}>
            {c.status === 'completed'
              ? `✓ ${c.group?.name} Campaign Completed`
              : canComplete
                ? `🎯 Complete ${c.group?.name} Campaign`
                : `🔒 ${(() => {
                    const p: string[] = []
                    if (totalTasks - tasksDone > 0) p.push(`${totalTasks - tasksDone} task${totalTasks - tasksDone > 1 ? 's' : ''} left`)
                    if (totalBatches - sentBatches > 0) p.push(`${totalBatches - sentBatches} batch${totalBatches - sentBatches > 1 ? 'es' : ''} not sent`)
                    return p.join(' · ') || 'Complete tasks & send all batches'
                  })()}`
            }
          </button>
        </div>
      )}
    </div>
  )
}
