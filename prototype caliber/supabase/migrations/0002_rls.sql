do $$
declare t text;
begin
  foreach t in array array['profiles','snapshots','sources','incidents','equipment','hourly_series',
    'rca_documents','evidence','conflicts','actions','action_evidence','review_events','ai_runs',
    'rca_audits','rca_drafts','failure_patterns','anomaly_events','copilot_threads','copilot_messages',
    'business_scenarios','notifications']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

create or replace function is_published(s uuid) returns boolean
language sql stable as $$ select exists (select 1 from snapshots where id = s and status = 'published') $$;

create policy "own profile" on profiles for select using (id = auth.uid());
create policy "published snapshots" on snapshots for select to authenticated using (status = 'published');

-- Snapshot data: any signed-in user (guests included) can read the published snapshot.
create policy "read published" on sources        for select to authenticated using (is_published(snapshot_id));
create policy "read published" on incidents      for select to authenticated using (is_published(snapshot_id));
create policy "read published" on equipment      for select to authenticated using (is_published(snapshot_id));
create policy "read published" on hourly_series  for select to authenticated using (is_published(snapshot_id));
create policy "read published" on rca_documents  for select to authenticated using (is_published(snapshot_id));
create policy "read published" on evidence       for select to authenticated using (is_published(snapshot_id));
create policy "read published" on conflicts      for select to authenticated using (is_published(snapshot_id));
create policy "read published" on rca_audits     for select to authenticated using (is_published(snapshot_id));
create policy "read published" on failure_patterns for select to authenticated using (is_published(snapshot_id));
create policy "read published" on anomaly_events for select to authenticated using (is_published(snapshot_id));

-- Actions: team actions are visible to team members; demo actions only to their creator.
create policy "actions visible" on actions for select to authenticated using (
  (not is_demo and exists (select 1 from profiles p where p.id = auth.uid() and not p.is_demo))
  or created_by = auth.uid()
);
create policy "evidence of visible actions" on action_evidence for select to authenticated
  using (exists (select 1 from actions a where a.id = action_id));
create policy "drafts readable" on rca_drafts for select to authenticated using (is_published(snapshot_id));
create policy "own threads" on copilot_threads for select using (user_id = auth.uid());
create policy "own messages" on copilot_messages for select
  using (exists (select 1 from copilot_threads t where t.id = thread_id and t.user_id = auth.uid()));
create policy "own scenarios" on business_scenarios for select using (created_by = auth.uid());
create policy "managers see ai runs" on ai_runs for select to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('manager', 'data_owner')));
create policy "audit log readable" on review_events for select to authenticated using (true);
-- No insert/update/delete policies: the browser cannot write. Storage buckets are private (Task 5.1).
