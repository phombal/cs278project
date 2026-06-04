-- =============================================================================
-- Add photo support to posts
-- =============================================================================

-- Add photos column to posts table (array of storage URLs)
alter table public.posts
  add column if not exists photos text[] default '{}';

comment on column public.posts.photos is 'Array of Supabase Storage URLs for post images';

-- =============================================================================
-- Create storage bucket for post photos
-- =============================================================================

-- Insert the bucket (if it doesn't exist)
insert into storage.buckets (id, name, public)
values ('post-photos', 'post-photos', true)
on conflict (id) do nothing;

-- =============================================================================
-- Storage policies for post-photos bucket
-- =============================================================================

-- Drop existing policies if they exist (for idempotency)
drop policy if exists "Public photo access" on storage.objects;
drop policy if exists "Authenticated users can upload photos" on storage.objects;
drop policy if exists "Users can update own photos" on storage.objects;
drop policy if exists "Users can delete own photos" on storage.objects;

-- Policy 1: Anyone can view photos (public bucket)
create policy "Public photo access"
  on storage.objects for select
  using (bucket_id = 'post-photos');

-- Policy 2: Authenticated users can upload photos
create policy "Authenticated users can upload photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-photos' and
    -- Enforce path structure: user_id/post_id/filename
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 3: Users can update their own photos
create policy "Users can update own photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'post-photos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 4: Users can delete their own photos
create policy "Users can delete own photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'post-photos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- Helper function to clean up storage when a post is deleted
-- =============================================================================

create or replace function public.delete_post_photos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  photo_url text;
  photo_path text;
begin
  -- Extract storage paths from URLs and delete each file
  if old.photos is not null and array_length(old.photos, 1) > 0 then
    foreach photo_url in array old.photos loop
      -- Extract path from URL (format: https://PROJECT.supabase.co/storage/v1/object/public/post-photos/PATH)
      photo_path := regexp_replace(photo_url, '^.*/post-photos/', '');
      
      -- Delete from storage
      -- Note: This uses the storage extension's delete function
      begin
        perform storage.delete_object('post-photos', photo_path);
      exception
        when others then
          -- Log error but don't fail the deletion
          raise warning 'Failed to delete photo %: %', photo_path, sqlerrm;
      end;
    end loop;
  end if;
  
  return old;
end;
$$;

-- Trigger to clean up photos when post is deleted
drop trigger if exists delete_post_photos_trigger on public.posts;
create trigger delete_post_photos_trigger
  before delete on public.posts
  for each row
  execute function public.delete_post_photos();  

-- =============================================================================
-- Recreate posts_with_author view to include photos column
-- =============================================================================

-- Drop and recreate the view to pick up the new photos column
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
