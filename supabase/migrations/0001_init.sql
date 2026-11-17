-- GeoNote MVP schema (Supabase / Postgres)

create extension if not exists postgis;

-- ---------------------------------------------------------------------------
-- notes
-- ---------------------------------------------------------------------------
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 280),
  color text not null default 'yellow'
    check (color in ('yellow', 'peach', 'green', 'blue', 'pink')),
  scope text not null default 'spot'
    check (scope in ('spot', 'street', 'area')),
  lat double precision not null check (lat between -85.0511 and 85.0511),
  lng double precision not null check (lng between -180 and 180),
  place_name text check (char_length(place_name) between 1 and 120),
  place_kind text check (char_length(place_kind) between 1 and 40),
  status text not null default 'visible'
    check (status in ('visible', 'hidden')),
  created_at timestamptz not null default now(),
  geom geometry(point, 4326) generated always as (
    st_setsrid(st_makepoint(lng, lat), 4326)
  ) stored
);

create index notes_geom_gist on public.notes using gist (geom);
create index notes_author_created_idx on public.notes (author_id, created_at desc);

alter table public.notes enable row level security;

create policy notes_read_public
  on public.notes for select
  to anon, authenticated
  using (status = 'visible');

create policy notes_insert_own
  on public.notes for insert
  to authenticated
  with check (author_id = auth.uid());

create policy notes_delete_own
  on public.notes for delete
  to authenticated
  using (author_id = auth.uid());

-- No UPDATE policy: notes are immutable. Moderation uses the service role.

grant select on public.notes to anon, authenticated;
grant insert, delete on public.notes to authenticated;
revoke update on public.notes from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Force server-controlled fields + per-user rate limit
-- ---------------------------------------------------------------------------
create or replace function public.prepare_note()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  recent_count int;
begin
  -- The server decides these, no matter what the client sent.
  new.id := gen_random_uuid();
  new.author_id := auth.uid();
  new.created_at := now();
  new.status := 'visible';
  new.body := btrim(new.body);

  if new.author_id is null then
    raise exception 'Not authenticated';
  end if;

  if new.body = '' then
    raise exception 'Note body is empty';
  end if;

  -- 20 notes per user per hour. Cheap and good enough for MVP.
  select count(*) into recent_count
  from public.notes
  where author_id = new.author_id
    and created_at > now() - interval '1 hour';

  if recent_count >= 20 then
    raise exception 'Too many notes, try again later';
  end if;

  return new;
end;
$$;

revoke all on function public.prepare_note() from public;

create trigger prepare_note_before_insert
before insert on public.notes
for each row execute function public.prepare_note();

-- ---------------------------------------------------------------------------
-- Viewport query: only return notes appropriate for the current zoom
-- ---------------------------------------------------------------------------
create or replace function public.notes_in_view(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  view_zoom double precision
)
returns table (
  id uuid,
  body text,
  color text,
  scope text,
  lat double precision,
  lng double precision,
  place_name text,
  place_kind text,
  created_at timestamptz,
  is_mine boolean
)
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  select
    n.id,
    n.body,
    n.color,
    n.scope,
    n.lat,
    n.lng,
    n.place_name,
    n.place_kind,
    n.created_at,
    coalesce(n.author_id = auth.uid(), false) as is_mine
  from public.notes n
  where n.status = 'visible'
    and (
      n.scope = 'area'
      or (n.scope = 'street' and view_zoom >= 11)
      or (n.scope = 'spot' and view_zoom >= 14)
    )
    and n.geom && st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)
  order by n.created_at desc
  limit 2000;
$$;

grant execute on function public.notes_in_view(
  double precision, double precision, double precision, double precision, double precision
) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Single note (deep links)
-- ---------------------------------------------------------------------------
create or replace function public.note_by_id(note_id uuid)
returns table (
  id uuid,
  body text,
  color text,
  scope text,
  lat double precision,
  lng double precision,
  place_name text,
  place_kind text,
  created_at timestamptz,
  is_mine boolean
)
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  select
    n.id,
    n.body,
    n.color,
    n.scope,
    n.lat,
    n.lng,
    n.place_name,
    n.place_kind,
    n.created_at,
    coalesce(n.author_id = auth.uid(), false) as is_mine
  from public.notes n
  where n.id = note_id
    and n.status = 'visible'
  limit 1;
$$;

grant execute on function public.note_by_id(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reports + auto-hide
-- ---------------------------------------------------------------------------
create table public.note_reports (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  reporter_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  reason text not null default 'other'
    check (reason in ('spam', 'abuse', 'other')),
  created_at timestamptz not null default now(),
  unique (note_id, reporter_id)
);

alter table public.note_reports enable row level security;

create policy reports_insert_own
  on public.note_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

-- No SELECT policy: clients never read reports. Moderation uses the dashboard.

grant insert on public.note_reports to authenticated;

create or replace function public.autohide_reported_note()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  report_count int;
begin
  select count(*) into report_count
  from public.note_reports
  where note_id = new.note_id;

  if report_count >= 5 then
    update public.notes
    set status = 'hidden'
    where id = new.note_id
      and status = 'visible';
  end if;

  return new;
end;
$$;

revoke all on function public.autohide_reported_note() from public;

create trigger autohide_reported_note_after_insert
after insert on public.note_reports
for each row execute function public.autohide_reported_note();

-- ---------------------------------------------------------------------------
-- Realtime (optional but cheap)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.notes;
