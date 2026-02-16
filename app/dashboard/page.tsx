import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">
        Your Bookmarks
      </h2>

      {bookmarks?.length === 0 && (
        <p className="text-gray-500">No bookmarks yet</p>
      )}

      {bookmarks?.map((bookmark) => (
        <div
          key={bookmark.id}
          className="bg-white p-4 rounded-lg shadow flex justify-between"
        >
          <div>
            <p className="font-semibold">{bookmark.title}</p>
            <a
              href={bookmark.url}
              target="_blank"
              className="text-blue-500 text-sm"
            >
              {bookmark.url}
            </a>
          </div>

          <button className="text-red-500">
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}
