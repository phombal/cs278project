-- Housing reviews expansion: anonymous handles, structured reviews, helpful votes.

set check_function_bodies = off;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'lease_type') then
    create type public.lease_type as enum ('short_term', 'long_term');
  end if;
end $$;

alter table public.profiles
  add column if not exists anonymous_handle text;

create unique index if not exists profiles_anonymous_handle_unique
  on public.profiles (anonymous_handle)
  where anonymous_handle is not null;

create or replace function public.generate_anonymous_handle()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  adjectives text[] := array[
    'Blue','Calm','Swift','Bright','Bold','Quiet','Keen','Sharp','Warm','Cool',
    'Wise','Fast','Kind','Rare','Wild','Soft','Deep','Tall','Dark','Fair',
    'Glad','Free','Pure','Fine','True','Deft','Firm','Neat','Rich','Slim'
  ];
  animals text[] := array[
    'Fox','Otter','Hawk','Bear','Wolf','Deer','Lynx','Seal','Crow','Dove',
    'Wren','Frog','Newt','Mole','Vole','Hare','Kite','Ibis','Coot','Teal',
    'Pika','Dace','Rudd','Chub','Bream','Roach','Trout','Perch','Brill','Orca'
  ];
  candidate text;
  i int;
  adj_idx int;
  an_idx int;
begin
  for i in 1..400 loop
    adj_idx := 1 + floor(random() * array_length(adjectives, 1))::int;
    an_idx := 1 + floor(random() * array_length(animals, 1))::int;
    candidate := adjectives[adj_idx] || animals[an_idx]
      || lpad((10 + floor(random() * 90))::int::text, 2, '0');
    exit when not exists (
      select 1 from public.profiles p where p.anonymous_handle = candidate
    );
  end loop;
  if candidate is null then
    candidate := 'User' || substr(md5(random()::text), 1, 8);
  end if;
  return candidate;
end;
$$;

do $$
declare
  r record;
begin
  for r in select id from public.profiles where anonymous_handle is null loop
    update public.profiles
      set anonymous_handle = public.generate_anonymous_handle()
      where id = r.id;
  end loop;
end $$;

alter table public.profiles
  alter column anonymous_handle set not null;

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
      insert into public.profiles (id, username, display_name, anonymous_handle)
      values (
        new.id,
        candidate,
        coalesce(split_part(new.email, '@', 1), candidate),
        public.generate_anonymous_handle()
      );
      exit;
    exception when unique_violation then
      attempt := attempt + 1;
      candidate := substr(base_username, 1, 20) || '_' || lpad(attempt::text, 3, '0');
    end;
  end loop;

  return new;
end;
$$;

alter table public.posts drop constraint if exists review_must_have_rating;

alter table public.posts
  add column if not exists google_place_id text,
  add column if not exists address_formatted text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists rating_landlord smallint,
  add column if not exists rating_noise smallint,
  add column if not exists rating_safety smallint,
  add column if not exists rating_value smallint,
  add column if not exists rating_commute smallint,
  add column if not exists rating_overall numeric(3, 2),
  add column if not exists lease_type public.lease_type,
  add column if not exists furnished boolean,
  add column if not exists affiliation text,
  add column if not exists helpful_count int not null default 0;

update public.posts
set
  rating_landlord = coalesce(rating_landlord, rating),
  rating_noise = coalesce(rating_noise, rating),
  rating_safety = coalesce(rating_safety, rating),
  rating_value = coalesce(rating_value, rating),
  rating_commute = coalesce(rating_commute, rating),
  rating_overall = coalesce(
    rating_overall,
    case when rating is not null then round(rating::numeric, 2) end
  ),
  lease_type = coalesce(lease_type, 'long_term'::public.lease_type),
  furnished = coalesce(furnished, false),
  address_formatted = coalesce(address_formatted, building_or_address)
where post_type = 'review';

alter table public.posts drop constraint if exists posts_review_dimensions;

alter table public.posts
  add constraint posts_review_dimensions check (
    post_type <> 'review'
    or (
      rating_landlord between 1 and 5
      and rating_noise between 1 and 5
      and rating_safety between 1 and 5
      and rating_value between 1 and 5
      and rating_commute between 1 and 5
      and rating_overall is not null
      and lease_type is not null
      and furnished is not null
    )
  );

alter table public.posts add constraint posts_affiliation_len
  check (affiliation is null or length(affiliation) <= 40);

create index if not exists posts_google_place_idx
  on public.posts (google_place_id)
  where google_place_id is not null and post_type = 'review';

create table if not exists public.review_helpful_votes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists review_helpful_votes_post_idx
  on public.review_helpful_votes (post_id);

drop trigger if exists review_helpful_validate_trg on public.review_helpful_votes;

create or replace function public.review_helpful_validate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pa record;
begin
  select p.post_type, p.is_deleted, p.author_id
    into pa
    from public.posts p
   where p.id = new.post_id;

  if pa.post_type is distinct from 'review'::public.post_type then
    raise exception 'Helpful votes are only for review posts';
  end if;
  if pa.is_deleted then
    raise exception 'Cannot vote on deleted post';
  end if;
  if pa.author_id = new.user_id then
    raise exception 'Cannot mark your own review as helpful';
  end if;
  return new;
end;
$$;

create trigger review_helpful_validate_trg
  before insert on public.review_helpful_votes
  for each row execute function public.review_helpful_validate();

drop trigger if exists review_helpful_count_ins on public.review_helpful_votes;
drop trigger if exists review_helpful_count_del on public.review_helpful_votes;

create or replace function public.review_helpful_count_delta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts
       set helpful_count = helpful_count + 1
     where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts
       set helpful_count = greatest(helpful_count - 1, 0)
     where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger review_helpful_count_ins
  after insert on public.review_helpful_votes
  for each row execute function public.review_helpful_count_delta();

create trigger review_helpful_count_del
  after delete on public.review_helpful_votes
  for each row execute function public.review_helpful_count_delta();

alter table public.review_helpful_votes enable row level security;

drop policy if exists "review_helpful_select_all" on public.review_helpful_votes;
drop policy if exists "review_helpful_insert_own" on public.review_helpful_votes;
drop policy if exists "review_helpful_delete_own" on public.review_helpful_votes;

create policy "review_helpful_select_all"
  on public.review_helpful_votes for select
  using (true);

create policy "review_helpful_insert_own"
  on public.review_helpful_votes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "review_helpful_delete_own"
  on public.review_helpful_votes for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on public.review_helpful_votes to authenticated;
grant select on public.review_helpful_votes to anon;

-- Replacing a view whose definition uses p.* fails when posts gained columns:
-- PG cannot match old column ordinals. Drop and recreate.
drop view if exists public.posts_with_author cascade;
drop view if exists public.comments_with_author cascade;

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

create view public.comments_with_author
  with (security_invoker = true) as
select
  c.*,
  pr.username as author_username,
  pr.anonymous_handle as author_anonymous_handle,
  pr.display_name as author_display_name,
  pr.avatar_url as author_avatar_url
from public.comments c
join public.profiles pr on pr.id = c.author_id;

grant select on public.posts_with_author to anon, authenticated;
grant select on public.comments_with_author to anon, authenticated;
