-- Create a user-owned project model for Wizdom.
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  status text not null check (status in ('concept', 'planning', 'active', 'paused', 'completed', 'archived')),
  github_repo_id bigint null,
  github_owner text null,
  github_repo text null,
  github_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table projects enable row level security;

create index if not exists idx_projects_user_updated
  on projects (user_id, updated_at desc);

create policy "Users can insert their own projects"
  on projects for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can select their own projects"
  on projects for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can update their own projects"
  on projects for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own projects"
  on projects for delete to authenticated
  using (auth.uid() = user_id);
