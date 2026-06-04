-- Public location labels for reviews (street + city, no street number).

alter table public.posts
  add column if not exists location_label_public text;

comment on column public.posts.location_label_public is
  'Anonymized location shown publicly: street name + city, no unit or street number.';

-- Backfill from legacy full addresses (best-effort strip leading numbers).
update public.posts
set location_label_public = trim(
  regexp_replace(
    coalesce(
      nullif(split_part(coalesce(address_formatted, building_or_address, ''), ',', 1), ''),
      ''
    ),
    '^\d+[\w/-]*\s*',
    '',
    'g'
  )
  || case
    when coalesce(address_formatted, building_or_address, '') ~ ','
    then ', ' || trim(split_part(coalesce(address_formatted, building_or_address, ''), ',', 2))
    else ''
  end
)
where post_type = 'review'
  and location_label_public is null
  and coalesce(address_formatted, building_or_address, '') <> '';

-- Clear precise / full-address fields on existing reviews.
update public.posts
set
  address_formatted = null,
  building_or_address = null,
  latitude = null,
  longitude = null
where post_type = 'review';

drop view if exists public.posts_with_author cascade;

create view public.posts_with_author
  with (security_invoker = true) as
select
  p.*,
  pr.username as author_username,
  pr.anonymous_handle as author_anonymous_handle,
  pr.display_name as author_display_name,
  pr.avatar_url as author_avatar_url,
  b.slug as board_slug,
  b.name as board_name,
  b.kind as board_kind
from public.posts p
join public.profiles pr on pr.id = p.author_id
join public.boards b on b.id = p.board_id;

grant select on public.posts_with_author to anon, authenticated;
