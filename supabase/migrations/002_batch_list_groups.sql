alter table public.batches
  add column if not exists batch_group_name text,
  add column if not exists list_position int,
  add column if not exists list_total int,
  add column if not exists batch_total_count int;
