
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;
create policy "owners manage projects" on public.projects for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.creative_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  name text not null,
  tags text[] not null default '{}',
  input jsonb not null,
  package jsonb not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.creative_records to authenticated;
grant all on public.creative_records to service_role;
alter table public.creative_records enable row level security;
create policy "owners manage records" on public.creative_records for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index creative_records_user_project_idx on public.creative_records(user_id, project_id, created_at desc);
