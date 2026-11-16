-- Lift Log database setup
-- Supabase dashboard → SQL Editor → New query → paste this whole file → Run.
-- Safe to run more than once.

-- 1) One table holds everything: each row is one document (a workout, a split day, your settings…)
--    belonging to one user.
create table if not exists public.docs (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  path       text        not null check (char_length(path) between 3 and 300),
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, path)
);

-- 2) Privacy: every person can only see and change their own rows.
alter table public.docs enable row level security;

drop policy if exists "Read own docs"   on public.docs;
drop policy if exists "Insert own docs" on public.docs;
drop policy if exists "Update own docs" on public.docs;
drop policy if exists "Delete own docs" on public.docs;

create policy "Read own docs"   on public.docs for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own docs" on public.docs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own docs" on public.docs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own docs" on public.docs for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.docs to authenticated;
revoke all on public.docs from anon;

-- 3) Live sync: changes on your phone show up on your laptop without a reload.
do $$
begin
  alter publication supabase_realtime add table public.docs;
exception
  when duplicate_object then null;
end $$;

-- 4) Motivation clips: a private storage folder. Each person can only reach files in their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clips', 'clips', false, 52428800, array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do nothing;

drop policy if exists "Read own clips"   on storage.objects;
drop policy if exists "Upload own clips" on storage.objects;
drop policy if exists "Delete own clips" on storage.objects;

create policy "Read own clips" on storage.objects for select to authenticated
  using (bucket_id = 'clips' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Upload own clips" on storage.objects for insert to authenticated
  with check (bucket_id = 'clips' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Delete own clips" on storage.objects for delete to authenticated
  using (bucket_id = 'clips' and (storage.foldername(name))[1] = (select auth.uid())::text);
