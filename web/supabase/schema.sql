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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (robot_id)
);

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

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.robot_claim_codes enable row level security;
alter table public.robot_devices enable row level security;
alter table public.connection_sessions enable row level security;
alter table public.control_sessions enable row level security;
alter table public.robot_events enable row level security;
alter table public.lyra_sessions enable row level security;
alter table public.feedback_reports enable row level security;

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

revoke all on function public.claim_robot_by_code(text) from public;
grant execute on function public.claim_robot_by_code(text) to authenticated;

drop policy if exists "Owners can manage own workspaces" on public.workspaces;
create policy "Owners can manage own workspaces"
  on public.workspaces for all
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Members can read workspaces" on public.workspaces;
create policy "Members can read workspaces"
  on public.workspaces for select
  using (public.is_workspace_member(id));

drop policy if exists "Workspace owners can manage members" on public.workspace_members;
create policy "Workspace owners can manage members"
  on public.workspace_members for all
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

drop policy if exists "Members can read workspace members" on public.workspace_members;
create policy "Members can read workspace members"
  on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can read shared robots" on public.robots;
create policy "Workspace members can read shared robots"
  on public.robots for select
  using (workspace_id is not null and public.is_workspace_member(workspace_id));

drop policy if exists "Owners can read robot claim codes" on public.robot_claim_codes;
create policy "Owners can read robot claim codes"
  on public.robot_claim_codes for select
  using (
    (robot_id is not null and public.can_manage_robot(robot_id))
    or claimed_by = (select auth.uid())
  );

drop policy if exists "Owners can insert robot claim codes" on public.robot_claim_codes;
create policy "Owners can insert robot claim codes"
  on public.robot_claim_codes for insert
  with check (
    created_by = (select auth.uid())
    and (robot_id is null or public.can_manage_robot(robot_id))
  );

drop policy if exists "Owners can update robot claim codes" on public.robot_claim_codes;
create policy "Owners can update robot claim codes"
  on public.robot_claim_codes for update
  using (robot_id is not null and public.can_manage_robot(robot_id))
  with check (robot_id is not null and public.can_manage_robot(robot_id));

drop policy if exists "Owners can read robot devices" on public.robot_devices;
create policy "Owners can read robot devices"
  on public.robot_devices for select
  using (public.can_access_robot(robot_id));

drop policy if exists "Owners can manage robot devices" on public.robot_devices;
create policy "Owners can manage robot devices"
  on public.robot_devices for all
  using (public.can_manage_robot(robot_id))
  with check (public.can_manage_robot(robot_id));

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

drop policy if exists "Workspace members can read robot progress" on public.robot_progress;
create policy "Workspace members can read robot progress"
  on public.robot_progress for select
  using (public.can_access_robot(robot_id));

drop policy if exists "Workspace managers can update robot progress" on public.robot_progress;
create policy "Workspace managers can update robot progress"
  on public.robot_progress for update
  using (public.can_manage_robot(robot_id))
  with check (public.can_manage_robot(robot_id));

drop policy if exists "Workspace members can read robot interests" on public.robot_interests;
create policy "Workspace members can read robot interests"
  on public.robot_interests for select
  using (public.can_access_robot(robot_id));

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
