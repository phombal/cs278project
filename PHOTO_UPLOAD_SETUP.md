# Photo Upload Feature - Setup Guide

## Overview

This guide explains how to set up photo uploads for posts using Supabase Storage. The implementation includes:

- ✅ Database migration to add `photos` column to posts
- ✅ Supabase Storage bucket configuration with RLS policies
- ✅ Photo upload UI component with preview
- ✅ Server-side photo upload handling
- ✅ Photo gallery display with lightbox
- ✅ Automatic cleanup when posts are deleted

## Quick Start

### 1. Apply the Database Migration

Run the new migration to add photo support:

```bash
cd /Users/prathamhombal/cs278project
npx supabase db push
```

This will:
- Add a `photos` column (text array) to the `posts` table
- Create a `post-photos` storage bucket (public)
- Set up Row Level Security (RLS) policies for photo uploads
- Add a trigger to clean up storage when posts are deleted

### 2. Verify Storage Bucket

Check that the storage bucket was created:

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/mtypiwbnqfzifrdmmiqy
2. Navigate to **Storage** → **Buckets**
3. You should see a bucket named `post-photos` with **Public** access

### 3. Test the Feature Locally

```bash
npm run dev
```

Then:
1. Navigate to http://localhost:3000/submit
2. Fill out a post
3. Click "Add Photos" and select up to 5 images
4. Submit the post
5. View the post to see the photo gallery

## Architecture

### Storage Structure

Photos are stored in Supabase Storage with this path structure:

```
post-photos/
  └── {user_id}/
      └── {timestamp}_{random}_{filename}.{ext}
```

Example: `post-photos/a1b2c3.../1715123456789_x8k2p9_apartment-living-room.jpg`

### RLS Policies

The migration sets up these Row Level Security policies:

1. **Public Read**: Anyone can view photos (public bucket)
2. **Authenticated Upload**: Only logged-in users can upload
3. **User Update**: Users can only update their own photos
4. **User Delete**: Users can only delete their own photos

Path enforcement ensures users can only upload to `{their_user_id}/...`

### Database Schema

```sql
-- Added to posts table
photos text[] default '{}'
```

This stores an array of full Supabase Storage URLs like:
```
['https://mtypiwbnqfzifrdmmiqy.supabase.co/storage/v1/object/public/post-photos/...']
```

## File Structure

### New Files

```
src/
  lib/
    storage/
      photos.ts                    # Photo upload utilities
  components/
    ui/
      photo-upload.tsx             # Upload UI with drag-and-drop
    post/
      photo-gallery.tsx            # Display gallery with lightbox
supabase/
  migrations/
    20260604000000_add_post_photos.sql  # Migration
```

### Modified Files

```
src/
  app/
    actions/
      posts.ts                     # Added photo handling in createPost()
    submit/
      submit-form.tsx              # Added PhotoUpload component
    p/
      [id]/
        page.tsx                   # Added PhotoGallery display
  types/
    database.ts                    # Added photos: string[] | null
```

## Configuration

### File Constraints

Defined in `src/lib/storage/photos.ts`:

```typescript
MAX_FILE_SIZE = 5MB
ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
MAX_PHOTOS_PER_POST = 5
```

### Client-Side Validation

The `PhotoUpload` component validates:
- File type (images only)
- File size (max 5MB per photo)
- Total count (max 5 photos per post)

### Server-Side Upload

The `uploadPhotosServer()` function:
- Re-validates all constraints
- Generates unique storage paths
- Uploads to Supabase Storage
- Returns public URLs
- Continues post creation even if some photos fail

## Usage Examples

### In Your Code

```typescript
// Upload photos (server-side)
import { uploadPhotosServer } from '@/lib/storage/photos';

const { urls, errors } = await uploadPhotosServer(files, userId);
// urls: string[] of successfully uploaded photo URLs
// errors: { error: string; file?: string }[] of failures

// Delete photos
import { deletePhotos } from '@/lib/storage/photos';

await deletePhotos(['user_id/timestamp_random_file.jpg']);
```

### Adding Photos to Other Post Types

Photos are available for all post types (discussion, review, roommate, question). The UI automatically appears in the submit form after the body textarea.

## Security

### Authentication

- Users must be authenticated to upload photos
- Anonymous browsing can view photos (public bucket)

### Path-Based Security

RLS policies enforce that users can only upload to their own folder:
```sql
(storage.foldername(name))[1] = auth.uid()::text
```

This prevents users from:
- Uploading to other users' folders
- Deleting other users' photos
- Overwriting existing files

### Automatic Cleanup

When a post is deleted, a database trigger automatically:
1. Extracts photo paths from the `photos` array
2. Calls `storage.delete_object()` for each file
3. Removes the files from Supabase Storage

This prevents orphaned files and manages storage costs.

## Troubleshooting

### Photos Not Uploading

1. **Check Storage Bucket Exists**
   ```bash
   npx supabase storage list
   ```

2. **Verify RLS Policies**
   - Go to Supabase Dashboard → Storage → post-photos → Policies
   - Ensure all 4 policies are active

3. **Check User Authentication**
   - Uploads require a logged-in user
   - Check browser console for auth errors

4. **File Size Issues**
   - Default limit is 5MB per file
   - Check browser network tab for upload failures

### Photos Not Displaying

1. **Check Database Column**
   ```sql
   SELECT photos FROM posts WHERE id = 'your-post-id';
   ```

2. **Verify URLs**
   - URLs should start with your Supabase project URL
   - Format: `https://mtypiwbnqfzifrdmmiqy.supabase.co/storage/v1/object/public/post-photos/...`

3. **Public Access**
   - Bucket must be set to **Public**
   - Check Storage settings in Supabase Dashboard

### Migration Conflicts

If you get migration conflicts:

```bash
# Reset local database
npx supabase db reset

# Or apply manually via SQL editor in Supabase Dashboard
```

## Performance Considerations

### Image Optimization

Consider adding:
- Client-side image compression before upload
- Automatic thumbnail generation
- WebP conversion for smaller file sizes

Example optimization library:
```bash
npm install browser-image-compression
```

### Storage Costs

Supabase Free Tier includes:
- 1GB storage
- 2GB bandwidth/month

Monitor usage at: https://supabase.com/dashboard/project/mtypiwbnqfzifrdmmiqy/settings/billing

### Lazy Loading

The PhotoGallery component uses native lazy loading:
```tsx
<img loading="lazy" ... />
```

Consider adding:
- Blur-up placeholders
- Progressive image loading
- CDN caching headers

## Future Enhancements

Potential improvements:
- [ ] Client-side image compression
- [ ] Drag-and-drop upload
- [ ] Crop/rotate editor
- [ ] EXIF data stripping (privacy)
- [ ] Automatic thumbnail generation
- [ ] Image CDN integration
- [ ] Video upload support
- [ ] Progress bars for large uploads

## Support

For issues:
1. Check Supabase Storage logs in the Dashboard
2. Review browser console for errors
3. Verify migration was applied: `npx supabase db diff`
4. Check RLS policies are enabled

## Resources

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Storage RLS Policies](https://supabase.com/docs/guides/storage/security/access-control)
- [Next.js File Uploads](https://nextjs.org/docs/app/building-your-application/routing/route-handlers#formdata)
