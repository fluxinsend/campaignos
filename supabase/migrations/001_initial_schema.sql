-- ============================================================
-- CampaignOS — Supabase Schema  (fixed RLS INSERT policies)
-- Run this entire file in Supabase SQL Editor
-- ============================================================

create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text unique not null,
  full_name   text,
  role        text not null default 'staff' check (role in ('admin','staff')),
  avatar_url  text,
  created_at  timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────
-- GROUPS
-- ─────────────────────────────────────────
create table public.groups (
  id         uuid default uuid_generate_v4() primary key,
  name       text unique not null,
  label      text,
  emoji      text default '📦',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- BATCHES
-- ─────────────────────────────────────────
create table public.batches (
  id                uuid default uuid_generate_v4() primary key,
  group_id          uuid references public.groups(id) on delete cascade,
  name              text not null,
  subscriber_count  int default 0,
  batch_group_name  text,
  list_position     int,
  list_total        int,
  batch_total_count int,
  csv_url           text,
  uploaded_by       uuid references public.profiles(id),
  created_at        timestamptz default now()
);

-- ─────────────────────────────────────────
-- TEMPLATES
-- ─────────────────────────────────────────
create table public.templates (
  id         uuid default uuid_generate_v4() primary key,
  name       text not null,
  subject    text not null,
  body       text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- CAMPAIGNS
-- ─────────────────────────────────────────
create table public.campaigns (
  id            uuid default uuid_generate_v4() primary key,
  group_id      uuid references public.groups(id),
  template_id   uuid references public.templates(id),
  assigned_to   uuid references public.profiles(id),
  scheduled_for date not null,
  note          text,
  status        text default 'scheduled' check (status in ('scheduled','active','completed','cancelled')),
  created_by    uuid references public.profiles(id),
  created_at    timestamptz default now()
);

-- ─────────────────────────────────────────
-- CAMPAIGN_BATCHES
-- ─────────────────────────────────────────
create table public.campaign_batches (
  id          uuid default uuid_generate_v4() primary key,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  batch_id    uuid references public.batches(id),
  status      text default 'scheduled' check (status in ('scheduled','sent')),
  sent_at     timestamptz,
  sent_by     uuid references public.profiles(id)
);

-- ─────────────────────────────────────────
-- TASK DEFINITIONS
-- ─────────────────────────────────────────
create table public.task_definitions (
  id         uuid default uuid_generate_v4() primary key,
  label      text not null,
  tag        text,
  sort_order int default 0,
  is_active  boolean default true,
  created_at timestamptz default now()
);

insert into public.task_definitions (label, tag, sort_order) values
  ('Configure Domain',        'SETUP',      1),
  ('Send test',               'TEST',       2),
  ('Check spam / inbox',      'CHECK',      3),
  ('Verify DMARC and DKIM',   'VERIFY',     4),
  ('Reply / test inbox',      'INBOX',      5),
  ('Unsubscribe',             'COMPLIANCE', 6),
  ('Check leads and replies', 'FINAL',      7);

-- ─────────────────────────────────────────
-- CAMPAIGN_TASKS
-- ─────────────────────────────────────────
create table public.campaign_tasks (
  id           uuid default uuid_generate_v4() primary key,
  campaign_id  uuid references public.campaigns(id) on delete cascade,
  task_def_id  uuid references public.task_definitions(id),
  completed    boolean default false,
  completed_by uuid references public.profiles(id),
  completed_at timestamptz
);

-- ─────────────────────────────────────────
-- DOMAINS
-- ─────────────────────────────────────────
create table public.domains (
  id          uuid default uuid_generate_v4() primary key,
  name        text unique not null,
  status      text default 'inactive' check (status in ('active','inactive')),
  added_by    uuid references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- LEADS
-- ─────────────────────────────────────────
create table public.leads (
  id           uuid default uuid_generate_v4() primary key,
  name         text,
  email        text,
  note         text,
  campaign_id  uuid references public.campaigns(id),
  added_by     uuid references public.profiles(id),
  in_crm       boolean default false,
  crm_added_at timestamptz,
  created_at   timestamptz default now()
);

-- ─────────────────────────────────────────
-- DAILY REPORTS
-- ─────────────────────────────────────────
create table public.daily_reports (
  id           uuid default uuid_generate_v4() primary key,
  campaign_id  uuid references public.campaigns(id) on delete cascade,
  submitted_by uuid references public.profiles(id),
  replies      int default 0,
  autoreplies  int default 0,
  interested   int default 0,
  notes        text,
  report_date  date default current_date,
  saved_at     timestamptz,
  created_at   timestamptz default now(),
  unique (campaign_id, report_date)
);

-- ─────────────────────────────────────────
-- ACTIVITY LOG
-- ─────────────────────────────────────────
create table public.activity_log (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id),
  action      text not null,
  entity_type text,
  entity_id   uuid,
  metadata    jsonb,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- ENABLE ROW LEVEL SECURITY
-- ─────────────────────────────────────────
alter table public.profiles         enable row level security;
alter table public.groups           enable row level security;
alter table public.batches          enable row level security;
alter table public.templates        enable row level security;
alter table public.campaigns        enable row level security;
alter table public.campaign_batches enable row level security;
alter table public.task_definitions enable row level security;
alter table public.campaign_tasks   enable row level security;
alter table public.domains          enable row level security;
alter table public.leads            enable row level security;
alter table public.daily_reports    enable row level security;
alter table public.activity_log     enable row level security;

-- ─────────────────────────────────────────
-- HELPER FUNCTION
-- ─────────────────────────────────────────
create or replace function public.get_my_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- ─────────────────────────────────────────
-- RLS POLICIES
-- KEY RULE:
--   SELECT / UPDATE / DELETE  → use USING(...)
--   INSERT                    → use WITH CHECK(...)  ← was the bug
--   ALL                       → needs both USING and WITH CHECK
-- ─────────────────────────────────────────

-- PROFILES
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or get_my_role() = 'admin');

create policy "profiles_update" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- GROUPS
create policy "groups_select" on public.groups
  for select using (auth.role() = 'authenticated');

create policy "groups_insert" on public.groups
  for insert with check (get_my_role() = 'admin');

create policy "groups_update" on public.groups
  for update using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "groups_delete" on public.groups
  for delete using (get_my_role() = 'admin');

-- BATCHES
create policy "batches_select" on public.batches
  for select using (auth.role() = 'authenticated');

create policy "batches_insert" on public.batches
  for insert with check (get_my_role() = 'admin');

create policy "batches_update" on public.batches
  for update using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "batches_delete" on public.batches
  for delete using (get_my_role() = 'admin');

-- TEMPLATES
create policy "templates_select" on public.templates
  for select using (auth.role() = 'authenticated');

create policy "templates_insert" on public.templates
  for insert with check (get_my_role() = 'admin');

create policy "templates_update" on public.templates
  for update using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "templates_delete" on public.templates
  for delete using (get_my_role() = 'admin');

-- CAMPAIGNS
create policy "campaigns_select_admin" on public.campaigns
  for select using (get_my_role() = 'admin');

create policy "campaigns_select_staff" on public.campaigns
  for select using (assigned_to = auth.uid());

create policy "campaigns_insert" on public.campaigns
  for insert with check (get_my_role() = 'admin');

create policy "campaigns_update" on public.campaigns
  for update using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "campaigns_delete" on public.campaigns
  for delete using (get_my_role() = 'admin');

-- CAMPAIGN_BATCHES
create policy "cbatches_select" on public.campaign_batches
  for select using (auth.role() = 'authenticated');

create policy "cbatches_insert" on public.campaign_batches
  for insert with check (get_my_role() = 'admin');

create policy "cbatches_update" on public.campaign_batches
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "cbatches_delete" on public.campaign_batches
  for delete using (get_my_role() = 'admin');

-- TASK DEFINITIONS
create policy "taskdefs_select" on public.task_definitions
  for select using (auth.role() = 'authenticated');

create policy "taskdefs_insert" on public.task_definitions
  for insert with check (get_my_role() = 'admin');

create policy "taskdefs_update" on public.task_definitions
  for update using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy "taskdefs_delete" on public.task_definitions
  for delete using (get_my_role() = 'admin');

-- CAMPAIGN TASKS
create policy "tasks_select" on public.campaign_tasks
  for select using (auth.role() = 'authenticated');

create policy "tasks_insert" on public.campaign_tasks
  for insert with check (get_my_role() = 'admin');

create policy "tasks_update" on public.campaign_tasks
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- DOMAINS
create policy "domains_select" on public.domains
  for select using (auth.role() = 'authenticated');

create policy "domains_insert" on public.domains
  for insert with check (auth.role() = 'authenticated');

create policy "domains_update" on public.domains
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "domains_delete" on public.domains
  for delete using (get_my_role() = 'admin');

-- LEADS
create policy "leads_select" on public.leads
  for select using (auth.role() = 'authenticated');

create policy "leads_insert" on public.leads
  for insert with check (auth.role() = 'authenticated');

create policy "leads_update" on public.leads
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "leads_delete" on public.leads
  for delete using (get_my_role() = 'admin');

-- DAILY REPORTS
create policy "reports_select" on public.daily_reports
  for select using (auth.role() = 'authenticated');

create policy "reports_insert" on public.daily_reports
  for insert with check (auth.role() = 'authenticated');

create policy "reports_update" on public.daily_reports
  for update using (submitted_by = auth.uid() or get_my_role() = 'admin')
  with check (submitted_by = auth.uid() or get_my_role() = 'admin');

-- ACTIVITY LOG
create policy "log_select" on public.activity_log
  for select using (get_my_role() = 'admin');

create policy "log_insert" on public.activity_log
  for insert with check (auth.role() = 'authenticated');
