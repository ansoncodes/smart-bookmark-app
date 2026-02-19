# Smart Bookmark App

A modern, real-time bookmark manager built with Next.js and Supabase — designed like a lightweight SaaS product with collections, sharing, bulk actions, and intelligent link features.

## Live Demo

- **Live App:** https://smart-bookmark-app-anson.vercel.app/
- **GitHub Repo:** https://github.com/ansoncodes/smart-bookmark-app

# Demo Video
[![Smart Bookmark App Demo](https://img.youtube.com/vi/bhz0vEFbyhU/maxresdefault.jpg)](https://youtu.be/bhz0vEFbyhU)
*Click to watch the demo video*

---

## Core Features (Requirement Coverage)

### Google OAuth Authentication
- Sign in with Google (no password flow)
- Secure session handling
- Protected dashboard routes

### Bookmark Management
- Add bookmarks (title + URL with validation)
- Edit bookmarks inline
- Delete:
  - Single
  - Bulk (multi-select)

### Private User Data
- Fully user-scoped data
- Supabase Row Level Security (RLS)
- Users can only access their own bookmarks

### Real-Time Sync (Multi-Tab)
- Instant updates across tabs using Supabase Realtime
- Supports:
  - Add
  - Update
  - Delete
- Includes:
  - Optimistic UI updates
  - Duplicate prevention

### Deployment
- Fully deployed on Vercel
- Production-ready build

---

## Advanced Features (What makes this stand out)

### Collections (Folder System)
- Create, rename, delete collections
- Filter bookmarks by collection
- "All Bookmarks" default view

### Many-to-Many Data Modeling
- Bookmarks <-> Collections via junction table
- One bookmark can belong to multiple collections

### Search + Sorting
- Search by:
  - Title
  - URL
  - Domain
- Sorting:
  - Newest
  - Oldest
  - A-Z

### Pin Important Bookmarks
- Pin/unpin feature
- Pinned items always stay on top

### Bulk Actions 
- Multi-select bookmarks
- Bulk operations:
  - Delete
  - Add to collection
  - Remove from collection
  - Open multiple links

### Smart Multi-Tab Opening
- Handles browser popup blockers
- Includes verification flow before opening multiple tabs

### Real-Time + Optimistic UX
- Immediate UI updates (no waiting)
- Realtime keeps all tabs synced
- Deduplication prevents duplicate entries

### Share Collections (Public Links)
- Generate shareable links
- Public read-only view
- Ownership validation enforced

### Import Shared Collections
- Import shared collections into your account
- Clones:
  - Collection
  - Bookmarks
  - Relationships

### Link Intelligence

**Preview System**
- Hover to see metadata preview
- Fetched via API route

**Broken Link Detection**
- Tracks link health
- Stores status + last checked time

### UI/UX 
- Clean dashboard layout
- Responsive (desktop + mobile)
- Dark / Light theme
- Custom modals (no default browser popups)

---

## Engineering Highlights

- Optimistic UI for instant feedback
- Real-time + local state synchronization
- Secure server actions with auth validation
- Scalable schema design (many-to-many)
- Clean separation of:
  - UI
  - Server actions
  - DB helpers

---

## Problems Faced & Solutions

### Real-Time Sync Issue (Key Learning)

**Problem:**
- Bookmark added in one tab didn't appear instantly in the same tab
- Other tabs updated correctly

**Cause:**
- Originating tab relied only on realtime events
- No immediate local state update

**Fix:**
- Implemented optimistic updates
- Added duplicate guards using bookmark IDs
- Combined:
  - Immediate local insert
  - Realtime sync for consistency

**Result:** Instant UI response + perfect multi-tab sync

---

### Popup Blocker Issue

**Problem:** Opening multiple bookmarks failed silently due to browser restrictions

**Fix:**
- Added popup verification flow
- Tested permission before executing bulk open

**Result:** Reliable and user-friendly behavior

---

## Tech Stack

- **Next.js**
- **Supabase** (Auth + DB + Realtime)
- **Tailwind CSS**

---

## Local Setup

```bash
npm install
npm run dev
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```
