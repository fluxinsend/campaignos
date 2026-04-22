export const dynamic = 'force-dynamic'
// app/admin/page.tsx — Admin Dashboard (Server Component)
import { createClient } from '@/lib/supabase/server'
import { getCampaigns, getDomains, getBatches, getActivityLog, getLeads } from '@/lib/queries'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const [campaigns, domains, batches, log, leads] = await Promise.all([
    getCampaigns(supabase, today),
    getDomains(supabase),
    getBatches(supabase),
    getActivityLog(supabase, 8),
    getLeads(supabase),
  ])

  const activeDomains = domains.filter((d: any) => d.status === 'active').length
  const totalSubs = (campaigns as any[]).reduce((sum: number, c: any) =>
    sum + (c.campaign_batches || []).reduce((s: number, b: any) => s + (b.batch?.subscriber_count || 0), 0), 0)
  const pendingLeads = leads.filter((l: any) => !l.in_crm).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#dde2f5' }}>Dashboard</div>
          <div style={{ fontSize: '12px', color: '#6b7599', marginTop: '2px' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <Link href="/admin/schedule" style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '8px 14px', borderRadius: '8px',
          background: 'linear-gradient(135deg,#5b73ff,#7c5cfc)',
          color: '#fff', textDecoration: 'none', fontSize: '12px', fontWeight: '700',
        }}>+ Schedule Campaign</Link>
      </div>

      {/* Stats */}
      <div className="grid4">
        <div className="stat"><div className="stat-val" style={{ color: '#5b73ff' }}>{campaigns.length}</div><div className="stat-lbl">Campaigns today</div></div>
        <div className="stat"><div className="stat-val" style={{ color: '#22c97a' }}>{totalSubs.toLocaleString()}</div><div className="stat-lbl">Total subscribers</div></div>
        <div className="stat"><div className="stat-val" style={{ color: '#22d3ee' }}>{activeDomains}</div><div className="stat-lbl">Active domains</div></div>
        <div className="stat"><div className="stat-val" style={{ color: '#f59e0b' }}>{pendingLeads}</div><div className="stat-lbl">Leads pending CRM</div></div>
      </div>

      {/* Today's Campaigns */}
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">Today's Campaigns</div>
          <span style={{ fontSize: '11px', color: '#6b7599' }}>{today}</span>
        </div>
        {campaigns.length === 0
          ? <div className="empty">No campaigns scheduled today. <Link href="/admin/schedule" style={{ color: '#5b73ff' }}>Schedule one →</Link></div>
          : <table>
              <thead><tr><th>Group</th><th>Template</th><th>Assigned to</th><th>Batches</th><th>Subscribers</th><th>Status</th></tr></thead>
              <tbody>
                {(campaigns as any[]).map((c: any) => (
                  <tr key={c.id}>
                    <td><span className="badge b-blue">{c.group?.name}</span></td>
                    <td style={{ color: '#a78bfa', fontSize: '11px' }}>{c.template?.name}</td>
                    <td style={{ color: '#6b7599', fontSize: '11px' }}>{c.assignee?.email?.split('@')[0]}</td>
                    <td>{c.campaign_batches?.length || 0}</td>
                    <td>{(c.campaign_batches || []).reduce((s: number, b: any) => s + (b.batch?.subscriber_count || 0), 0).toLocaleString()}</td>
                    <td><span className={`badge ${c.status === 'completed' ? 'b-green' : c.status === 'active' ? 'b-blue' : 'b-gray'}`}>{c.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>

      <div className="grid2">
        {/* Domains */}
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">Domains</div>
            <Link href="/admin/domains" style={{ fontSize: '11px', color: '#5b73ff', textDecoration: 'none' }}>Manage →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {domains.slice(0, 5).map((d: any) => (
              <div key={d.id} className="dom-item" style={{ padding: '7px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`dot ${d.status === 'active' ? 'dot-g' : 'dot-r'}`}></span>
                  <span style={{ fontSize: '12px' }}>{d.name}</span>
                </div>
                <span className={`badge ${d.status === 'active' ? 'b-green' : 'b-red'}`} style={{ fontSize: '10px' }}>{d.status}</span>
              </div>
            ))}
            {domains.length === 0 && <div className="empty">No domains. <Link href="/admin/domains" style={{ color: '#5b73ff' }}>Add one →</Link></div>}
          </div>
        </div>

        {/* Activity Log */}
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">Recent Activity</div>
            <Link href="/admin/reports" style={{ fontSize: '11px', color: '#5b73ff', textDecoration: 'none' }}>Full log →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {log.length === 0
              ? <div className="empty">No activity yet.</div>
              : (log as any[]).map((entry: any) => (
                  <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(37,42,69,.5)', fontSize: '12px' }}>
                    <div style={{ color: '#dde2f5' }}>{entry.action}</div>
                    <div style={{ color: '#6b7599', fontSize: '11px', flexShrink: 0, marginLeft: '10px' }}>
                      {new Date(entry.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
            }
          </div>
        </div>
      </div>

      {/* Batch Library Summary */}
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">Batch Library</div>
          <Link href="/admin/batches" style={{ fontSize: '11px', color: '#5b73ff', textDecoration: 'none' }}>Manage →</Link>
        </div>
        {batches.length === 0
          ? <div className="empty">No batches yet. <Link href="/admin/batches" style={{ color: '#5b73ff' }}>Add your first batch →</Link></div>
          : (() => {
              const groups: Record<string, any[]> = {}
              ;(batches as any[]).forEach((b: any) => { const g = b.group?.name || '?'; groups[g] = groups[g] || []; groups[g].push(b) })
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                  {Object.entries(groups).map(([g, rows]) => (
                    <div key={g} className="dom-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
                      <div style={{ fontWeight: '700', fontSize: '13px' }}>{g}</div>
                      <div style={{ fontSize: '11px', color: '#6b7599' }}>{rows.length} lists · {rows.reduce((s, b) => s + b.subscriber_count, 0).toLocaleString()} contacts</div>
                    </div>
                  ))}
                </div>
              )
            })()
        }
      </div>
    </div>
  )
}
