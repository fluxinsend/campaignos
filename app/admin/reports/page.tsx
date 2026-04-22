export const dynamic = 'force-dynamic'
// app/admin/reports/page.tsx
import { createClient } from '@/lib/supabase/server'
import { getReports, getActivityLog } from '@/lib/queries'

export default async function ReportsPage() {
  const supabase = createClient()
  const [reports, log] = await Promise.all([getReports(supabase), getActivityLog(supabase, 50)])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '20px', fontWeight: '700', color: '#dde2f5' }}>Reports</div>

      {/* Summary stats */}
      <div className="grid4">
        <div className="stat"><div className="stat-val" style={{ color: '#5b73ff' }}>{reports.length}</div><div className="stat-lbl">Reports saved</div></div>
        <div className="stat"><div className="stat-val" style={{ color: '#22c97a' }}>{(reports as any[]).reduce((s: number, r: any) => s + (r.replies || 0), 0)}</div><div className="stat-lbl">Total replies</div></div>
        <div className="stat"><div className="stat-val" style={{ color: '#22d3ee' }}>{(reports as any[]).reduce((s: number, r: any) => s + (r.interested || 0), 0)}</div><div className="stat-lbl">Interested leads</div></div>
        <div className="stat"><div className="stat-val" style={{ color: '#f59e0b' }}>{log.length}</div><div className="stat-lbl">Activity entries</div></div>
      </div>

      {/* Past Reports */}
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">Saved Daily Reports</div>
        </div>
        {reports.length === 0
          ? <div className="empty">No reports saved yet. Reports are submitted by staff after completing each campaign.</div>
          : <table>
              <thead>
                <tr>
                  <th>Date</th><th>Campaign</th><th>Group</th><th>Replies</th>
                  <th>Bounces</th><th>Interested</th><th>Staff</th><th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {(reports as any[]).map((r: any) => (
                  <tr key={r.id}>
                    <td style={{ color: '#6b7599', fontSize: '11px' }}>{r.report_date}</td>
                    <td style={{ fontWeight: '500' }}>{r.campaign?.group?.name} Campaign</td>
                    <td><span className="badge b-blue">{r.campaign?.group?.name}</span></td>
                    <td style={{ color: '#22c97a' }}>{r.replies}</td>
                    <td style={{ color: '#f16b6b' }}>{r.autoreplies}</td>
                    <td style={{ color: '#22d3ee' }}>{r.interested}</td>
                    <td style={{ color: '#6b7599', fontSize: '11px' }}>{r.submitter?.email?.split('@')[0]}</td>
                    <td style={{ color: '#6b7599', fontSize: '11px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>

      {/* Activity Log */}
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">Full Activity Log</div>
          <span style={{ fontSize: '11px', color: '#6b7599' }}>Last 50 entries</span>
        </div>
        {log.length === 0
          ? <div className="empty">No activity logged yet.</div>
          : <table>
              <thead><tr><th>Time</th><th>Action</th><th>By</th></tr></thead>
              <tbody>
                {(log as any[]).map((entry: any) => (
                  <tr key={entry.id}>
                    <td style={{ color: '#6b7599', fontSize: '11px', whiteSpace: 'nowrap' }}>
                      {new Date(entry.created_at).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </td>
                    <td>{entry.action}</td>
                    <td style={{ color: '#6b7599', fontSize: '11px' }}>
                      {entry.user?.email?.split('@')[0] || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>
    </div>
  )
}
