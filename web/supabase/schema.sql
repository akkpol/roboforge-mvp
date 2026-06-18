create extension if not exists pgcrypto;

create table if not exists public.owner_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.robots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  unit_code text not null,
  robot_type text not null default 'rover',
  display_name text not null default 'AEGIS-01',
  theme text not null default 'forge',
  status text not null default 'offline',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, unit_code)
);

alter table public.owner_profiles enable row level security;
alter table public.robots enable row level security;

create policy "Owners can read own profile"
  on public.owner_profiles for select
  using ((select auth.uid()) = id);

create policy "Owners can insert own profile"
  on public.owner_profiles for insert
  with check ((select auth.uid()) = id);

create policy "Owners can update own profile"
  on public.owner_profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Owners can read own robots"
  on public.robots for select
  using ((select auth.uid()) = owner_id);

create policy "Owners can insert own robots"
  on public.robots for insert
  with check ((select auth.uid()) = owner_id);

create policy "Owners can update own robots"
  on public.robots for update
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create index if not exists robots_owner_id_idx on public.robots (owner_id);

create table if not exists public.robot_progress (
  robot_id uuid primary key references public.robots (id) on delete cascade,
  setup_complete boolean not null default false,
  first_drive_complete boolean not null default false,
  battery_calibrated boolean not null default false,
  ready_for_floor_test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.robot_interests (
  id uuid primary key default gen_random_uuid(),
  robot_id uuid not null references public.robots (id) on delete cascade,
  interest text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.beta_applications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  robot_id uuid references public.robots (id) on delete set null,
  name text not null,
  email text not null,
  interest text not null,
  created_at timestamptz not null default now()
);

alter table public.robot_progress enable row level security;
alter table public.robot_interests enable row level security;
alter table public.beta_applications enable row level security;

create policy "Owners can read own robot progress"
  on public.robot_progress for select
  using (
    exists (
      select 1
      from public.robots
      where robots.id = robot_progress.robot_id
        and robots.owner_id = (select auth.uid())
    )
  );

create policy "Owners can insert own robot progress"
  on public.robot_progress for insert
  with check (
    exists (
      select 1
      from public.robots
      where robots.id = robot_progress.robot_id
        and robots.owner_id = (select auth.uid())
    )
  );

create policy "Owners can update own robot progress"
  on public.robot_progress for update
  using (
    exists (
      select 1
      from public.robots
      where robots.id = robot_progress.robot_id
        and robots.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.robots
      where robots.id = robot_progress.robot_id
        and robots.owner_id = (select auth.uid())
    )
  );

create policy "Owners can read own robot interests"
  on public.robot_interests for select
  using (
    exists (
      select 1
      from public.robots
      where robots.id = robot_interests.robot_id
        and robots.owner_id = (select auth.uid())
    )
  );

create policy "Owners can insert own robot interests"
  on public.robot_interests for insert
  with check (
    exists (
      select 1
      from public.robots
      where robots.id = robot_interests.robot_id
        and robots.owner_id = (select auth.uid())
    )
  );

create policy "Owners can read own beta applications"
  on public.beta_applications for select
  using ((select auth.uid()) = owner_id);

create policy "Owners can insert own beta applications"
  on public.beta_applications for insert
  with check ((select auth.uid()) = owner_id);

create index if not exists robot_interests_robot_id_idx
  on public.robot_interests (robot_id);

create index if not exists beta_applications_owner_id_idx
  on public.beta_applications (owner_id);

create index if not exists beta_applications_robot_id_idx
  on public.beta_applications (robot_id);

-- Beta ownership, connection, and lightweight observability schema.
-- This keeps high-frequency joystick data out of Supabase while preserving
-- enough session and event data to understand the first 100-1000 users.

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  workspace_type text not null default 'personal'
    check (workspace_type in ('personal', 'school', 'workshop', 'team')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member', 'student')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

alter table public.robots
  add column if not exists workspace_id uuid references public.workspaces (id) on delete set null;

alter table public.robot_progress
  add column if not exists first_connection_complete boolean not null default false;

alter table public.robot_progress
  add column if not exists first_mission_complete boolean not null default false;

create table if not exists public.robot_claim_codes (
  id uuid primary key default gen_random_uuid(),
  robot_id uuid references public.robots (id) on delete cascade,
  unit_code text not null,
  claim_code_hash text not null,
  claimed_by uuid references auth.users (id) on delete set null,
  claimed_at timestamptz,
  expires_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (unit_code),
  unique (claim_code_hash)
);

create table if not exists public.robot_devices (
  id uuid primary key default gen_random_uuid(),
  robot_id uuid not null references public.robots (id) on delete cascade,
  board_type text not null default 'esp32',
  firmware_version text,
  protocol_version text not null default 'v1',
  ap_ssid text,
  last_seen_at timestamptz,
  battery_config jsonb not null default '{}'::jsonb,
  hardware_profile jsonb not null default '{}'::jsonb,
  readiness_status text not null default 'needs_details',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (robot_id)
);

alter table public.robot_devices
  add column if not exists hardware_profile jsonb not null default '{}'::jsonb;

alter table public.robot_devices
  add column if not exists readiness_status text not null default 'needs_details';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'robot_devices_readiness_status_check'
      and conrelid = 'public.robot_devices'::regclass
  ) then
    alter table public.robot_devices
      add constraint robot_devices_readiness_status_check
      check (readiness_status in (
        'needs_details',
        'ready_for_bench',
        'ready_for_raised_wheels',
        'ready_for_floor',
        'blocked'
      ));
  end if;
end $$;

create table if not exists public.connection_sessions (
  id uuid primary key default gen_random_uuid(),
  robot_id uuid not null references public.robots (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  result text not null default 'started'
    check (result in ('started', 'success', 'failed', 'abandoned')),
  failure_reason text,
  device_mode text not null default 'local_wifi'
    check (device_mode in ('local_wifi', 'demo', 'unknown')),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.control_sessions (
  id uuid primary key default gen_random_uuid(),
  robot_id uuid not null references public.robots (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  connection_session_id uuid references public.connection_sessions (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  mode text not null default 'local_device'
    check (mode in ('local_device', 'demo')),
  max_speed_limit numeric(4, 3) not null default 0.450,
  command_count integer not null default 0 check (command_count >= 0),
  emergency_stop_count integer not null default 0 check (emergency_stop_count >= 0),
  completed_safely boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.robot_bench_tests (
  id uuid primary key default gen_random_uuid(),
  robot_id uuid not null references public.robots (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  stage text not null default 'bench'
    check (stage in ('bench', 'raised_wheels', 'floor')),
  result text not null default 'pending'
    check (result in ('pending', 'passed', 'failed', 'blocked')),
  checks jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.robot_events (
  id uuid primary key default gen_random_uuid(),
  robot_id uuid references public.robots (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  connection_session_id uuid references public.connection_sessions (id) on delete set null,
  control_session_id uuid references public.control_sessions (id) on delete set null,
  event_type text not null,
  severity text not null default 'info'
    check (severity in ('info', 'warning', 'error')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.lyra_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  robot_id uuid references public.robots (id) on delete set null,
  topic text not null default 'setup'
    check (topic in ('setup', 'connection', 'driving', 'error', 'mission', 'feedback')),
  outcome text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  robot_id uuid references public.robots (id) on delete set null,
  rating integer check (rating between 1 and 5),
  problem_type text,
  message text not null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.robot_claim_codes enable row level security;
alter table public.robot_devices enable row level security;
alter table public.connection_sessions enable row level security;
alter table public.control_sessions enable row level security;
alter table public.robot_bench_tests enable row level security;
alter table public.robot_events enable row level security;
alter table public.lyra_sessions enable row level security;
alter table public.feedback_reports enable row level security;
alter table public.app_admins enable row level security;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspaces
    where workspaces.id = target_workspace_id
      and workspaces.owner_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.workspace_members
    where workspace_members.workspace_id = target_workspace_id
      and workspace_members.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated;

create or replace function public.can_access_robot(target_robot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.robots
    left join public.workspaces
      on workspaces.id = robots.workspace_id
    left join public.workspace_members
      on workspace_members.workspace_id = robots.workspace_id
      and workspace_members.user_id = (select auth.uid())
    where robots.id = target_robot_id
      and (
        robots.owner_id = (select auth.uid())
        or workspaces.owner_id = (select auth.uid())
        or workspace_members.user_id is not null
      )
  );
$$;

revoke all on function public.can_access_robot(uuid) from public, anon;
grant execute on function public.can_access_robot(uuid) to authenticated;

create or replace function public.can_manage_robot(target_robot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.robots
    left join public.workspaces
      on workspaces.id = robots.workspace_id
    left join public.workspace_members
      on workspace_members.workspace_id = robots.workspace_id
      and workspace_members.user_id = (select auth.uid())
      and workspace_members.role in ('owner', 'admin')
    where robots.id = target_robot_id
      and (
        robots.owner_id = (select auth.uid())
        or workspaces.owner_id = (select auth.uid())
        or workspace_members.user_id is not null
      )
  );
$$;

revoke all on function public.can_manage_robot(uuid) from public, anon;
grant execute on function public.can_manage_robot(uuid) to authenticated;

create or replace function public.claim_robot_by_code(raw_claim_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_claim public.robot_claim_codes%rowtype;
  target_user uuid := (select auth.uid());
begin
  if target_user is null then
    raise exception 'login_required' using errcode = 'P0001';
  end if;

  select *
  into target_claim
  from public.robot_claim_codes
  where claim_code_hash = encode(digest(raw_claim_code, 'sha256'), 'hex')
    and claimed_by is null
    and (expires_at is null or expires_at > now())
  limit 1
  for update;

  if not found then
    raise exception 'invalid_or_expired_claim_code' using errcode = 'P0001';
  end if;

  if target_claim.robot_id is null then
    raise exception 'claim_code_missing_robot' using errcode = 'P0001';
  end if;

  update public.robots
  set owner_id = target_user,
      updated_at = now()
  where id = target_claim.robot_id;

  update public.robot_claim_codes
  set claimed_by = target_user,
      claimed_at = now()
  where id = target_claim.id;

  return target_claim.robot_id;
end;
$$;

revoke all on function public.claim_robot_by_code(text) from public, anon;
grant execute on function public.claim_robot_by_code(text) to authenticated;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_admins
    where app_admins.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_app_admin() from public, anon;
grant execute on function public.is_app_admin() to authenticated;

create or replace function public.get_beta_health()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  health jsonb;
begin
  if not public.is_app_admin() then
    raise exception 'admin_required' using errcode = 'P0001';
  end if;

  select jsonb_build_object(
    'counts', jsonb_build_object(
      'ownerProfiles', (select count(*) from public.owner_profiles),
      'robots', (select count(*) from public.robots),
      'claimCodes', (select count(*) from public.robot_claim_codes),
      'claimedRobots', (
        select count(*)
        from public.robot_claim_codes
        where claimed_by is not null
      ),
      'floorReadyRobots', (
        select count(*)
        from public.robot_devices
        where readiness_status = 'ready_for_floor'
      ),
      'benchTests', (select count(*) from public.robot_bench_tests),
      'benchPassed', (
        select count(*)
        from public.robot_bench_tests
        where stage = 'bench'
          and result = 'passed'
      ),
      'raisedWheelPassed', (
        select count(*)
        from public.robot_bench_tests
        where stage = 'raised_wheels'
          and result = 'passed'
      ),
      'connectionSessions', (select count(*) from public.connection_sessions),
      'controlSessions', (select count(*) from public.control_sessions),
      'robotEvents', (select count(*) from public.robot_events),
      'feedbackReports', (select count(*) from public.feedback_reports)
    ),
    'connectionResults', coalesce((
      select jsonb_object_agg(result, total)
      from (
        select result, count(*) as total
        from public.connection_sessions
        group by result
      ) results
    ), '{}'::jsonb),
    'controlSummary', (
      select jsonb_build_object(
        'commandCount', coalesce(sum(command_count), 0),
        'completedSafely', count(*) filter (where completed_safely),
        'emergencyStopCount', coalesce(sum(emergency_stop_count), 0)
      )
      from public.control_sessions
    ),
    'topEvents', coalesce((
      select jsonb_agg(to_jsonb(events))
      from (
        select created_at, event_type, severity, message
        from public.robot_events
        order by created_at desc
        limit 8
      ) events
    ), '[]'::jsonb),
    'latestFeedback', coalesce((
      select jsonb_agg(to_jsonb(feedback))
      from (
        select created_at, rating, problem_type, message
        from public.feedback_reports
        order by created_at desc
        limit 6
      ) feedback
    ), '[]'::jsonb),
    'latestBenchTests', coalesce((
      select jsonb_agg(to_jsonb(tests))
      from (
        select
          robot_bench_tests.checks,
          robot_bench_tests.created_at,
          robot_bench_tests.notes,
          robot_bench_tests.result,
          robot_bench_tests.robot_id,
          robot_bench_tests.stage,
          robots.unit_code
        from public.robot_bench_tests
        left join public.robots
          on robots.id = robot_bench_tests.robot_id
        order by robot_bench_tests.created_at desc
        limit 8
      ) tests
    ), '[]'::jsonb),
    'claimKits', coalesce((
      select jsonb_agg(to_jsonb(kits))
      from (
        select
          robot_devices.ap_ssid,
          robot_devices.battery_config,
          robot_claim_codes.created_at,
          robot_claim_codes.claimed_at,
          robot_claim_codes.expires_at,
          robot_devices.firmware_version,
          robot_devices.hardware_profile,
          robot_devices.protocol_version,
          robot_devices.readiness_status,
          robot_claim_codes.robot_id,
          robots.robot_type,
          robot_claim_codes.unit_code
        from public.robot_claim_codes
        left join public.robot_devices
          on robot_devices.robot_id = robot_claim_codes.robot_id
        left join public.robots
          on robots.id = robot_claim_codes.robot_id
        order by robot_claim_codes.created_at desc
        limit 8
      ) kits
    ), '[]'::jsonb)
  )
  into health;

  return health;
end;
$$;

revoke all on function public.get_beta_health() from public, anon;
grant execute on function public.get_beta_health() to authenticated;

create or replace function public.create_robot_claim_kit(
  input_unit_code text,
  input_robot_type text default 'rover',
  input_display_name text default null,
  input_board_type text default 'esp32',
  input_firmware_version text default null,
  input_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  board_type text;
  created_robot_id uuid;
  display_name text;
  raw_code text;
  robot_type text;
  target_user uuid := (select auth.uid());
  token text;
  normalized_unit_code text;
begin
  if target_user is null then
    raise exception 'login_required' using errcode = 'P0001';
  end if;

  if not public.is_app_admin() then
    raise exception 'admin_required' using errcode = 'P0001';
  end if;

  normalized_unit_code := upper(regexp_replace(coalesce(input_unit_code, ''), '[^A-Za-z0-9-]', '', 'g'));
  robot_type := lower(coalesce(nullif(trim(input_robot_type), ''), 'rover'));
  display_name := coalesce(nullif(trim(input_display_name), ''), normalized_unit_code);
  board_type := lower(coalesce(nullif(trim(input_board_type), ''), 'esp32'));

  if length(normalized_unit_code) < 3 then
    raise exception 'invalid_unit_code' using errcode = 'P0001';
  end if;

  if robot_type not in ('rover', 'tracked', 'drone', 'arm') then
    raise exception 'invalid_robot_type' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.robot_claim_codes
    where robot_claim_codes.unit_code = normalized_unit_code
  ) then
    raise exception 'duplicate_unit_code' using errcode = 'P0001';
  end if;

  insert into public.robots (
    display_name,
    owner_id,
    robot_type,
    status,
    theme,
    unit_code
  )
  values (
    display_name,
    target_user,
    robot_type,
    'offline',
    'forge',
    normalized_unit_code
  )
  returning id into created_robot_id;

  insert into public.robot_progress (robot_id)
  values (created_robot_id)
  on conflict (robot_id) do nothing;

  insert into public.robot_devices (
    board_type,
    firmware_version,
    protocol_version,
    robot_id
  )
  values (
    board_type,
    nullif(trim(input_firmware_version), ''),
    'v1',
    created_robot_id
  )
  on conflict (robot_id) do update
  set board_type = excluded.board_type,
      firmware_version = excluded.firmware_version,
      updated_at = now();

  for attempt in 1..5 loop
    token := upper(encode(gen_random_bytes(6), 'hex'));
    raw_code := 'RF-' ||
      substr(token, 1, 4) || '-' ||
      substr(token, 5, 4) || '-' ||
      substr(token, 9, 4);

    begin
      insert into public.robot_claim_codes (
        claim_code_hash,
        created_by,
        expires_at,
        robot_id,
        unit_code
      )
      values (
        encode(digest(raw_code, 'sha256'), 'hex'),
        target_user,
        input_expires_at,
        created_robot_id,
        normalized_unit_code
      );

      return jsonb_build_object(
        'claimCode', raw_code,
        'expiresAt', input_expires_at,
        'robotId', created_robot_id,
        'unitCode', normalized_unit_code
      );
    exception
      when unique_violation then
        if attempt = 5 then
          raise;
        end if;
    end;
  end loop;

  raise exception 'claim_code_generation_failed' using errcode = 'P0001';
end;
$$;

revoke all on function public.create_robot_claim_kit(text, text, text, text, text, timestamptz) from public, anon;
grant execute on function public.create_robot_claim_kit(text, text, text, text, text, timestamptz) to authenticated;

drop policy if exists "Owners can manage own workspaces" on public.workspaces;
drop policy if exists "Members can read workspaces" on public.workspaces;
drop policy if exists "Users can read accessible workspaces" on public.workspaces;
create policy "Users can read accessible workspaces"
  on public.workspaces for select
  to authenticated
  using (
    (select auth.uid()) = owner_id
    or public.is_workspace_member(id)
  );

drop policy if exists "Owners can insert own workspaces" on public.workspaces;
create policy "Owners can insert own workspaces"
  on public.workspaces for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners can update own workspaces" on public.workspaces;
create policy "Owners can update own workspaces"
  on public.workspaces for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners can delete own workspaces" on public.workspaces;
create policy "Owners can delete own workspaces"
  on public.workspaces for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Workspace owners can manage members" on public.workspace_members;
drop policy if exists "Members can read workspace members" on public.workspace_members;
drop policy if exists "Users can read accessible workspace members" on public.workspace_members;
create policy "Users can read accessible workspace members"
  on public.workspace_members for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace owners can insert members" on public.workspace_members;
create policy "Workspace owners can insert members"
  on public.workspace_members for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.workspaces
      where workspaces.id = workspace_members.workspace_id
        and workspaces.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Workspace owners can update members" on public.workspace_members;
create policy "Workspace owners can update members"
  on public.workspace_members for update
  to authenticated
  using (
    exists (
      select 1
      from public.workspaces
      where workspaces.id = workspace_members.workspace_id
        and workspaces.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.workspaces
      where workspaces.id = workspace_members.workspace_id
        and workspaces.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Workspace owners can delete members" on public.workspace_members;
create policy "Workspace owners can delete members"
  on public.workspace_members for delete
  to authenticated
  using (
    exists (
      select 1
      from public.workspaces
      where workspaces.id = workspace_members.workspace_id
        and workspaces.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Owners can read own robots" on public.robots;
drop policy if exists "Workspace members can read shared robots" on public.robots;
drop policy if exists "Users can read accessible robots" on public.robots;
create policy "Users can read accessible robots"
  on public.robots for select
  to authenticated
  using (
    (select auth.uid()) = owner_id
    or (workspace_id is not null and public.is_workspace_member(workspace_id))
  );

drop policy if exists "Owners can insert own robots" on public.robots;
create policy "Owners can insert own robots"
  on public.robots for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners can update own robots" on public.robots;
create policy "Owners can update own robots"
  on public.robots for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners can read robot claim codes" on public.robot_claim_codes;
create policy "Owners can read robot claim codes"
  on public.robot_claim_codes for select
  to authenticated
  using (
    (robot_id is not null and public.can_manage_robot(robot_id))
    or claimed_by = (select auth.uid())
  );

drop policy if exists "Owners can insert robot claim codes" on public.robot_claim_codes;
create policy "Owners can insert robot claim codes"
  on public.robot_claim_codes for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and (robot_id is null or public.can_manage_robot(robot_id))
  );

drop policy if exists "Owners can update robot claim codes" on public.robot_claim_codes;
create policy "Owners can update robot claim codes"
  on public.robot_claim_codes for update
  to authenticated
  using (robot_id is not null and public.can_manage_robot(robot_id))
  with check (robot_id is not null and public.can_manage_robot(robot_id));

drop policy if exists "Owners can read robot devices" on public.robot_devices;
drop policy if exists "Owners can manage robot devices" on public.robot_devices;
create policy "Owners can read robot devices"
  on public.robot_devices for select
  to authenticated
  using (public.can_access_robot(robot_id) or public.is_app_admin());

drop policy if exists "Owners can insert robot devices" on public.robot_devices;
create policy "Owners can insert robot devices"
  on public.robot_devices for insert
  to authenticated
  with check (public.can_manage_robot(robot_id) or public.is_app_admin());

drop policy if exists "Owners can update robot devices" on public.robot_devices;
create policy "Owners can update robot devices"
  on public.robot_devices for update
  to authenticated
  using (public.can_manage_robot(robot_id) or public.is_app_admin())
  with check (public.can_manage_robot(robot_id) or public.is_app_admin());

drop policy if exists "Owners can delete robot devices" on public.robot_devices;
create policy "Owners can delete robot devices"
  on public.robot_devices for delete
  to authenticated
  using (public.can_manage_robot(robot_id) or public.is_app_admin());

drop policy if exists "Users can read robot bench tests" on public.robot_bench_tests;
create policy "Users can read robot bench tests"
  on public.robot_bench_tests for select
  using (
    user_id = (select auth.uid())
    or public.can_manage_robot(robot_id)
    or public.is_app_admin()
  );

drop policy if exists "Users can insert robot bench tests" on public.robot_bench_tests;
create policy "Users can insert robot bench tests"
  on public.robot_bench_tests for insert
  with check (
    user_id = (select auth.uid())
    and (
      public.can_manage_robot(robot_id)
      or public.is_app_admin()
    )
  );

drop policy if exists "Users can read own connection sessions" on public.connection_sessions;
create policy "Users can read own connection sessions"
  on public.connection_sessions for select
  using (user_id = (select auth.uid()) or public.can_manage_robot(robot_id));

drop policy if exists "Users can insert own connection sessions" on public.connection_sessions;
create policy "Users can insert own connection sessions"
  on public.connection_sessions for insert
  with check (user_id = (select auth.uid()) and public.can_access_robot(robot_id));

drop policy if exists "Users can update own connection sessions" on public.connection_sessions;
create policy "Users can update own connection sessions"
  on public.connection_sessions for update
  using (user_id = (select auth.uid()) or public.can_manage_robot(robot_id))
  with check (user_id = (select auth.uid()) or public.can_manage_robot(robot_id));

drop policy if exists "Users can read own control sessions" on public.control_sessions;
create policy "Users can read own control sessions"
  on public.control_sessions for select
  using (user_id = (select auth.uid()) or public.can_manage_robot(robot_id));

drop policy if exists "Users can insert own control sessions" on public.control_sessions;
create policy "Users can insert own control sessions"
  on public.control_sessions for insert
  with check (user_id = (select auth.uid()) and public.can_access_robot(robot_id));

drop policy if exists "Users can update own control sessions" on public.control_sessions;
create policy "Users can update own control sessions"
  on public.control_sessions for update
  using (user_id = (select auth.uid()) or public.can_manage_robot(robot_id))
  with check (user_id = (select auth.uid()) or public.can_manage_robot(robot_id));

drop policy if exists "Users can read robot events" on public.robot_events;
create policy "Users can read robot events"
  on public.robot_events for select
  using (
    user_id = (select auth.uid())
    or (robot_id is not null and public.can_access_robot(robot_id))
  );

drop policy if exists "Users can insert robot events" on public.robot_events;
create policy "Users can insert robot events"
  on public.robot_events for insert
  with check (
    user_id = (select auth.uid())
    and (robot_id is null or public.can_access_robot(robot_id))
  );

drop policy if exists "Users can read own lyra sessions" on public.lyra_sessions;
create policy "Users can read own lyra sessions"
  on public.lyra_sessions for select
  using (
    user_id = (select auth.uid())
    or (robot_id is not null and public.can_manage_robot(robot_id))
  );

drop policy if exists "Users can insert own lyra sessions" on public.lyra_sessions;
create policy "Users can insert own lyra sessions"
  on public.lyra_sessions for insert
  with check (
    user_id = (select auth.uid())
    and (robot_id is null or public.can_access_robot(robot_id))
  );

drop policy if exists "Users can update own lyra sessions" on public.lyra_sessions;
create policy "Users can update own lyra sessions"
  on public.lyra_sessions for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can read own feedback" on public.feedback_reports;
create policy "Users can read own feedback"
  on public.feedback_reports for select
  using (
    user_id = (select auth.uid())
    or (robot_id is not null and public.can_manage_robot(robot_id))
  );

drop policy if exists "Users can insert own feedback" on public.feedback_reports;
create policy "Users can insert own feedback"
  on public.feedback_reports for insert
  with check (
    user_id = (select auth.uid())
    and (robot_id is null or public.can_access_robot(robot_id))
  );

drop policy if exists "App admins can read own admin grant" on public.app_admins;
create policy "App admins can read own admin grant"
  on public.app_admins for select
  using (user_id = (select auth.uid()));

drop policy if exists "Workspace members can read robot progress" on public.robot_progress;
drop policy if exists "Owners can read own robot progress" on public.robot_progress;
drop policy if exists "Users can read accessible robot progress" on public.robot_progress;
create policy "Users can read accessible robot progress"
  on public.robot_progress for select
  to authenticated
  using (public.can_access_robot(robot_id));

drop policy if exists "Owners can insert own robot progress" on public.robot_progress;
drop policy if exists "Robot managers can insert robot progress" on public.robot_progress;
create policy "Robot managers can insert robot progress"
  on public.robot_progress for insert
  to authenticated
  with check (public.can_manage_robot(robot_id));

drop policy if exists "Workspace managers can update robot progress" on public.robot_progress;
drop policy if exists "Owners can update own robot progress" on public.robot_progress;
drop policy if exists "Robot managers can update robot progress" on public.robot_progress;
create policy "Robot managers can update robot progress"
  on public.robot_progress for update
  to authenticated
  using (public.can_manage_robot(robot_id))
  with check (public.can_manage_robot(robot_id));

drop policy if exists "Workspace members can read robot interests" on public.robot_interests;
drop policy if exists "Owners can read own robot interests" on public.robot_interests;
drop policy if exists "Users can read accessible robot interests" on public.robot_interests;
create policy "Users can read accessible robot interests"
  on public.robot_interests for select
  to authenticated
  using (public.can_access_robot(robot_id));

drop policy if exists "Owners can insert own robot interests" on public.robot_interests;
drop policy if exists "Robot managers can insert robot interests" on public.robot_interests;
create policy "Robot managers can insert robot interests"
  on public.robot_interests for insert
  to authenticated
  with check (public.can_manage_robot(robot_id));

create index if not exists workspaces_owner_id_idx
  on public.workspaces (owner_id);

create index if not exists workspace_members_user_id_idx
  on public.workspace_members (user_id);

create index if not exists robots_workspace_id_idx
  on public.robots (workspace_id);

create index if not exists robot_claim_codes_robot_id_idx
  on public.robot_claim_codes (robot_id);

create index if not exists robot_claim_codes_claimed_by_idx
  on public.robot_claim_codes (claimed_by);

create index if not exists robot_claim_codes_created_by_idx
  on public.robot_claim_codes (created_by);

create index if not exists robot_devices_robot_id_idx
  on public.robot_devices (robot_id);

create index if not exists connection_sessions_robot_started_idx
  on public.connection_sessions (robot_id, started_at desc);

create index if not exists connection_sessions_user_started_idx
  on public.connection_sessions (user_id, started_at desc);

create index if not exists control_sessions_robot_started_idx
  on public.control_sessions (robot_id, started_at desc);

create index if not exists control_sessions_user_started_idx
  on public.control_sessions (user_id, started_at desc);

create index if not exists control_sessions_connection_session_id_idx
  on public.control_sessions (connection_session_id);

create index if not exists robot_bench_tests_robot_created_idx
  on public.robot_bench_tests (robot_id, created_at desc);

create index if not exists robot_bench_tests_user_created_idx
  on public.robot_bench_tests (user_id, created_at desc);

create index if not exists robot_bench_tests_stage_result_idx
  on public.robot_bench_tests (stage, result);

create index if not exists robot_events_robot_created_idx
  on public.robot_events (robot_id, created_at desc);

create index if not exists robot_events_user_created_idx
  on public.robot_events (user_id, created_at desc);

create index if not exists robot_events_connection_session_id_idx
  on public.robot_events (connection_session_id);

create index if not exists robot_events_control_session_id_idx
  on public.robot_events (control_session_id);

create index if not exists lyra_sessions_user_started_idx
  on public.lyra_sessions (user_id, started_at desc);

create index if not exists lyra_sessions_robot_started_idx
  on public.lyra_sessions (robot_id, started_at desc);

create index if not exists feedback_reports_user_created_idx
  on public.feedback_reports (user_id, created_at desc);

create index if not exists feedback_reports_robot_created_idx
  on public.feedback_reports (robot_id, created_at desc);

create index if not exists app_admins_user_id_idx
  on public.app_admins (user_id);

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
    execute 'grant execute on function public.rls_auto_enable() to service_role';
  end if;
end $$;
