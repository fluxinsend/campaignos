export const dynamic = 'force-dynamic'
// app/admin/leads/page.tsx
import { createClient } from '@/lib/supabase/server'
import { getLeads } from '@/lib/queries'

export default async function AdminLeadsPage() {
  const supabase = createClient()
  const leads = await getLeads(supabase)

  const total   = leads.length
  const inCrm   = leads.filter((l: any) => l.in_crm).length
  const pending  = leads.filter((l: any) => !l.in_crm).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '20px', fontWeight: '700', color: '#dde2f5' }}>All Leads</div>

      <div className="grid3">
        <div className="stat"><div className="stat-val" style={{ color: '#5b73ff' }}>{total}</div><div className="stat-lbl">Total leads</div></div>
        <div className="stat"><div className="stat-val" style={{ color: '#22c97a' }}>{inCrm}</div><div className="stat-lbl">In SugarCRM</div></div>
        <div className="stat"><div className="stat-val" style={{ color: '#f59e0b' }}>{pending}</div><div className="stat-lbl">Pending CRM</div></div>
      </div>

      <div className="card">
        <div className="card-hdr">
          <div className="card-title">All Leads ({total})</div>
          <span style={{ fontSize: '11px', color: '#6b7599' }}>Read-only admin view · staff manage leads from their dashboard</span>
        </div>
        {leads.length === 0
          ? <div className="empty">No leads yet. Staff add leads from their dashboard.</div>
          : <table>
              <thead>
                <tr>
                  <th>Name</th><th>Email</th><th>Note</th><th>Campaign</th>
                  <th>Added by</th><th>Date</th><th>CRM</th>
                </tr>
              </thead>
              <tbody>
                {(leads as any[]).map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: '500' }}>{l.name || '—'}</td>
                    <td style={{ color: '#818cf8', fontSize: '11px' }}>{l.email || '—'}</td>
                    <td style={{ color: '#6b7599', fontSize: '11px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.note || '—'}</td>
                    <td>
                      <span className="badge b-blue" style={{ fontSize: '10px' }}>
                        {l.campaign?.group?.name || '—'}
                      </span>
                    </td>
                    <td style={{ color: '#6b7599', fontSize: '11px' }}>{l.adder?.email?.split('@')[0] || '—'}</td>
                    <td style={{ color: '#6b7599', fontSize: '11px' }}>{new Date(l.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${l.in_crm ? 'b-green' : 'b-gray'}`} style={{ fontSize: '10px' }}>
                        {l.in_crm ? '✓ In CRM' : 'Pending'}
                      </span>
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
