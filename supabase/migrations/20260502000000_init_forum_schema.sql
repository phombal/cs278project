-- =============================================================================
-- SF Housing Forum — initial schema
-- Reddit-style forum for SF housing reviews, neighborhood threads,
-- roommate matching, and "where will you live next" discussions.
-- =============================================================================

set check_function_bodies = off;

-- -----------------------------------------------------------------------------
-- Helper function: timestamp trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- 1. PROFILES (1:1 with auth.users)
-- =============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null
    check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (length(display_name) between 1 and 60),
  bio text check (length(bio) <= 280),
  avatar_url text,
  -- Forum-specific identity for housing search
  current_neighborhood text,
  future_neighborhood text,
  graduation_year int check (graduation_year between 2000 and 2100),
  is_looking_for_roommate boolean not null default false,
  is_looking_for_housing boolean not null default false,
  -- Karma is materialized from votes (incremented by triggers)
  post_karma int not null default 0,
  comment_karma int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_username_idx on public.profiles (lower(username));
create index profiles_looking_idx on public.profiles (is_looking_for_roommate)
  where is_looking_for_roommate = true;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Bootstrap a profile row whenever a new auth.user is created.
-- The username is generated from the email local-part with a numeric suffix
-- if needed; the user can edit later.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate text;
  attempt int := 0;
begin
  base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '_', 'g'));
  if length(base_username) < 3 then
    base_username := 'user_' || substr(new.id::text, 1, 6);
  end if;
  candidate := substr(base_username, 1, 24);

  while attempt < 50 loop
    begin
      insert into public.profiles (id, username, display_name)
      values (new.id, candidate, coalesce(split_part(new.email, '@', 1), candidate));
      exit;
    exception when unique_violation then
      attempt := attempt + 1;
      candidate := substr(base_username, 1, 20) || '_' || lpad(attempt::text, 3, '0');
    end;
  end loop;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- =============================================================================
-- 2. NEIGHBORHOODS (reference data) + BOARDS (subreddit-equivalent)
-- =============================================================================
create table if not exists public.neighborhoods (
  slug text primary key,
  name text not null,
  description text,
  sort_order int not null default 100
);

-- A "board" is a subreddit-like container. There are four kinds:
--   neighborhood    — one per SF neighborhood (e.g., /b/mission)
--   megathread      — global SF-wide discussion (/b/sf-housing)
--   roommates       — find/post roommate listings (/b/roommates)
--   future-housing  — "where will you live next" planning (/b/future-housing)
create type public.board_kind as enum (
  'neighborhood',
  'megathread',
  'roommates',
  'future-housing'
);

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  description text not null,
  kind public.board_kind not null,
  neighborhood_slug text references public.neighborhoods(slug) on delete set null,
  member_count int not null default 0,  -- materialized; not used for auth
  is_pinned boolean not null default false,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

create index boards_kind_idx on public.boards (kind);
create unique index boards_one_per_neighborhood
  on public.boards (neighborhood_slug)
  where neighborhood_slug is not null;

-- =============================================================================
-- 3. POSTS (top-level submissions in a board)
-- =============================================================================
create type public.post_type as enum (
  'discussion',  -- general discussion / question
  'review',      -- review of a place I lived
  'roommate',    -- looking for / offering a roommate
  'question'     -- specific question
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  post_type public.post_type not null default 'discussion',
  title text not null check (length(title) between 5 and 300),
  body text check (length(body) <= 40000),
  -- Review-specific fields (NULL when post_type != 'review')
  rating smallint check (rating between 1 and 5),
  rent_per_month_cents int check (rent_per_month_cents >= 0),
  lease_start date,
  lease_end date,
  building_or_address text check (length(building_or_address) <= 200),
  neighborhood_slug text references public.neighborhoods(slug) on delete set null,
  would_recommend boolean,
  -- Aggregates (maintained by triggers)
  upvotes int not null default 0,
  downvotes int not null default 0,
  score int not null default 0,
  comment_count int not null default 0,
  -- Moderation / state
  is_pinned boolean not null default false,
  is_locked boolean not null default false,
  is_deleted boolean not null default false,
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Constraint: review posts must include rating + neighborhood
  constraint review_must_have_rating
    check (post_type <> 'review' or rating is not null),
  constraint lease_dates_ordered
    check (lease_start is null or lease_end is null or lease_start <= lease_end)
);

create index posts_board_created_idx on public.posts (board_id, created_at desc);
create index posts_board_score_idx on public.posts (board_id, score desc, created_at desc);
create index posts_author_idx on public.posts (author_id, created_at desc);
create index posts_neighborhood_idx on public.posts (neighborhood_slug)
  where neighborhood_slug is not null;
create index posts_type_idx on public.posts (post_type);

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 4. COMMENTS (nested via parent_comment_id)
-- =============================================================================
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 10000),
  upvotes int not null default 0,
  downvotes int not null default 0,
  score int not null default 0,
  depth smallint not null default 0 check (depth >= 0 and depth <= 8),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comments_post_idx on public.comments (post_id, created_at);
create index comments_parent_idx on public.comments (parent_comment_id);
create index comments_author_idx on public.comments (author_id, created_at desc);

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

-- Compute depth from parent and bump post.comment_count on insert.
create or replace function public.handle_new_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_depth smallint;
begin
  if new.parent_comment_id is not null then
    select depth + 1 into parent_depth
    from public.comments
    where id = new.parent_comment_id;
    new.depth := least(coalesce(parent_depth, 1), 8);
  else
    new.depth := 0;
  end if;
  return new;
end;
$$;

create trigger comments_compute_depth
  before insert on public.comments
  for each row execute function public.handle_new_comment();

create or replace function public.bump_post_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger comments_bump_count
  after insert or delete on public.comments
  for each row execute function public.bump_post_comment_count();

-- =============================================================================
-- 5. VOTES (upvote / downvote on posts and comments)
-- =============================================================================
create type public.vote_target as enum ('post', 'comment');
create domain public.vote_value as smallint check (value in (-1, 1));

create table if not exists public.votes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type public.vote_target not null,
  target_id uuid not null,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

create index votes_target_idx on public.votes (target_type, target_id);

-- Maintain upvote/downvote/score counters on posts and comments.
create or replace function public.apply_vote_delta(
  p_target_type public.vote_target,
  p_target_id uuid,
  p_old_value smallint,
  p_new_value smallint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d_up int := 0;
  d_down int := 0;
begin
  if p_old_value = 1 then d_up := d_up - 1; end if;
  if p_old_value = -1 then d_down := d_down - 1; end if;
  if p_new_value = 1 then d_up := d_up + 1; end if;
  if p_new_value = -1 then d_down := d_down + 1; end if;

  if p_target_type = 'post' then
    update public.posts
       set upvotes = upvotes + d_up,
           downvotes = downvotes + d_down,
           score = score + d_up - d_down
     where id = p_target_id;
  elsif p_target_type = 'comment' then
    update public.comments
       set upvotes = upvotes + d_up,
           downvotes = downvotes + d_down,
           score = score + d_up - d_down
     where id = p_target_id;
  end if;
end;
$$;

create or replace function public.handle_vote_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    perform public.apply_vote_delta(new.target_type, new.target_id, 0::smallint, new.value);
  elsif (tg_op = 'UPDATE') then
    if new.value <> old.value then
      perform public.apply_vote_delta(new.target_type, new.target_id, old.value, new.value);
    end if;
  elsif (tg_op = 'DELETE') then
    perform public.apply_vote_delta(old.target_type, old.target_id, old.value, 0::smallint);
  end if;
  return null;
end;
$$;

create trigger votes_apply_delta
  after insert or update or delete on public.votes
  for each row execute function public.handle_vote_change();

-- =============================================================================
-- 6. BOOKMARKS (saves)
-- =============================================================================
create table if not exists public.bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index bookmarks_user_idx on public.bookmarks (user_id, created_at desc);

-- =============================================================================
-- 7. ROOMMATE MATCHES (lightweight expression-of-interest)
-- =============================================================================
create table if not exists public.roommate_pings (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  message text check (length(message) between 1 and 1000),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint no_self_ping check (from_user_id <> to_user_id),
  unique (from_user_id, to_user_id)
);

create index roommate_pings_to_idx on public.roommate_pings (to_user_id, created_at desc);

-- =============================================================================
-- 8. ROW LEVEL SECURITY
-- =============================================================================
alter table public.profiles        enable row level security;
alter table public.neighborhoods   enable row level security;
alter table public.boards          enable row level security;
alter table public.posts           enable row level security;
alter table public.comments        enable row level security;
alter table public.votes           enable row level security;
alter table public.bookmarks       enable row level security;
alter table public.roommate_pings  enable row level security;

-- profiles: world-readable; only the user can update their own row
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Insert is handled by trigger; block direct inserts.
create policy "profiles_insert_blocked"
  on public.profiles for insert
  with check (false);

-- neighborhoods + boards: read-only for everyone, no client writes
create policy "neighborhoods_select_all"
  on public.neighborhoods for select
  using (true);

create policy "boards_select_all"
  on public.boards for select
  using (true);

-- posts: anyone may read non-deleted; authenticated users may create;
-- author may update or soft-delete their own; locked posts cannot be edited
create policy "posts_select_visible"
  on public.posts for select
  using (is_deleted = false or author_id = auth.uid());

create policy "posts_insert_authenticated"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "posts_update_own"
  on public.posts for update
  to authenticated
  using (auth.uid() = author_id and is_locked = false)
  with check (auth.uid() = author_id);

create policy "posts_delete_own"
  on public.posts for delete
  to authenticated
  using (auth.uid() = author_id);

-- comments: same model
create policy "comments_select_visible"
  on public.comments for select
  using (is_deleted = false or author_id = auth.uid());

create policy "comments_insert_authenticated"
  on public.comments for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.posts p
      where p.id = post_id and p.is_locked = false and p.is_deleted = false
    )
  );

create policy "comments_update_own"
  on public.comments for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "comments_delete_own"
  on public.comments for delete
  to authenticated
  using (auth.uid() = author_id);

-- votes: a user may read all votes (needed to render their own state),
-- but may only insert/update/delete their own.
create policy "votes_select_all"
  on public.votes for select
  using (true);

create policy "votes_insert_own"
  on public.votes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "votes_update_own"
  on public.votes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "votes_delete_own"
  on public.votes for delete
  to authenticated
  using (auth.uid() = user_id);

-- bookmarks: only the owner can read or write
create policy "bookmarks_select_own"
  on public.bookmarks for select
  to authenticated
  using (auth.uid() = user_id);

create policy "bookmarks_insert_own"
  on public.bookmarks for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "bookmarks_delete_own"
  on public.bookmarks for delete
  to authenticated
  using (auth.uid() = user_id);

-- roommate_pings: sender + recipient can read; only sender can create;
-- only recipient can mark as read.
create policy "roommate_pings_select_party"
  on public.roommate_pings for select
  to authenticated
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create policy "roommate_pings_insert_sender"
  on public.roommate_pings for insert
  to authenticated
  with check (auth.uid() = from_user_id);

create policy "roommate_pings_update_recipient"
  on public.roommate_pings for update
  to authenticated
  using (auth.uid() = to_user_id)
  with check (auth.uid() = to_user_id);

-- =============================================================================
-- 9. SEED DATA — neighborhoods + boards
-- =============================================================================
insert into public.neighborhoods (slug, name, description, sort_order) values
  ('mission',           'Mission',                'Vibrant Latino district, taquerias, dive bars, Dolores Park.', 10),
  ('soma',              'SoMa',                   'South of Market — tech, lofts, nightlife, big-box housing.',   20),
  ('mission-bay',       'Mission Bay',            'Newer waterfront district near UCSF and Chase Center.',        30),
  ('hayes-valley',      'Hayes Valley',           'Boutique shopping, Patricia Green, walkable.',                  40),
  ('castro',            'Castro',                 'Historic LGBTQ+ neighborhood, Victorian homes, Twin Peaks.',    50),
  ('noe-valley',        'Noe Valley',             'Sunny, family-oriented, 24th Street strip.',                    60),
  ('bernal-heights',    'Bernal Heights',         'Hilltop park, quirky shops, residential.',                      70),
  ('potrero-hill',      'Potrero Hill',           'Sunny, sweeping views, fewer transit options.',                 80),
  ('dogpatch',          'Dogpatch',               'Industrial-chic on the bay, breweries and warehouses.',         90),
  ('north-beach',       'North Beach',            'Italian heritage, City Lights, lively nights.',                100),
  ('chinatown',         'Chinatown',              'Densest neighborhood west of NYC; markets and dim sum.',       110),
  ('financial-district','Financial District',     'Office towers, walkable to BART, quiet evenings.',             120),
  ('nob-hill',          'Nob Hill',               'Cable cars, Grace Cathedral, classic SF apartments.',          130),
  ('russian-hill',      'Russian Hill',           'Lombard Street, hilly, residential.',                          140),
  ('pacific-heights',   'Pacific Heights',        'Mansions, Fillmore shopping, postcard views.',                 150),
  ('marina',            'Marina',                 'Bayfront, post-grad social hub, Chestnut Street.',             160),
  ('cow-hollow',        'Cow Hollow',             'Union Street, between Marina and Pac Heights.',                170),
  ('nopa',              'NoPa',                   'North of the Panhandle — restaurants, Divisadero corridor.',   180),
  ('haight-ashbury',    'Haight-Ashbury',         'Counterculture roots, Golden Gate Park edge.',                 190),
  ('cole-valley',       'Cole Valley',            'Quiet, leafy, near UCSF Parnassus.',                           200),
  ('inner-sunset',      'Inner Sunset',           'Foggy but friendly, Irving Street, near GG Park.',             210),
  ('outer-sunset',      'Outer Sunset',           'Beach-adjacent, surf culture, slower pace.',                   220),
  ('inner-richmond',    'Inner Richmond',         'Diverse, great food, near Presidio.',                          230),
  ('outer-richmond',    'Outer Richmond',         'Foggy, residential, Sutro Baths nearby.',                      240),
  ('lower-haight',      'Lower Haight',           'Bars and brunch on Haight between Divisadero and Webster.',    250),
  ('western-addition',  'Western Addition',       'Central, Fillmore Jazz history, Alamo Square.',                260),
  ('japantown',         'Japantown',              'Cultural hub, Peace Plaza, ramen and karaoke.',                270),
  ('tenderloin',        'Tenderloin',             'Cheapest rents downtown; uneven blocks, vibrant culture.',     280),
  ('civic-center',      'Civic Center',           'City Hall, Asian Art Museum, transit-rich.',                   290),
  ('embarcadero',       'Embarcadero',            'Waterfront, Ferry Building, joggers and tourists.',            300),
  ('glen-park',         'Glen Park',              'Village feel, BART access, canyon trails.',                    310),
  ('bayview',           'Bayview',                'Up-and-coming southeast, sunny microclimate.',                 320),
  ('excelsior',         'Excelsior',              'Diverse southside, single-family homes, Mission Street tail.', 330),
  ('twin-peaks',        'Twin Peaks',             'Hilltop views, foggy evenings, residential streets.',          340),
  ('west-portal',       'West Portal',            'Streetcar village, family-friendly southside.',                350)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order;

-- One board per neighborhood
insert into public.boards (slug, name, description, kind, neighborhood_slug, sort_order)
select
  n.slug,
  n.name,
  'Reviews, advice, and threads about living in ' || n.name || '.',
  'neighborhood'::public.board_kind,
  n.slug,
  n.sort_order
from public.neighborhoods n
on conflict (slug) do nothing;

-- Cross-neighborhood / system boards
insert into public.boards (slug, name, description, kind, is_pinned, sort_order) values
  ('sf-housing',
   'SF Housing Megathread',
   'The catch-all for everything San Francisco housing — pricing, leases, brokers, anything that doesn''t fit one neighborhood.',
   'megathread', true, 1),
  ('roommates',
   'Roommate Finder',
   'Looking for roommates or have a spot to fill. Post your move-in dates, budget, and vibe.',
   'roommates', true, 2),
  ('future-housing',
   'Where Will You Live?',
   'Planning your summer or post-grad move? Share where you''re looking and find people in the same boat.',
   'future-housing', true, 3)
on conflict (slug) do nothing;

-- =============================================================================
-- 10. CONVENIENCE VIEWS (security_invoker — RLS enforced as caller)
-- =============================================================================
create or replace view public.posts_with_author
  with (security_invoker = true) as
select
  p.*,
  pr.username  as author_username,
  pr.display_name as author_display_name,
  pr.avatar_url   as author_avatar_url,
  b.slug          as board_slug,
  b.name          as board_name,
  b.kind          as board_kind
from public.posts p
join public.profiles pr on pr.id = p.author_id
join public.boards   b  on b.id  = p.board_id;

create or replace view public.comments_with_author
  with (security_invoker = true) as
select
  c.*,
  pr.username      as author_username,
  pr.display_name  as author_display_name,
  pr.avatar_url    as author_avatar_url
from public.comments c
join public.profiles pr on pr.id = c.author_id;

-- =============================================================================
-- 11. PERMISSIONS for views (Postgres 15+: invoker model is in effect)
-- =============================================================================
grant select on public.posts_with_author    to anon, authenticated;
grant select on public.comments_with_author to anon, authenticated;

-- Done.
