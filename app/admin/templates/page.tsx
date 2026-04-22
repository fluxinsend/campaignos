'use client'
// app/admin/templates/page.tsx
import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getTemplates, upsertTemplate } from '@/lib/queries'
import type { Template } from '@/types'
import toast from 'react-hot-toast'

export default function TemplatesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [templates, setTemplates] = useState<Template[]>([])
  const [editing, setEditing] = useState<Partial<Template> | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const t = await getTemplates(supabase)
    setTemplates(t as Template[])
  }, [supabase])

  useEffect(() => { load() }, [load])

  function startNew() {
    setEditing({ name: '', subject: '', body: '' })
  }

  function startEdit(t: Template) {
    setEditing({ ...t })
  }

  async function handleSave() {
    if (!editing?.name?.trim()) { toast.error('Enter a template name'); return }
    if (!editing?.subject?.trim()) { toast.error('Enter a subject'); return }
    if (!editing?.body?.trim()) { toast.error('Enter a body'); return }
    setLoading(true)
    const { error } = await upsertTemplate(supabase, {
      id: (editing as any).id,
      name: editing.name!,
      subject: editing.subject!,
      body: editing.body!,
    })
    if (error) toast.error(error.message)
    else { toast.success('Template saved ✓'); setEditing(null); load() }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '20px', fontWeight: '700', color: '#dde2f5' }}>Email Templates</div>
        <button onClick={startNew} style={{
          background: 'linear-gradient(135deg,#5b73ff,#7c5cfc)', border: 'none',
          borderRadius: '8px', color: '#fff', padding: '8px 14px',
          fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
        }}>+ New Template</button>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: '12px' }}>
            {(editing as any).id ? 'Edit Template' : 'New Template'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="field"><div className="lbl">Template name</div>
              <input type="text" value={editing.name || ''} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} placeholder="e.g. NY Special Campaign" />
            </div>
            <div className="field"><div className="lbl">Subject line</div>
              <input type="text" value={editing.subject || ''} onChange={e => setEditing(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Exclusive Opportunity for {{company}}" />
            </div>
            <div className="field">
              <div className="lbl">Body</div>
              <div style={{ fontSize: '11px', color: '#6b7599', marginBottom: '4px' }}>
                Use <span style={{ color: '#5b73ff', fontFamily: 'monospace' }}>{'{{name}}'}</span>, <span style={{ color: '#5b73ff', fontFamily: 'monospace' }}>{'{{company}}'}</span>, <span style={{ color: '#5b73ff', fontFamily: 'monospace' }}>{'{{industry}}'}</span> for merge fields
              </div>
              <textarea rows={8} value={editing.body || ''} onChange={e => setEditing(p => ({ ...p, body: e.target.value }))}
                placeholder={'Hi {{name}},\n\nWe noticed your company {{company}}...'} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSave} disabled={loading} style={{
                background: 'linear-gradient(135deg,#5b73ff,#7c5cfc)', border: 'none',
                borderRadius: '7px', color: '#fff', padding: '8px 16px',
                fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                opacity: loading ? 0.7 : 1, fontFamily: 'inherit',
              }}>{loading ? 'Saving…' : 'Save Template'}</button>
              <button onClick={() => setEditing(null)} style={{
                background: '#171a2e', border: '1px solid #2e3556', borderRadius: '7px',
                color: '#6b7599', padding: '8px 16px', fontSize: '12px', fontWeight: '600',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Template list */}
      {templates.length === 0 && !editing
        ? <div className="empty">No templates yet. Create one above.</div>
        : templates.map(t => (
            <div key={t.id} className="card">
              <div className="card-hdr">
                <div style={{ fontWeight: '600', fontSize: '14px' }}>{t.name}</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => startEdit(t)} style={{
                    padding: '4px 11px', borderRadius: '6px', border: '1px solid #2e3556',
                    background: '#171a2e', color: '#6b7599', fontSize: '11px',
                    fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                  }}>Edit</button>
                  <button onClick={() => setEditing({ name: t.name + ' (copy)', subject: t.subject, body: t.body })} style={{
                    padding: '4px 11px', borderRadius: '6px', border: '1px solid #2e3556',
                    background: '#171a2e', color: '#6b7599', fontSize: '11px',
                    fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                  }}>Duplicate</button>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#6b7599', marginBottom: '4px' }}>Subject</div>
              <div style={{ fontWeight: '500', fontSize: '12.5px', marginBottom: '10px' }}>{t.subject}</div>
              <div style={{ background: '#171a2e', borderRadius: '7px', padding: '11px', fontSize: '12px', lineHeight: '1.9', border: '1px solid #252a45' }}
                dangerouslySetInnerHTML={{ __html: t.body.replace(/\{\{(\w+)\}\}/g, '<span style="color:#5b73ff">{{$1}}</span>').replace(/\n/g, '<br>') }} />
            </div>
          ))
      }
    </div>
  )
}
