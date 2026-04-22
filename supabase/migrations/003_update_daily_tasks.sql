update public.task_definitions
set is_active = false
where sort_order between 1 and 5
  and label not in (
    'Configure Domain',
    'Send test',
    'Check spam / inbox',
    'Verify DMARC and DKIM',
    'Reply / test inbox',
    'Unsubscribe',
    'Check leads and replies'
  );

insert into public.task_definitions (label, tag, sort_order, is_active)
select label, tag, sort_order, true
from (
  values
    ('Configure Domain', 'SETUP', 1),
    ('Send test', 'TEST', 2),
    ('Check spam / inbox', 'CHECK', 3),
    ('Verify DMARC and DKIM', 'VERIFY', 4),
    ('Reply / test inbox', 'INBOX', 5),
    ('Unsubscribe', 'COMPLIANCE', 6),
    ('Check leads and replies', 'FINAL', 7)
) as new_tasks(label, tag, sort_order)
where not exists (
  select 1
  from public.task_definitions existing
  where existing.label = new_tasks.label
);
