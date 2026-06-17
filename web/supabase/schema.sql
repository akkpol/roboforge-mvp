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
