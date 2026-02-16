'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { addBookmark, updateBookmark, deleteBookmark } from '@/lib/db/bookmarks'

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

  console.log('[addBookmarkAction] Form data:', { title, url })

  //validate title
  if (!title || title.toString().trim() === '') {
    throw new Error('Title is required')
  }

  if (title.toString().trim().length > 255) {
    throw new Error('Title must be less than 255 characters')
  }

  //validate url
  if (!url || url.toString().trim() === '') {
    throw new Error('URL is required')
  }

  try {
    new URL(url.toString())
  } catch {
    throw new Error('Invalid URL format')
  }

  //add bookmark
  console.log('[addBookmarkAction] Calling addBookmark() to insert into database...')
  const result = await addBookmark(user.id, title.toString(), url.toString())
  console.log('[addBookmarkAction] ✅ Bookmark inserted, result:', result)

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

  //validate title
  if (!title || title.toString().trim() === '') {
    throw new Error('Title is required')
  }

  if (title.toString().trim().length > 255) {
    throw new Error('Title must be less than 255 characters')
  }

  //validate url
  if (!url || url.toString().trim() === '') {
    throw new Error('URL is required')
  }

  try {
    new URL(url.toString())
  } catch {
    throw new Error('Invalid URL format')
  }

  //update bookmark
  await updateBookmark(id, user.id, title.toString(), url.toString())

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