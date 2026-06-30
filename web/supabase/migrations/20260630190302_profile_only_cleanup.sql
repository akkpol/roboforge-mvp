drop event trigger if exists ensure_rls;
drop function if exists public.rls_auto_enable();

drop table if exists
  public.robot_events,
  public.control_sessions,
  public.connection_sessions,
  public.robot_bench_tests,
  public.robot_claim_codes,
  public.robot_devices,
  public.robot_interests,
  public.robot_progress,
  public.beta_applications,
  public.feedback_reports,
  public.lyra_sessions,
  public.robots,
  public.workspace_members,
  public.workspaces,
  public.app_admins
cascade;

drop function if exists public.can_access_robot(uuid);
drop function if exists public.can_manage_robot(uuid);
drop function if exists public.claim_robot_by_code(text);
drop function if exists public.create_robot_claim_kit(
  text,
  text,
  text,
  text,
  text,
  timestamp with time zone,
  text,
  jsonb,
  jsonb,
  text
);
drop function if exists public.get_beta_health();
drop function if exists public.is_app_admin();
drop function if exists public.is_workspace_member(uuid);

alter table public.owner_profiles
  drop constraint if exists owner_profiles_role_type_check,
  drop constraint if exists owner_profiles_skill_level_check,
  drop column if exists role_type,
  drop column if exists skill_level,
  drop column if exists preferred_language,
  drop column if exists organization_name,
  drop column if exists onboarding_completed,
  drop column if exists last_active_at;

alter table public.owner_profiles enable row level security;

revoke all on table public.owner_profiles from anon;
revoke delete on table public.owner_profiles from authenticated;
grant select, insert, update on table public.owner_profiles to authenticated;

drop policy if exists "Owners can read own profile" on public.owner_profiles;
create policy "Owners can read own profile"
  on public.owner_profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Owners can insert own profile" on public.owner_profiles;
create policy "Owners can insert own profile"
  on public.owner_profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Owners can update own profile" on public.owner_profiles;
create policy "Owners can update own profile"
  on public.owner_profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  false,
  524288,
  array['image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Owners can read own profile avatar" on storage.objects;
create policy "Owners can read own profile avatar"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Owners can upload own profile avatar" on storage.objects;
create policy "Owners can upload own profile avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and storage.filename(name) = 'avatar.webp'
    and storage.extension(name) = 'webp'
  );

drop policy if exists "Owners can update own profile avatar" on storage.objects;
create policy "Owners can update own profile avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and storage.filename(name) = 'avatar.webp'
    and storage.extension(name) = 'webp'
  );

drop policy if exists "Owners can delete own profile avatar" on storage.objects;
create policy "Owners can delete own profile avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
