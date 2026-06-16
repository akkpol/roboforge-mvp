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
