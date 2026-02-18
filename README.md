# Smart Bookmark App

Built and deployed a simple bookmark manager.

## Live Links

- Live Vercel URL: `https://smart-bookmark-app-anson.vercel.app/`
- Public GitHub Repo: `https://github.com/ansoncodes/smart-bookmark-app`

## Requirement Coverage

### 1) User can sign up and log in using Google (Google OAuth only)

Status: `Implemented`

- Login page uses `supabase.auth.signInWithOAuth({ provider: 'google' })`
- No email/password auth flow is used
- Auth callback route is implemented at `app/auth/callback/route.ts`

### 2) Logged-in user can add a bookmark (URL + title)

Status: `Implemented`

- Add form in `app/dashboard/AddBookmarkForm.tsx`
- Server action in `app/actions/bookmarks.ts` (`addBookmarkAction`)
- Bookmark is persisted in Supabase `bookmarks` table

### 3) Bookmarks are private to each user

Status: `Implemented`

- Queries and mutations are scoped by `user_id`
- RLS policies are defined for user-owned access
- Dashboard data loading uses authenticated user context

### 4) Bookmark list updates in real-time without refresh

Status: `Implemented`

- Supabase realtime subscriptions are used for bookmarks, collections, and mapping table
- Changes in one tab appear in another tab automatically
- Realtime logic is in dashboard components (`BookmarkList.tsx`, `DashboardContent.tsx`)

### 5) User can delete their own bookmarks

Status: `Implemented`

- Per-item delete + bulk delete are implemented
- Server action validates authenticated user and user-owned rows

### 6) App deployed on Vercel with a working live URL

Status: `Implemented`

- Next.js app is production-build ready
- Add your final deployed URL in the `Live Links` section

## Tech Stack

- Next.js
- Supabase
- Tailwind CSS

## Additional Features Implemented

- Collections (create, rename, delete)
- Assign/remove bookmarks to/from collections
- Search by title/URL/domain
- Sort options (newest/oldest/A-Z)
- Pin/unpin bookmarks
- Link preview cards
- Broken-link check and status tracking
- Shareable collection links (`/shared/[shareId]`)
- Import shared collection into your account
- Light/dark theme toggle
- Responsive desktop/mobile layout

## Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`

## Scripts

- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - run lint checks

## Key Routes

- `/` -> redirects to `/dashboard`
- `/login` -> Google OAuth login
- `/dashboard` -> authenticated app
- `/shared/[shareId]` -> public shared collection page
- `/api/preview` -> metadata preview endpoint
