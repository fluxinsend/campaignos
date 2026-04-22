'use client'
// app/admin/batches/page.tsx
import { useEffect, useMemo, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getBatches, getGroups, addBatchLists, deleteBatch, logActivity } from '@/lib/queries'
import type { Batch, Group } from '@/types'
import toast from 'react-hot-toast'

type DraftList = {
  id: number
  label: string
  count: string
}

type ParsedBatch = {
  date: string
  lists: {
    name: string
    subscriber_count: number
    list_position?: number
  }[]
  total?: number
}

function parseListPosition(label: string) {
  const match = label.match(/#?\s*(\d+)/)
  return match ? Number(match[1]) : undefined
}

function parseCount(value: string) {
  return Number(value.replace(/[^\d]/g, '')) || 0
}

function parseDatedBatchRows(text: string) {
  const groups = new Map<string, ParsedBatch>()

  text.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim()
    if (!trimmed) return

    const parts = trimmed.includes('\t')
      ? trimmed.split('\t').map(part => part.trim())
      : trimmed.split(/\s{2,}/).map(part => part.trim())

    const date = parts.find(part => /^\d{4}-\d{2}-\d{2}$/.test(part))
    if (!date) return

    const dateIndex = parts.indexOf(date)
    const afterDate = parts.slice(dateIndex + 1)
    const countText = [...afterDate].reverse().find(part => /^[\d,]+$/.test(part))
    const name = afterDate.find(part => part && part !== countText)
    const count = countText ? parseCount(countText) : 0

    const batch = groups.get(date) || { date, lists: [] }
    if (name && count) {
      batch.lists.push({
        name,
        subscriber_count: count,
        list_position: parseListPosition(name),
      })
    } else if (!name && count) {
      batch.total = count
    }
    groups.set(date, batch)
  })

  return Array.from(groups.values()).filter(batch => batch.lists.length)
}

function listDisplayName(batchName: string, label: string, total: string) {
  const cleanBatch = batchName.trim()
  const cleanLabel = label.trim()
  if (!cleanLabel) return cleanBatch
  if (cleanLabel.toLowerCase().startsWith(cleanBatch.toLowerCase())) return cleanLabel
  if (/^#/.test(cleanLabel)) return `${cleanBatch} ${cleanLabel}`
  if (/^\d+$/.test(cleanLabel)) return `${cleanBatch} #${cleanLabel}${total ? ` of ${total}` : ''}`
  return `${cleanBatch} ${cleanLabel}`
}

export default function BatchesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [batches, setBatches] = useState<Batch[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(false)

  const [groupId, setGroupId] = useState('')
  const [batchName, setBatchName] = useState('')
  const [listTotal, setListTotal] = useState('')
  const [listLabel, setListLabel] = useState('')
  const [listCount, setListCount] = useState('')
  const [draftLists, setDraftLists] = useState<DraftList[]>([])
  const [pastedRows, setPastedRows] = useState('')

  const load = useCallback(async () => {
    const [b, g] = await Promise.all([getBatches(supabase), getGroups(supabase)])
    setBatches(b as Batch[])
    setGroups(g as Group[])
    if (!groupId && g.length) setGroupId(g[0].id)
  }, [groupId, supabase])

  useEffect(() => { load() }, [load])

  function handleAddListRow() {
    if (!batchName.trim()) { toast.error('Enter a batch name'); return }
    if (!listLabel.trim()) { toast.error('Enter a list name or number'); return }

    setDraftLists(rows => [
      ...rows,
      { id: Date.now(), label: listLabel.trim(), count: listCount.trim() },
    ])
    setListLabel('')
    setListCount('')
  }

  function handleRemoveDraft(id: number) {
    setDraftLists(rows => rows.filter(row => row.id !== id))
  }

  async function handleCreateBatch() {
    if (!batchName.trim()) { toast.error('Enter a batch name'); return }
    if (!groupId) { toast.error('Select a group'); return }
    if (!draftLists.length) { toast.error('Add at least one list row'); return }

    setLoading(true)
    const total = parseInt(listTotal) || draftLists.length
    const lists = draftLists.map(row => ({
      name: listDisplayName(batchName, row.label, String(total)),
      subscriber_count: parseInt(row.count) || 0,
      list_position: parseListPosition(row.label),
    }))

    const { data, error } = await addBatchLists(supabase, {
      group_id: groupId,
      batch_group_name: batchName.trim(),
      list_total: total,
      lists,
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Batch created with ${lists.length} list${lists.length === 1 ? '' : 's'}`)
      await logActivity(supabase, {
        action: `Batch created: "${batchName}" (${lists.length} lists)`,
        entity_type: 'batch',
        entity_id: data?.[0]?.id,
      })
      setBatchName('')
      setListTotal('')
      setListLabel('')
      setListCount('')
      setDraftLists([])
      load()
    }
    setLoading(false)
  }

  async function handleImportPastedBatches() {
    if (!batchName.trim()) { toast.error('Enter a batch name, e.g. DALLAS'); return }
    if (!groupId) { toast.error('Select a group'); return }

    const parsed = parseDatedBatchRows(pastedRows)
    if (!parsed.length) {
      toast.error('Paste rows with date, list name, and count')
      return
    }

    setLoading(true)
    let createdLists = 0
    for (const batch of parsed) {
      const batchGroupName = `${batchName.trim()} ${batch.date}`
      const { error } = await addBatchLists(supabase, {
        group_id: groupId,
        batch_group_name: batchGroupName,
        list_total: batch.lists.length,
        batch_total_count: batch.total,
        lists: batch.lists,
      })
      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }
      createdLists += batch.lists.length
    }

    toast.success(`Imported ${parsed.length} batches with ${createdLists} lists`)
    await logActivity(supabase, {
      action: `Imported "${batchName}" (${parsed.length} batches, ${createdLists} lists)`,
      entity_type: 'batch',
    })
    setPastedRows('')
    setBatchName('')
    setDraftLists([])
    load()
    setLoading(false)
  }

  async function handleDelete(id: string, batchName: string) {
    if (!confirm(`Delete list "${batchName}"?`)) return
    const { error } = await deleteBatch(supabase, id)
    if (error) toast.error(error.message)
    else { toast.success('List removed'); load() }
  }

  const filtered = filter === 'all' ? batches : batches.filter(b => (b.group as any)?.name === filter)
  const groupNames = Array.from(new Set(batches.map(b => (b.group as any)?.name).filter(Boolean)))
  const grouped = filtered.reduce<Record<string, Batch[]>>((acc, batch) => {
    const key = batch.batch_group_name || batch.name
    acc[key] = acc[key] || []
    acc[key].push(batch)
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '18px', fontWeight: '700', color: '#dde2f5' }}>Lists & Batches</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', alignItems: 'start' }}>
        <div className="card">
          <div className="card-title">Add New Batch</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            <div className="field">
              <label className="lbl">Group</label>
              <select value={groupId} onChange={e => setGroupId(e.target.value)}>
                {groups.map(g => <option key={g.id} value={g.id}>{g.emoji} {g.name} - {g.label}</option>)}
              </select>
            </div>

            <div className="field">
              <label className="lbl">Batch name</label>
              <input
                type="text"
                value={batchName}
                onChange={e => setBatchName(e.target.value)}
                placeholder="e.g. Cloudlead 200k"
              />
            </div>

            <div className="field">
              <label className="lbl">Total lists in batch</label>
              <input
                type="number"
                min="1"
                value={listTotal}
                onChange={e => setListTotal(e.target.value)}
                placeholder="e.g. 9"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr .8fr auto', gap: '8px', alignItems: 'end' }}>
              <div className="field">
                <label className="lbl">List row</label>
                <input
                  type="text"
                  value={listLabel}
                  onChange={e => setListLabel(e.target.value)}
                  placeholder="e.g. #6 of 9 or 6"
                  onKeyDown={e => { if (e.key === 'Enter') handleAddListRow() }}
                />
              </div>
              <div className="field">
                <label className="lbl">Contacts</label>
                <input
                  type="number"
                  min="0"
                  value={listCount}
                  onChange={e => setListCount(e.target.value)}
                  placeholder="18000"
                  onKeyDown={e => { if (e.key === 'Enter') handleAddListRow() }}
                />
              </div>
              <button
                onClick={handleAddListRow}
                style={{
                  background: '#171a2e', border: '1px solid #2e3556',
                  borderRadius: '8px', color: '#dde2f5', padding: '8px 12px',
                  fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Add row
              </button>
            </div>

            <div className="field">
              <label className="lbl">Paste dated list rows</label>
              <textarea
                value={pastedRows}
                onChange={e => setPastedRows(e.target.value)}
                rows={7}
                placeholder={'2026-04-15\\tOct 17 2024 Seamless Leads #6 of 6\\t\\t2,908\\n2026-04-15\\tOct 17 2024 Seamless Leads #5 of 6\\t\\t2,909'}
                style={{ minHeight: '126px', resize: 'vertical' }}
              />
              <button
                onClick={handleImportPastedBatches}
                disabled={loading}
                style={{
                  background: '#171a2e', border: '1px solid #2e3556',
                  borderRadius: '8px', color: '#dde2f5', padding: '8px 12px',
                  fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Import Pasted Batches
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {draftLists.length === 0
                ? <div style={{ border: '1px dashed #2e3556', borderRadius: '8px', padding: '14px', color: '#6b7599', fontSize: '12px', textAlign: 'center' }}>
                    Add rows like #6 of 9, #9 of 9, #8 of 9, #7 of 9.
                  </div>
                : draftLists.map(row => (
                    <div key={row.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '8px', background: '#171a2e', border: '1px solid #252a45' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '600' }}>{listDisplayName(batchName, row.label, listTotal)}</div>
                        <div style={{ fontSize: '11px', color: '#6b7599', marginTop: '2px' }}>{(parseInt(row.count) || 0).toLocaleString()} contacts</div>
                      </div>
                      <button onClick={() => handleRemoveDraft(row.id)} style={{ background: 'rgba(241,107,107,.1)', border: '1px solid rgba(241,107,107,.2)', borderRadius: '5px', color: '#f16b6b', padding: '2px 8px', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit' }}>
                        x
                      </button>
                    </div>
                  ))}
            </div>

            <button
              onClick={handleCreateBatch}
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg,#5b73ff,#7c5cfc)', border: 'none',
                borderRadius: '8px', color: '#fff', padding: '9px 16px',
                fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                opacity: loading ? 0.7 : 1, fontFamily: 'inherit',
              }}
            >
              {loading ? 'Creating...' : 'Create Batch Lists'}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-hdr">
            <div className="card-title">List Library ({filtered.length})</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setFilter('all')}
                style={{ padding: '3px 10px', borderRadius: '6px', border: '1px solid',
                  borderColor: filter === 'all' ? '#5b73ff' : '#2e3556',
                  background: filter === 'all' ? 'rgba(91,115,255,.15)' : '#171a2e',
                  color: filter === 'all' ? '#818cf8' : '#6b7599',
                  fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
              >All</button>
              {groupNames.map(g => (
                <button key={g} onClick={() => setFilter(g)}
                  style={{ padding: '3px 10px', borderRadius: '6px', border: '1px solid',
                    borderColor: filter === g ? '#5b73ff' : '#2e3556',
                    background: filter === g ? 'rgba(91,115,255,.15)' : '#171a2e',
                    color: filter === g ? '#818cf8' : '#6b7599',
                    fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
                >{g}</button>
              ))}
            </div>
          </div>

          {filtered.length === 0
            ? <div style={{ textAlign: 'center', padding: '24px', color: '#6b7599', fontSize: '12px' }}>
                No list rows yet. Create a batch on the left.
              </div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(grouped).map(([batchGroupName, rows]) => (
                  <div key={batchGroupName} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#dde2f5', fontSize: '12px', fontWeight: '700' }}>
                      <span>{batchGroupName}</span>
                      <span style={{ color: '#6b7599', fontSize: '11px', fontWeight: '600' }}>
                        {rows.length} list{rows.length === 1 ? '' : 's'} - {(rows[0].batch_total_count || rows.reduce((sum, row) => sum + row.subscriber_count, 0)).toLocaleString()} contacts
                      </span>
                    </div>
                    {rows.map(b => (
                      <div key={b.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '9px 12px', borderRadius: '8px', background: '#171a2e',
                        border: '1px solid #252a45',
                      }}>
                        <div>
                          <div style={{ fontWeight: '500', fontSize: '12.5px' }}>{b.name}</div>
                          <div style={{ fontSize: '11px', color: '#6b7599', marginTop: '2px' }}>
                            <span style={{ background: '#252a45', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', color: '#6b7599', marginRight: '6px' }}>
                              {(b.group as any)?.name}
                            </span>
                            {b.subscriber_count.toLocaleString()} contacts - {b.created_at.split('T')[0]}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ background: 'rgba(34,201,122,.12)', color: '#22c97a', border: '1px solid rgba(34,201,122,.2)', padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: '600' }}>
                            List to send
                          </span>
                          <button onClick={() => handleDelete(b.id, b.name)}
                            style={{ background: 'rgba(241,107,107,.1)', border: '1px solid rgba(241,107,107,.2)', borderRadius: '5px', color: '#f16b6b', padding: '2px 8px', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit' }}>
                            x
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  )
}
