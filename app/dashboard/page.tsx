import { createClient } from '@/lib/supabase/server'
import { getBookmarks } from '@/lib/db/bookmarks'
import { getCollections } from '@/lib/db/collections'
import { getBookmarkCollections } from '@/lib/db/bookmarkCollections'
import DashboardContent from '@/app/dashboard/DashboardContent'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  //fetch bookmarks, collections, and bookmark-collection mappings
  const [bookmarks, collections, bookmarkCollections] = await Promise.all([
    getBookmarks(user.id),
    getCollections(user.id),
    getBookmarkCollections(user.id),
  ])

  return (
    <DashboardContent
      initialBookmarks={bookmarks}
      initialCollections={collections}
      initialBookmarkCollections={bookmarkCollections}
      userId={user.id}
    />
  )
}
