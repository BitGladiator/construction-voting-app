-- ================================
-- PRODUCTION VOTES TABLE SETUP
-- ================================

-- 1. Create votes table
create table if not exists votes (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null references projects(id) on delete cascade,
  segment_id uuid not null references project_segments(id) on delete cascade,
  option_id uuid not null references segment_options(id) on delete cascade,

  voter_id uuid not null references profiles(id) on delete cascade,

  score integer not null check (score between 1 and 10),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  is_locked boolean not null default false,
  locked_at timestamptz,

  -- prevents duplicate voting
  unique(segment_id, option_id, voter_id)
);

-- ================================
-- 2. PERFORMANCE INDEXES
-- ================================

create index if not exists idx_votes_project_id
on votes(project_id);

create index if not exists idx_votes_segment_id
on votes(segment_id);

create index if not exists idx_votes_voter_id
on votes(voter_id);

create index if not exists idx_votes_option_id
on votes(option_id);


-- ================================
-- 3. AUTO UPDATE TIMESTAMP
-- ================================

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_votes_updated_at on votes;

create trigger set_votes_updated_at
before update on votes
for each row
execute function update_updated_at_column();


-- ================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ================================

alter table votes enable row level security;


-- ================================
-- 5. REMOVE OLD POLICIES
-- ================================

drop policy if exists "votes_select_own_or_admin" on votes;
drop policy if exists "votes_insert_own" on votes;
drop policy if exists "votes_update_own_or_admin" on votes;
drop policy if exists "votes_delete_admin_only" on votes;


-- ================================
-- 6. SELECT POLICY
-- Users can read their votes
-- Admin can read all votes
-- ================================

create policy "votes_select_own_or_admin"
on votes
for select
using (
  voter_id = auth.uid()
  OR EXISTS (
    select 1
    from profiles p
    where p.id = auth.uid()
    and p.role = 'admin'
  )
);


-- ================================
-- 7. INSERT POLICY
-- User can vote only if they are
-- a participant in the project
-- ================================

create policy "votes_insert_own"
on votes
for insert
with check (
  voter_id = auth.uid()
  AND EXISTS (
    select 1
    from project_participants pp
    where pp.project_id = votes.project_id
    and pp.profile_id = auth.uid()
  )
);


-- ================================
-- 8. UPDATE POLICY
-- Users can update their votes
-- Admin can update all
-- Locked votes cannot change
-- ================================

create policy "votes_update_own_or_admin"
on votes
for update
using (
  (
    voter_id = auth.uid()
    AND is_locked = false
  )
  OR EXISTS (
    select 1
    from profiles p
    where p.id = auth.uid()
    and p.role = 'admin'
  )
)
with check (
  (
    voter_id = auth.uid()
    AND is_locked = false
  )
  OR EXISTS (
    select 1
    from profiles p
    where p.id = auth.uid()
    and p.role = 'admin'
  )
);


-- ================================
-- 9. DELETE POLICY
-- Only admins can delete votes
-- ================================

create policy "votes_delete_admin_only"
on votes
for delete
using (
  exists (
    select 1
    from profiles p
    where p.id = auth.uid()
    and p.role = 'admin'
  )
);