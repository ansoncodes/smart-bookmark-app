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

## Problems Faced and Fixes

### Realtime sync inconsistency across tabs

Problem:
- While testing with multiple tabs, realtime updates were inconsistent for the tab that triggered the add action.
- Other tabs were receiving `INSERT` events, but the originating tab could feel delayed/inconsistent.

What in code caused it:
- The originating tab was relying on network/realtime timing instead of showing an immediate local insert.
- Realtime events and local updates can overlap in timing, which can cause inconsistent UX without dedupe guards.

Fix:
- Added an optimistic insert path using `optimisticAddCallbackRef` in `app/dashboard/DashboardContent.tsx` and `app/dashboard/BookmarkList.tsx`.
- Kept Supabase realtime subscriptions in `app/dashboard/BookmarkList.tsx` for `INSERT`, `UPDATE`, and `DELETE`.
- Added duplicate protection by checking existing bookmark `id` before inserting from both optimistic and realtime paths.
- Result: the originating tab updates instantly, other tabs sync in realtime, and duplicate rows are prevented.

### Browser popup blocker when opening multiple bookmarks

Problem:
- The "Open Selected" / "Open All" flow can be blocked by browser popup settings when opening multiple tabs programmatically.
- This can cause partial behavior (only some tabs open), which is confusing for users.

What in code caused it:
- Direct multi-tab `window.open` calls are browser-policy dependent.
- Without a pre-check, tab opening can fail silently or partially.

Fix:
- Added a verification flow before opening all links:
- Intercept open action and show `PopupVerificationModal`.
- On "Verify & Open", run `verifyPopupPermissions()` (`lib/utils.ts`) which attempts to open two dummy windows.
- If both open: immediately close dummies, mark permission verified, then call `openLinksInNewTabs(...)`.
- If blocked: stop execution and show clear instructions in the modal for enabling popup permissions.

Result:
- Reliable all-or-nothing behavior in practice.
- Avoids partial tab opening issues.
- Better UX with explicit feedback and recovery steps instead of silent failure.

### Creating share collection links (duplicates + access control)

Problem:
- While implementing share links, repeated clicks could create duplicate links for the same collection.
- Also, share-link generation needed strict ownership checks so users could not generate links for collections they do not own.

What in code caused it:
- Naive insert-only behavior for `shared_collections` can create duplicate rows.
- Missing ownership validation in server action would allow invalid access attempts.

Fix:
- In `lib/db/shared.ts`, `createShareLink(...)` first checks if a share already exists and returns it instead of creating another.
- In `app/actions/shared.ts`, `generateShareLinkAction(...)` verifies collection ownership before calling share-link creation.
- Share IDs are generated with `nanoid(10)` for URL-safe short links.

Result:
- One stable share link per collection (no duplicate share links).
- Unauthorized share-link creation is blocked.
- Share flow is predictable and secure.

### Importing and saving a shared collection correctly

Problem:
- Importing shared data needed to create new user-owned data without violating privacy boundaries.
- Bookmark-to-collection mapping had to be preserved in this project’s schema (junction-table model).

What in code caused it:
- Shared data comes from a public link flow, but imported records must belong to the authenticated user.
- `bookmarks` do not store `collection_id` directly in this app design; relations are stored in `bookmark_collections`.

Fix:
- In `app/actions/shared.ts`, `importSharedCollectionAction(...)`:
- Fetches shared data via RPC (`get_shared_collection_data`)
- Creates a new collection for the current user (`Imported: <name>`)
- Inserts bookmarks under the current user’s `user_id`
- Links inserted bookmark IDs to the new collection via `addBookmarksToCollection(...)`

Result:
- Shared collections are imported safely into the current user’s workspace.
- Imported bookmarks stay correctly grouped using the junction table.
- Ownership and data isolation remain intact.

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
