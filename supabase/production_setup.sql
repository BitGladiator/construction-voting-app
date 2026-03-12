-- Production setup: votes table and policies
-- Run this in Supabase SQL Editor after the base schema (projects, project_segments, segment_options, profiles).

-- 1. Create votes table (if missing)
create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  segment_id uuid not null references project_segments(id) on delete cascade,
  option_id uuid not null references segment_options(id) on delete cascade,
  voter_id uuid not null references profiles(id) on delete cascade,
  score integer not null check (score between 1 and 10),
  created_at timestamptz not null default now(),
  is_locked boolean not null default false,
  updated_at timestamptz not null default now(),
  locked_at timestamptz,
  unique(segment_id, option_id, voter_id)
);

-- 2. Indexes for faster queries
create index if not exists idx_votes_project_id on votes(project_id);
create index if not exists idx_votes_voter_id on votes(voter_id);

-- 3. Enable Row Level Security
alter table votes enable row level security;

-- 4. Drop existing policies (avoids duplicate errors)
drop policy if exists "votes_select_own_or_admin" on votes;
drop policy if exists "votes_insert_own" on votes;
drop policy if exists "votes_update_own_or_admin" on votes;

-- 5. Policies: users can insert and read their own votes
create policy "votes_select_own_or_admin"
on votes for select
using (
  voter_id = auth.uid()
  or exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "votes_insert_own"
on votes for insert
with check (
  voter_id = auth.uid()
  and exists (
    select 1 from project_participants pp
    where pp.project_id = votes.project_id and pp.profile_id = auth.uid()
  )
);

create policy "votes_update_own_or_admin"
on votes for update
using (
  voter_id = auth.uid()
  or exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  voter_id = auth.uid()
  or exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);
