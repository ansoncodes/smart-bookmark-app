'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { addBookmark, updateBookmark, deleteBookmark, updateBookmarkLinkStatus } from '@/lib/db/bookmarks'
import { getBookmarks } from '@/lib/db/bookmarks'
import { addBookmarksToCollection, removeBookmarksFromCollection } from '@/lib/db/bookmarkCollections'
import { validateUrl } from '@/lib/linkChecker'
import { normalizeUrl, isValidUrl } from '@/lib/utils/url'

//add Bookmark
export async function addBookmarkAction(formData: FormData) {
  console.log('[addBookmarkAction] Server action called')

  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    console.error('[addBookmarkAction] Auth error:', error)
    throw new Error('User not authenticated')
  }

  const user = data.user
  console.log('[addBookmarkAction] User authenticated:', user.id)

  //get values
  const title = formData.get('title')
  const url = formData.get('url')
  const description = formData.get('description')

  console.log('[addBookmarkAction] Form data:', { title, url, description })

  //validate title
  if (!title || title.toString().trim() === '') {
    throw new Error('Title is required')
  }

  if (title.toString().trim().length > 255) {
    throw new Error('Title must be less than 255 characters')
  }

  // Normalize and validate URL
  if (!url) {
    throw new Error('URL is required')
  }

  const normalizedUrl = normalizeUrl(url.toString())
  if (!isValidUrl(normalizedUrl)) {
    throw new Error('Invalid URL format')
  }

  //add bookmark
  console.log('[addBookmarkAction] Calling addBookmark() to insert into database...')
  const collectionId = formData.get('collection_id')
  const result = await addBookmark(
    user.id,
    title.toString(),
    normalizedUrl,
    collectionId ? collectionId.toString() : null,
    description ? description.toString() : null
  )
  console.log('[addBookmarkAction] ✅ Bookmark inserted, result:', result)

  // Trigger link check asynchronously (don't await to avoid blocking UI)
  if (result?.id && url) {
    validateUrl(url.toString()).then(async (isValid) => {
      await updateBookmarkLinkStatus(result.id, !isValid)
      revalidatePath('/dashboard')
    }).catch(err => console.error('[addBookmarkAction] Link check failed:', err))
  }

  //add to collection via junction table if selected
  if (collectionId && collectionId.toString().trim() && result?.id) {
    await addBookmarksToCollection([result.id], collectionId.toString())
    console.log('[addBookmarkAction] ✅ Added to collection:', collectionId)
  }

  console.log('[addBookmarkAction] Revalidating /dashboard path...')
  revalidatePath('/dashboard')
  console.log('[addBookmarkAction] ✅ Path revalidated')

  return result
}

//update Bookmark
export async function updateBookmarkAction(
  id: string,
  formData: FormData
) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    throw new Error('User not authenticated')
  }

  const user = data.user

  //validate id
  if (!id || id.trim() === '') {
    throw new Error('Bookmark ID is required')
  }

  //get values
  const title = formData.get('title')
  const url = formData.get('url')
  const description = formData.get('description')

  //validate title
  if (!title || title.toString().trim() === '') {
    throw new Error('Title is required')
  }

  if (title.toString().trim().length > 255) {
    throw new Error('Title must be less than 255 characters')
  }

  // Normalize and validate URL
  if (!url) {
    throw new Error('URL is required')
  }

  const normalizedUrl = normalizeUrl(url.toString())
  if (!isValidUrl(normalizedUrl)) {
    throw new Error('Invalid URL format')
  }

  //update bookmark
  await updateBookmark(
    id,
    user.id,
    title.toString(),
    normalizedUrl,
    undefined,
    description !== null ? (description ? description.toString() : null) : undefined
  )

  revalidatePath('/dashboard')
}

//delete Bookmark
export async function deleteBookmarkAction(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    throw new Error('User not authenticated')
  }

  const user = data.user

  //validate id
  if (!id || id.trim() === '') {
    throw new Error('Bookmark ID is required')
  }

  await deleteBookmark(id, user.id)

  revalidatePath('/dashboard')
}

//toggle pin bookmark
export async function togglePinBookmarkAction(id: string, isPinned: boolean) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    throw new Error('User not authenticated')
  }

  const user = data.user

  if (!id || id.trim() === '') {
    throw new Error('Bookmark ID is required')
  }

  const { error: updateError } = await supabase
    .from('bookmarks')
    .update({ is_pinned: !isPinned })
    .eq('id', id)
    .eq('user_id', user.id)

  if (updateError) {
    console.error('Error toggling pin:', updateError.message)
    throw new Error('Failed to toggle pin')
  }

  revalidatePath('/dashboard')
}

//add bookmarks to a collection (bulk)
export async function addToCollectionAction(
  bookmarkIds: string[],
  collectionId: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    throw new Error('User not authenticated')
  }

  if (!bookmarkIds.length) {
    throw new Error('No bookmarks selected')
  }

  await addBookmarksToCollection(bookmarkIds, collectionId)

  revalidatePath('/dashboard')
}

//remove bookmarks from a collection (bulk)
export async function removeFromCollectionAction(
  bookmarkIds: string[],
  collectionId: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    throw new Error('User not authenticated')
  }

  if (!bookmarkIds.length) {
    throw new Error('No bookmarks selected')
  }

  await removeBookmarksFromCollection(bookmarkIds, collectionId)

  revalidatePath('/dashboard')
}

// Check bookmark link status action
export async function checkBookmarkLinkAction(id: string, url: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    throw new Error('User not authenticated')
  }

  const isValid = await validateUrl(url)
  await updateBookmarkLinkStatus(id, !isValid)

  revalidatePath('/dashboard')
}

// Fallback fetch used by clients when realtime misses events.
export async function getLatestBookmarksAction() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    throw new Error('User not authenticated')
  }

  return getBookmarks(data.user.id)
}
