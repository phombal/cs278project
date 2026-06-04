# Apply Photo Storage Migration

## Quick Steps

1. **Go to Supabase SQL Editor:**
   https://supabase.com/dashboard/project/mtypiwbnqfzifrdmmiqy/sql/new

2. **Copy the migration file:**
   Open: `supabase/migrations/20260604000000_add_post_photos.sql`
   Copy ALL contents (Cmd+A, Cmd+C)

3. **Paste and Run:**
   - Paste into the SQL Editor
   - Click "Run" button (or Cmd+Enter)

4. **Verify Success:**
   You should see messages like:
   - `ALTER TABLE` (adding photos column)
   - `INSERT 0 1` (creating storage bucket)
   - `CREATE POLICY` (4 times for the policies)
   - `CREATE FUNCTION` (cleanup function)
   - `CREATE TRIGGER` (cleanup trigger)

## What This Migration Does

- ✅ Adds `photos` column to `posts` table
- ✅ Creates `post-photos` storage bucket (public access)
- ✅ Sets up 4 RLS policies for secure photo access
- ✅ Adds cleanup trigger (deletes photos when post deleted)

## After Migration

1. **Test Photo Upload:**
   - Go to http://localhost:3000/submit
   - Create a post
   - Add 1-2 photos
   - Submit
   - Check if photos appear on the post page

2. **Check Server Logs:**
   Look for these console logs in your terminal:
   ```
   [createPost] Found photo keys: ...
   [createPost] Total photos to upload: ...
   [createPost] Upload complete. URLs: ...
   ```

3. **Verify Storage Bucket:**
   https://supabase.com/dashboard/project/mtypiwbnqfzifrdmmiqy/storage/buckets
   - You should see `post-photos` bucket
   - Click it to see uploaded files

## Common Issues

### "Storage bucket not found"
- Migration didn't run completely
- Re-run the migration SQL in the dashboard

### "Permission denied" on upload
- RLS policies didn't apply
- Check: Storage → post-photos → Policies
- Should have 4 policies active

### Photos upload but don't display
- Check browser console for 404 errors
- Verify bucket is set to "Public"
- Check the `photos` column in database has URLs

## Manual Bucket Creation (If Migration Fails)

If the migration fails to create the bucket, do it manually:

1. Go to: Storage → Create Bucket
2. Name: `post-photos`
3. Public: ✅ Yes
4. File size limit: 5MB
5. Allowed MIME types: `image/jpeg,image/png,image/webp,image/gif`

Then run just the policies part of the migration.
