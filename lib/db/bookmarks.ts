import { createClient } from '@/lib/supabase/server'

export interface Bookmark {
  id: string
  title: string
  url: string
  user_id: string
  created_at: string
  is_pinned?: boolean
  collection_id?: string | null
  description?: string | null
}

//get bookmarks
export async function getBookmarks(userId: string, collectionId?: string): Promise<Bookmark[]> {
  const supabase = await createClient()

  let query = supabase
    .from('bookmarks')
    .select('*')
    .eq('user_id', userId)

  if (collectionId) {
    query = query.eq('collection_id', collectionId)
  }

  const { data, error } = await query
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching bookmarks:', error.message)
    throw new Error('Failed to fetch bookmarks')
  }

  return data || []
}

//add bookmark
export async function addBookmark(
  userId: string,
  title: string,
  url: string,
  collectionId?: string | null,
  description?: string | null
): Promise<Bookmark | null> {
  const supabase = await createClient()

  const insertData: {
    title: string
    url: string
    user_id: string
    is_pinned: boolean
    description?: string | null
  } = {
    title: title.trim(),
    url: url.trim(),
    user_id: userId,
    is_pinned: false,
  }

  // Note: collection_id is NOT a column on bookmarks table.
  // Collection assignment is handled via the bookmark_collections junction table
  // after the bookmark is created.

  if (description && description.trim()) {
    insertData.description = description.trim()
  }

  const { data, error } = await supabase
    .from('bookmarks')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Error adding bookmark:', error.message, error)
    throw new Error(`Failed to add bookmark: ${error.message}`)
  }

  return data
}

//update bookmark
export async function updateBookmark(
  id: string,
  userId: string,
  title: string,
  url: string,
  isPinned?: boolean,
  description?: string | null
): Promise<Bookmark | null> {
  const supabase = await createClient()
  const updateData: {
    title: string
    url: string
    is_pinned?: boolean
    description?: string | null
  } = {
    title: title.trim(),
    url: url.trim(),
  }

  if (typeof isPinned === 'boolean') {
    updateData.is_pinned = isPinned
  }

  if (description !== undefined) {
    updateData.description = description && description.trim() ? description.trim() : null
  }

  const { data, error } = await supabase
    .from('bookmarks')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId) //ensures user can only update their own bookmarks
    .select()
    .single()

  if (error) {
    console.error('Error updating bookmark:', error.message)
    throw new Error('Failed to update bookmark')
  }

  return data
}

//delete bookmark
export async function deleteBookmark(
  id: string,
  userId: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('Error deleting bookmark:', error.message)
    throw new Error('Failed to delete bookmark')
  }
}
