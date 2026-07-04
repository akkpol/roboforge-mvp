create table public.lyra_usage (
  id uuid not null default gen_random_uuid() primary key,
  user_id text not null,
  -- user_id = auth uid if logged in, or device_id if anonymous
  month text not null,
  -- month = YYYY-MM format, e.g. '2026-07'
  count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_user_month unique (user_id, month)
);

alter table public.lyra_usage enable row level security;

-- Authenticated users can read their own usage
drop policy if exists "Users can read own usage" on public.lyra_usage;
create policy "Users can read own usage"
  on public.lyra_usage for select
  using (
    (select auth.uid())::text = user_id
    or user_id = 'anonymous'
  );

-- Authenticated users can insert their own usage
drop policy if exists "Users can insert own usage" on public.lyra_usage;
create policy "Users can insert own usage"
  on public.lyra_usage for insert
  to authenticated
  with check ((select auth.uid())::text = user_id);

-- Authenticated users can update their own usage
drop policy if exists "Users can update own usage" on public.lyra_usage;
create policy "Users can update own usage"
  on public.lyra_usage for update
  to authenticated
  using ((select auth.uid())::text = user_id)
  with check ((select auth.uid())::text = user_id);

-- Allow service_role to manage all rows (for upsert)
grant all on table public.lyra_usage to service_role;
