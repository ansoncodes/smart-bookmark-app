# Smart Bookmark Manager

A sophisticated, SaaS-style bookmark management application built with Next.js 15, Supabase, and Tailwind CSS.
Designed for speed, privacy, and collaboration.

## 🚀 Live Demo
[https://smart-bookmark-app.vercel.app](https://smart-bookmark-app.vercel.app)

## ✨ Implementations

### 1. Authentication
-   **Secure Google OAuth**: Passwordless login flow using Supabase Auth.
-   **User Isolation**: Strict Row Level Security (RLS) policies ensure users can only access their own data.

### 2. Core Features
-   **Real-time Interactions**: Any addition, update, or deletion reflects instantly across connected clients using Supabase Realtime subscriptions.
-   **Bulk Actions**: Manage multiple bookmarks efficiently.
-   **Collections**: Organize links into custom collections with full Create/Read/Update/Delete (CRUD) capabilities.
-   **Sharing**: Generate public read-only links for collections to share with others.

### 3. Technical Highlights

#### Custom UI Components
Instead of using unstyled native elements, I built custom accessible components:
-   **Dropdowns**: Replaced native `<select>` with fully styled, keyboard-accessible dropdowns for a premium feel.
-   **Modals**: Smooth, animated dialogs using Tailwind transitions.

#### Solving the Recursive RLS Challenge
One major challenge encountered was implementing the "Share Collection" feature. Initially, I added RLS policies to allow public access to shared bookmarks, which created a circular dependency (infinite recursion) between tables (`bookmarks` -> `bookmark_collections` -> `shared_collections` -> ...).

**Solution**: I refactored the data access strategy to use a **Postgres RPC Function** (`get_shared_collection_data`) marked as `SECURITY DEFINER`. This allows safe, performant fetching of shared data without complex, recursive RLS policies on the main tables.

#### Real-time State Management
Ensuring the UI stays in sync with the database across multiple tabs without manual refreshes required careful state management. I used Supabase Realtime channels to subscribe to `INSERT`, `UPDATE`, and `DELETE` events on the `bookmarks` table, automatically updating the local React state when changes occurred.

## 🛠️ Tech Stack
-   **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS v4.
-   **Backend**: Supabase (PostgreSQL, Auth, Realtime).
-   **Deployment**: Vercel.

## 📦 How to Run
1.  Clone the repository.
2.  Install dependencies: `npm install`
3.  Set up `.env.local`:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
    ```
4.  Run SQL migrations in Supabase SQL editor (found in `lib/supabase/migrations`).
5.  Start dev server: `npm run dev`

---
Built by Anson.
