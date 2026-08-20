-- Initial schema for wizdom-ai
-- Run this in your Supabase SQL editor or via Supabase CLI

create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  mode text default 'general' check (mode in ('general', 'code', 'design')),
  created_at timestamptz default now()
);

create table if not exists memory_notes (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('preference', 'project_fact', 'decision')),
  content text not null,
  created_at timestamptz default now()
);

-- RLS: enable on both tables
alter table chats enable row level security;
alter table memory_notes enable row level security;

-- RLS policies: only authenticated users can interact
create policy "Authenticated users can insert chats"
  on chats for insert
  to authenticated
  with check (true);

create policy "Authenticated users can select chats"
  on chats for select
  to authenticated
  using (true);

create policy "Authenticated users can insert memory_notes"
  on memory_notes for insert
  to authenticated
  with check (true);

create policy "Authenticated users can select memory_notes"
  on memory_notes for select
  to authenticated
  using (true);

create policy "Authenticated users can delete memory_notes"
  on memory_notes for delete
  to authenticated
  using (true);

-- Index for faster session lookups
create index idx_chats_session_id on chats (session_id, created_at desc);
