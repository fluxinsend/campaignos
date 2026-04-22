// lib/queries.ts — All Supabase data queries
import type { SupabaseClient } from '@supabase/supabase-js'

export async function getMyProfile(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return data
}

export async function getAllProfiles(supabase: SupabaseClient) {
  const { data } = await supabase.from('profiles').select('*').order('full_name')
  return data ?? []
}

export async function getGroups(supabase: SupabaseClient) {
  const { data } = await supabase.from('groups').select('*').order('name')
  return data ?? []
}

export async function createGroup(supabase: SupabaseClient, name: string, label: string, emoji: string) {
  const { data, error } = await supabase
    .from('groups').insert({ name: name.toUpperCase(), label, emoji }).select().single()
  return { data, error }
}

export async function getBatches(supabase: SupabaseClient, groupId?: string) {
  let query = supabase
    .from('batches')
    .select('*, group:groups(id,name,label,emoji)')
    .order('created_at', { ascending: false })
  if (groupId) query = query.eq('group_id', groupId)
  const { data } = await query
  return data ?? []
}

export async function addBatch(supabase: SupabaseClient, payload: {
  group_id: string; name: string; subscriber_count: number;
  batch_group_name?: string; list_position?: number; list_total?: number;
  batch_total_count?: number; csv_url?: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('batches').insert({ ...payload, uploaded_by: user?.id }).select().single()
  return { data, error }
}

export async function addBatchLists(supabase: SupabaseClient, payload: {
  group_id: string; batch_group_name: string; list_total: number;
  batch_total_count?: number;
  lists: { name: string; subscriber_count: number; list_position?: number }[]
}) {
  const { data: { user } } = await supabase.auth.getUser()
  const { group_id, batch_group_name, list_total, batch_total_count, lists } = payload
  const rows = lists.map(l => ({
    group_id, name: l.name, subscriber_count: l.subscriber_count,
    batch_group_name, list_position: l.list_position ?? null,
    list_total, batch_total_count: batch_total_count ?? null, uploaded_by: user?.id,
  }))
  const { data, error } = await supabase.from('batches').insert(rows).select()
  return { data, error }
}

export async function deleteBatch(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('batches').delete().eq('id', id)
  return { error }
}

export async function uploadBatchCsv(supabase: SupabaseClient, file: File, batchName: string) {
  const path = `batches/${Date.now()}_${batchName.replace(/\s+/g, '_')}.csv`
  const { data, error } = await supabase.storage
    .from('batch-csvs').upload(path, file, { contentType: 'text/csv', upsert: false })
  return { path: data?.path, error }
}

export async function getTemplates(supabase: SupabaseClient) {
  const { data } = await supabase.from('templates').select('*').order('created_at', { ascending: false })
  return data ?? []
}

export async function upsertTemplate(supabase: SupabaseClient, payload: {
  id?: string; name: string; subject: string; body: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('templates')
    .upsert({ ...payload, created_by: user?.id, updated_at: new Date().toISOString() })
    .select().single()
  return { data, error }
}

export async function getCampaigns(supabase: SupabaseClient, date?: string) {
  let query = supabase
    .from('campaigns')
    .select(`*, group:groups(*), template:templates(*), assignee:profiles!assigned_to(*),
      campaign_batches(*, batch:batches(*)),
      campaign_tasks(*, task_definition:task_definitions(*)),
      daily_reports(*)`)
    .order('created_at', { ascending: false })
  if (date) query = query.eq('scheduled_for', date)
  const { data } = await query
  return data ?? []
}

export async function getMyCampaigns(supabase: SupabaseClient, date: string) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data } = await supabase
    .from('campaigns')
    .select(`*, group:groups(*), template:templates(*),
      campaign_batches(*, batch:batches(*)),
      campaign_tasks(*, task_definition:task_definitions(*)),
      daily_reports(*)`)
    .eq('assigned_to', user?.id)
    .eq('scheduled_for', date)
    .order('created_at')
  return data ?? []
}

export async function createCampaign(supabase: SupabaseClient, payload: {
  group_id: string; template_id: string; assigned_to: string;
  scheduled_for: string; note?: string; batch_ids: string[]
}) {
  const { data: { user } } = await supabase.auth.getUser()
  const { batch_ids, ...rest } = payload
  const { data: campaign, error } = await supabase
    .from('campaigns').insert({ ...rest, created_by: user?.id }).select().single()
  if (error || !campaign) return { data: null, error }
  await supabase.from('campaign_batches').insert(
    batch_ids.map(bid => ({ campaign_id: campaign.id, batch_id: bid }))
  )
  const { data: taskDefs } = await supabase
    .from('task_definitions').select('id').eq('is_active', true)
  if (taskDefs) {
    await supabase.from('campaign_tasks').insert(
      taskDefs.map((t: any) => ({ campaign_id: campaign.id, task_def_id: t.id }))
    )
  }
  return { data: campaign, error: null }
}

export async function completeCampaign(supabase: SupabaseClient, campaignId: string) {
  const { error } = await supabase
    .from('campaigns').update({ status: 'completed' }).eq('id', campaignId)
  return { error }
}

export async function markBatchSent(supabase: SupabaseClient, campaignBatchId: string, sent: boolean) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('campaign_batches').update({
    status: sent ? 'sent' : 'scheduled',
    sent_at: sent ? new Date().toISOString() : null,
    sent_by: sent ? user?.id : null,
  }).eq('id', campaignBatchId)
  return { error }
}

export async function toggleCampaignTask(supabase: SupabaseClient, taskId: string, completed: boolean) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('campaign_tasks').update({
    completed,
    completed_by: completed ? user?.id : null,
    completed_at: completed ? new Date().toISOString() : null,
  }).eq('id', taskId)
  return { error }
}

export async function getDomains(supabase: SupabaseClient) {
  const { data } = await supabase
    .from('domains')
    .select('*, adder:profiles!added_by(full_name,email,role)')
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function addDomain(supabase: SupabaseClient, name: string, assignedTo?: string) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('domains').insert({ name, added_by: user?.id, assigned_to: assignedTo || null }).select().single()
  return { data, error }
}

export async function toggleDomainStatus(supabase: SupabaseClient, id: string, status: 'active' | 'inactive') {
  const { error } = await supabase.from('domains').update({ status }).eq('id', id)
  return { error }
}

export async function deleteDomain(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('domains').delete().eq('id', id)
  return { error }
}

export async function getLeads(supabase: SupabaseClient, campaignId?: string) {
  let query = supabase
    .from('leads')
    .select('*, campaign:campaigns(id, group:groups(name)), adder:profiles!added_by(full_name,email)')
    .order('created_at', { ascending: false })
  if (campaignId) query = query.eq('campaign_id', campaignId)
  const { data } = await query
  return data ?? []
}

export async function addLead(supabase: SupabaseClient, payload: {
  name?: string; email?: string; note?: string; campaign_id?: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('leads').insert({ ...payload, added_by: user?.id }).select().single()
  return { data, error }
}

export async function toggleLeadCrm(supabase: SupabaseClient, id: string, inCrm: boolean) {
  const { error } = await supabase.from('leads').update({
    in_crm: inCrm,
    crm_added_at: inCrm ? new Date().toISOString() : null,
  }).eq('id', id)
  return { error }
}

export async function upsertReport(supabase: SupabaseClient, payload: {
  campaign_id: string; replies: number; autoreplies: number; interested: number; notes: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('daily_reports')
    .upsert({
      ...payload, submitted_by: user?.id,
      report_date: today, saved_at: new Date().toISOString(),
    }, { onConflict: 'campaign_id,report_date' })
    .select().single()
  return { data, error }
}

export async function getReports(supabase: SupabaseClient, startDate?: string, endDate?: string) {
  let query = supabase
    .from('daily_reports')
    .select('*, campaign:campaigns(*, group:groups(*)), submitter:profiles!submitted_by(*)')
    .order('report_date', { ascending: false })
  if (startDate) query = query.gte('report_date', startDate)
  if (endDate)   query = query.lte('report_date', endDate)
  const { data } = await query
  return data ?? []
}

export async function logActivity(supabase: SupabaseClient, payload: {
  action: string; entity_type?: string; entity_id?: string; metadata?: Record<string, unknown>
}) {
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('activity_log').insert({ ...payload, user_id: user?.id })
}

export async function getActivityLog(supabase: SupabaseClient, limit = 100) {
  const { data } = await supabase
    .from('activity_log')
    .select('*, user:profiles!user_id(full_name,email)')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}
