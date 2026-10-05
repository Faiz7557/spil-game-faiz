-- Security hardening after the v2 audit.

-- 1. The review log is the team's audit trail. Guests (anonymous, is_demo) may read only their own entries.
drop policy if exists "audit log readable" on review_events;
create policy "audit log readable" on review_events for select to authenticated using (
  actor_id = auth.uid()
  or exists (select 1 from profiles p where p.id = auth.uid() and not p.is_demo)
);

-- 2. Guest AI output stays in the guest's sandbox instead of the shared tables.
alter table rca_drafts add column if not exists is_demo boolean not null default false;
alter table rca_drafts add column if not exists created_by uuid references profiles(id);
alter table rca_audits add column if not exists is_demo boolean not null default false;
alter table rca_audits add column if not exists created_by uuid references profiles(id);

drop policy if exists "drafts readable" on rca_drafts;
create policy "drafts readable" on rca_drafts for select to authenticated using (
  is_published(snapshot_id) and (
    created_by = auth.uid()
    or (not is_demo and exists (select 1 from profiles p where p.id = auth.uid() and not p.is_demo))
    or (not is_demo and created_by is null)
  )
);
drop policy if exists "read published" on rca_audits;
create policy "read published" on rca_audits for select to authenticated using (
  is_published(snapshot_id) and (created_by = auth.uid() or not is_demo)
);

-- 3. Spend accounting: runs are reserved before the model is called (stop_reason 'in_flight'), and guest spend
--    is tracked separately so anonymous sign-ins cannot exhaust the team's budget.
alter table ai_runs add column if not exists is_demo boolean not null default false;
create index if not exists ai_runs_user_recent on ai_runs (user_id, created_at desc);
