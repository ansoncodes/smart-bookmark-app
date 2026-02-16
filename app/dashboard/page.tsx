import { createClient } from '@/lib/supabase/server'
import { getBookmarks } from '@/lib/db/bookmarks'
import DashboardContent from '@/app/dashboard/DashboardContent'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  //fetch initial bookmarks on the server
  const bookmarks = await getBookmarks(user.id)

  return <DashboardContent initialBookmarks={bookmarks} userId={user.id} />
}