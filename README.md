# SF Housing Forum

Reddit-style forum for finding housing in San Francisco — neighborhood reviews,
roommate threads, and where-to-live planning for students and post-grads.

Built with Next.js (App Router) + TypeScript + Tailwind v4 + Supabase. Visual
language follows the design system in `.cursorrules` (Stripe-inspired: light
weights, sharp corners, one violet for action, poppy gradients in hero only).

## Stack

- **Frontend:** Next.js 16 (App Router, Server Components, Server Actions)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v4 + design tokens in `src/app/globals.css`
- **Backend / DB:** Supabase (Postgres, Auth, RLS) — `@supabase/ssr`
- **Icons:** Lucide
- **Fonts:** Inter via `next/font/google` (weights 300/400/500)

## Getting started

```bash
# 1. Install
npm install

# 2. Environment
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_ANON_KEY (publishable key from Supabase Dashboard)

# 3. Apply database schema
# Either via the MCP server (recommended) or paste
# supabase/migrations/20260502000000_init_forum_schema.sql into the
# Supabase SQL editor and run it.

# 4. Run
npm run dev
```

Open http://localhost:3000.

## Database

The schema lives in `supabase/migrations/20260502000000_init_forum_schema.sql`.

Tables:

- `profiles` — 1:1 with `auth.users`, auto-created on signup
- `neighborhoods` — reference data, all SF neighborhoods seeded
- `boards` — subreddit-equivalent containers (one per neighborhood + a megathread, roommate finder, "where will you live")
- `posts` — top-level submissions; supports `discussion`, `review`, `roommate`, and `question` types
- `comments` — nested up to 8 deep
- `votes` — upvote/downvote on posts and comments, with triggers that maintain `upvotes`/`downvotes`/`score` aggregates
- `bookmarks` — user-saved posts
- `roommate_pings` — direct expression-of-interest between users
- `review_helpful_votes` — per-user “helpful” on review posts (separate from `votes`)
- `profiles.anonymous_handle` — public animal-style handle; `posts` includes Place ID, five dimension ratings, `rating_overall`, `lease_type`, `furnished`, `affiliation`, `helpful_count`

RLS is enabled on every public table. Views are `security_invoker = true`
(Postgres 15+).

To regenerate the TypeScript types after schema changes:

```bash
npm run db:types
```

## Page layout

- `/` — home feed across all boards, sortable Hot/New/Top
- `/b/[slug]` — board page (e.g. `/b/mission`, `/b/sf-housing`, `/b/roommates`, `/b/future-housing`)
- `/p/[id]` — single post + nested comment thread
- `/submit` — create a new post (with review-specific fields)
- `/u/[handle]` — profile by anonymous handle (legacy `/u/username` still resolves)
- `/building/[placeId]` — aggregated reviews for a Google Place ID
- `/login` — magic-link auth via Supabase OTP
- `/auth/callback` — code-exchange handler

## Design system

See `.cursorrules` at the project root. Key rules:

- Single brand violet (`#533afd`) on every primary action
- Headings at weight 300 with negative letter-spacing
- 4 px spacing grid, 4 px / 6 px radii, soft diffused shadows
- Decorative gradients only in hero / marketing surfaces
- WCAG 2.2 AA, always-visible focus rings, 44 × 44 px minimum hit targets

When generating new UI, prefer existing tokens and components in
`src/components/ui/`.
