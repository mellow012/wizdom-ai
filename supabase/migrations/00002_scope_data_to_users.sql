-- Scope records to the authenticated user.
-- Existing rows remain nullable legacy data until assigned to a user.

alter table chats
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table memory_notes
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists idx_chats_user_session_created
  on chats (user_id, session_id, created_at desc);

create index if not exists idx_memory_notes_user_created
  on memory_notes (user_id, created_at desc);

drop policy if exists "Authenticated users can insert chats" on chats;
drop policy if exists "Authenticated users can select chats" on chats;
drop policy if exists "Authenticated users can insert memory_notes" on memory_notes;
drop policy if exists "Authenticated users can select memory_notes" on memory_notes;
drop policy if exists "Authenticated users can delete memory_notes" on memory_notes;

create policy "Users can insert their own chats"
  on chats for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can select their own chats"
  on chats for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can update their own chats"
  on chats for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own chats"
  on chats for delete to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own memory notes"
  on memory_notes for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can select their own memory notes"
  on memory_notes for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can update their own memory notes"
  on memory_notes for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own memory notes"
  on memory_notes for delete to authenticated
  using (auth.uid() = user_id);
