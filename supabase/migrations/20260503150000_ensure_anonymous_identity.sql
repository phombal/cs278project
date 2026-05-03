-- Ensure every profile has an anonymous_handle and views expose author_anonymous_handle.
-- Idempotent: safe if 20260502120000 already applied fully.

set check_function_bodies = off;

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

update public.profiles
set anonymous_handle = public.generate_anonymous_handle()
where anonymous_handle is null or length(trim(anonymous_handle)) = 0;

do $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.anonymous_handle is null or length(trim(p.anonymous_handle)) = 0
  ) then
    execute 'alter table public.profiles alter column anonymous_handle set not null';
  end if;
end $$;

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

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
