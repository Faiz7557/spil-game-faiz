create extension if not exists pgcrypto with schema extensions;

create type app_role as enum ('viewer', 'engineer', 'reviewer', 'manager', 'data_owner');
create type assertion_type as enum ('observed', 'documented_finding', 'proposed', 'simulated');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role app_role not null default 'viewer',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table snapshots (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  review_date date not null,
  status text not null check (status in ('staging', 'published', 'archived')),
  validation jsonb not null default '{}'::jsonb,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create unique index one_published_snapshot on snapshots ((status)) where status = 'published';

create table sources (
  snapshot_id uuid not null references snapshots(id) on delete cascade,
  id text not null,
  kind text not null,
  file_name text not null,
  storage_path text,
  sha256 text not null,
  source_updated_at timestamptz,
  ingested_at timestamptz not null default now(),
  primary key (snapshot_id, id)
);

create table incidents (
  snapshot_id uuid not null references snapshots(id) on delete cascade,
  id text not null,
  serial int not null,
  mto text, ar_raw text, ar text,
  plant text not null, tag text not null, eq_class text,
  occurred date not null, title text not null, impact text,
  pre_risk text, risk_score int, pic_rca text, status text not null,
  discipline text, eq_type text, component text, mechanism text,
  downtime_h numeric, actual_usd bigint not null, potential_usd bigint not null,
  rca_due date, src jsonb not null,
  primary key (snapshot_id, id)
);
create index incidents_status on incidents (snapshot_id, status);

create table equipment (
  snapshot_id uuid not null references snapshots(id) on delete cascade,
  tag text not null,
  source_id text not null,
  doc jsonb not null,               -- full Equipment object (params, history, summary, flags)
  primary key (snapshot_id, tag)
);

create table hourly_series (
  snapshot_id uuid not null references snapshots(id) on delete cascade,
  tag_prefix text not null,
  source_id text not null,
  doc jsonb not null,               -- full Hourly object
  primary key (snapshot_id, tag_prefix)
);

create table rca_documents (
  snapshot_id uuid not null references snapshots(id) on delete cascade,
  tag text not null,
  source_id text not null,
  doc jsonb not null,               -- full Rca object incl. slides, actions, preventive
  primary key (snapshot_id, tag)
);

create table evidence (
  snapshot_id uuid not null references snapshots(id) on delete cascade,
  id text not null,
  case_tag text not null,
  type assertion_type not null,
  source_id text not null,
  loc text not null, title text not null, excerpt text not null,
  observed_at date,
  primary key (snapshot_id, id)
);

create table conflicts (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references snapshots(id) on delete cascade,
  case_tag text not null,
  code text not null,
  topic text not null,
  severity text not null check (severity in ('decision', 'info', 'rule')),
  a jsonb not null, b jsonb not null, note text not null,
  origin text not null check (origin in ('curated', 'rca_auditor')),
  state text not null default 'unresolved' check (state in ('unresolved', 'rule_applied', 'resolved')),
  owner_role text not null,
  created_at timestamptz not null default now(),
  unique (snapshot_id, case_tag, code)
);

create table actions (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references snapshots(id),
  case_tag text not null,
  incident_id text,
  title text not null,
  source_action_ref text,
  source_refs text[] not null default '{}',
  rationale text not null default '',
  owner_label text not null default '',
  due date,
  scope text not null default '',
  dependency text not null default '',
  state text not null default 'draft',
  rule jsonb not null,
  reviewer_label text not null default '',
  effectiveness_result text not null default '',
  execution_note text not null default '',
  is_demo boolean not null default false,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table action_evidence (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references actions(id) on delete cascade,
  kind text not null,
  label text not null,
  dated date,
  storage_path text,
  ai_check jsonb,
  added_by uuid not null references profiles(id),
  added_at timestamptz not null default now()
);

create table review_events (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor_id uuid references profiles(id),
  subject_type text not null,
  subject_id text not null,
  from_state text, to_state text,
  decision text not null,
  reason text not null default '',
  evidence_refs text[] not null default '{}',
  prev_hash text,
  hash text
);

create table ai_runs (
  id uuid primary key default gen_random_uuid(),
  feature text not null,
  model text not null,
  ref text,
  user_id uuid references profiles(id),
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_read_tokens int not null default 0,
  cost_usd numeric(10, 4) not null default 0,
  latency_ms int not null default 0,
  stop_reason text,
  validation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index ai_runs_feature on ai_runs (feature, created_at desc);

create table rca_audits (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references snapshots(id),
  tag text not null,
  claims jsonb not null,
  findings jsonb not null,
  ai_run_id uuid references ai_runs(id),
  created_at timestamptz not null default now()
);

create table rca_drafts (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references snapshots(id),
  incident_id text not null,
  draft jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'accepted', 'rejected')),
  ai_run_id uuid references ai_runs(id),
  reviewed_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table failure_patterns (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references snapshots(id),
  cluster_key text not null,
  member_ids text[] not null,
  plants text[] not null,
  actual_usd bigint not null,
  open_count int not null,
  top_terms text[] not null,
  label jsonb,
  created_at timestamptz not null default now(),
  unique (snapshot_id, cluster_key)
);

create table anomaly_events (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references snapshots(id),
  tag text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  peak_score double precision not null,
  contributors jsonb not null,
  first_off_at timestamptz,
  lead_hours double precision,
  explanation jsonb,
  created_at timestamptz not null default now()
);

create table copilot_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  case_tag text,
  created_at timestamptz not null default now()
);

create table copilot_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references copilot_threads(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  question text,
  answer jsonb,
  guard jsonb,
  ai_run_id uuid references ai_runs(id),
  created_at timestamptz not null default now()
);

create table business_scenarios (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references profiles(id),
  name text not null,
  inputs jsonb not null,
  outputs jsonb not null,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references actions(id) on delete cascade,
  kind text not null check (kind in ('due_soon', 'overdue', 'awaiting_review')),
  sent_to text not null,
  sent_on date not null default current_date,
  unique (action_id, kind, sent_on)
);

-- New auth user → profile. Anonymous guests are demo users.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name, role, is_demo)
  values (new.id, coalesce(new.email, 'Guest'), 'viewer', coalesce(new.is_anonymous, false));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
