// ─────────────────────────────────────────
// CampaignOS — TypeScript Types
// Mirror of the Supabase database schema
// ─────────────────────────────────────────

export type Role = 'admin' | 'staff'
export type CampaignStatus = 'scheduled' | 'active' | 'completed' | 'cancelled'
export type BatchStatus = 'scheduled' | 'sent'
export type DomainStatus = 'active' | 'inactive'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: Role
  avatar_url: string | null
  created_at: string
}

export interface Group {
  id: string
  name: string        // "NY"
  label: string | null // "New York"
  emoji: string
  created_by: string | null
  created_at: string
}

export interface Batch {
  id: string
  group_id: string
  name: string
  subscriber_count: number
  batch_group_name: string | null
  list_position: number | null
  list_total: number | null
  batch_total_count: number | null
  csv_url: string | null
  uploaded_by: string | null
  created_at: string
  // joined
  group?: Group
}

export interface Template {
  id: string
  name: string
  subject: string
  body: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  group_id: string
  template_id: string
  assigned_to: string
  scheduled_for: string   // date string "2026-04-21"
  note: string | null
  status: CampaignStatus
  created_by: string | null
  created_at: string
  // joined
  group?: Group
  template?: Template
  assignee?: Profile
  campaign_batches?: CampaignBatch[]
  campaign_tasks?: CampaignTask[]
}

export interface CampaignBatch {
  id: string
  campaign_id: string
  batch_id: string
  status: BatchStatus
  sent_at: string | null
  sent_by: string | null
  // joined
  batch?: Batch
}

export interface TaskDefinition {
  id: string
  label: string
  tag: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface CampaignTask {
  id: string
  campaign_id: string
  task_def_id: string
  completed: boolean
  completed_by: string | null
  completed_at: string | null
  // joined
  task_definition?: TaskDefinition
}

export interface Domain {
  id: string
  name: string
  status: DomainStatus
  added_by: string | null
  assigned_to: string | null
  created_at: string
  // joined
  adder?: Profile
}

export interface Lead {
  id: string
  name: string | null
  email: string | null
  note: string | null
  campaign_id: string | null
  added_by: string | null
  in_crm: boolean
  crm_added_at: string | null
  created_at: string
  // joined
  campaign?: Campaign
  adder?: Profile
}

export interface DailyReport {
  id: string
  campaign_id: string
  submitted_by: string | null
  replies: number
  autoreplies: number
  interested: number
  notes: string | null
  report_date: string
  saved_at: string | null
  created_at: string
  // joined
  campaign?: Campaign
  submitter?: Profile
}

export interface ActivityLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  // joined
  user?: Profile
}

// ─── API response shapes ───────────────
export interface CampaignWithFull extends Campaign {
  group: Group
  template: Template
  assignee: Profile
  campaign_batches: (CampaignBatch & { batch: Batch })[]
  campaign_tasks: (CampaignTask & { task_definition: TaskDefinition })[]
  daily_reports: DailyReport[]
}
