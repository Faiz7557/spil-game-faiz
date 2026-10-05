create or replace function review_events_chain() returns trigger
language plpgsql as $$
declare last_hash text;
begin
  perform pg_advisory_xact_lock(4242);  -- serialize chain writers
  select hash into last_hash from review_events order by id desc limit 1;
  new.prev_hash := coalesce(last_hash, 'GENESIS');
  new.hash := encode(extensions.digest(
    new.prev_hash || '|' || new.at::text || '|' || coalesce(new.actor_id::text, '') || '|' ||
    new.subject_type || '|' || new.subject_id || '|' || coalesce(new.from_state, '') || '|' ||
    coalesce(new.to_state, '') || '|' || new.decision || '|' || new.reason || '|' ||
    array_to_string(new.evidence_refs, ','), 'sha256'), 'hex');
  return new;
end $$;
create trigger review_events_chain before insert on review_events
  for each row execute function review_events_chain();

create or replace function forbid_mutation() returns trigger language plpgsql as $$
begin raise exception 'review_events is append-only'; end $$;
create trigger review_events_append_only before update or delete on review_events
  for each row execute function forbid_mutation();

-- Recompute the chain; returns the first broken id, or null when intact.
create or replace function verify_review_chain() returns bigint
language plpgsql stable as $$
declare r record; prev text := 'GENESIS'; expected text;
begin
  for r in select * from review_events order by id loop
    expected := encode(extensions.digest(
      prev || '|' || r.at::text || '|' || coalesce(r.actor_id::text, '') || '|' ||
      r.subject_type || '|' || r.subject_id || '|' || coalesce(r.from_state, '') || '|' ||
      coalesce(r.to_state, '') || '|' || r.decision || '|' || r.reason || '|' ||
      array_to_string(r.evidence_refs, ','), 'sha256'), 'hex');
    if r.prev_hash <> prev or r.hash <> expected then return r.id; end if;
    prev := r.hash;
  end loop;
  return null;
end $$;
