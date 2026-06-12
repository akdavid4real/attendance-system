-- Run this in the Supabase SQL editor after creating your project.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  selfie_path text not null,
  latitude double precision not null,
  longitude double precision not null,
  location_name text,
  checked_in_at timestamptz not null default now()
);

create unique index if not exists attendance_records_user_id_lagos_day_key
on public.attendance_records (
  user_id,
  ((checked_in_at at time zone 'Africa/Lagos')::date)
);

alter table public.attendance_records enable row level security;

create policy "Users can read their own attendance"
on public.attendance_records
for select
to authenticated
using (auth.uid() = user_id);

create policy "Admins can read all attendance"
on public.attendance_records
for select
to authenticated
using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "Admins can delete attendance"
on public.attendance_records
for delete
to authenticated
using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

insert into storage.buckets (id, name, public)
values ('attendance-selfies', 'attendance-selfies', false)
on conflict (id) do nothing;

create policy "Users can read their own selfie files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'attendance-selfies'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Admins can read all selfie files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'attendance-selfies'
  and (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

create policy "Admins can delete selfie files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'attendance-selfies'
  and (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
