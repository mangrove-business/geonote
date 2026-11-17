-- Keep notes discoverable at every zoom level.
-- MapLibre clustering handles dense world views, while the note scope still
-- controls the zoom used when opening a note.
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
    and n.geom && st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)
  order by n.created_at desc
  limit 2000;
$$;

grant execute on function public.notes_in_view(
  double precision, double precision, double precision, double precision, double precision
) to anon, authenticated;
