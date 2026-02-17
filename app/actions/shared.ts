'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createShareLink, deleteShareLink, getSharedCollection } from '@/lib/db/shared'
import { createCollection } from '@/lib/db/collections'
import { addBookmarksToCollection } from '@/lib/db/bookmarkCollections'

export async function generateShareLinkAction(collectionId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    // Ensure user owns the collection
    const { data: collection } = await supabase
        .from('collections')
        .select('id')
        .eq('id', collectionId)
        .eq('user_id', user.id)
        .single()

    if (!collection) {
        throw new Error('Collection not found or access denied')
    }

    const shareId = await createShareLink(user.id, collectionId)
    revalidatePath('/dashboard')
    return shareId
}

export async function deleteShareLinkAction(collectionId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    await deleteShareLink(user.id, collectionId)
    revalidatePath('/dashboard')
}

export async function importSharedCollectionAction(shareId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    // 1. Fetch shared data
    const data = await getSharedCollection(shareId)
    if (!data) {
        throw new Error('Shared collection not found')
    }

    const { collection, bookmarks } = data

    if (bookmarks.length === 0) {
        throw new Error('No bookmarks to import')
    }

    // 2. Create new collection
    const newCollectionName = `Imported: ${collection.name}`
    const newCollection = await createCollection(user.id, newCollectionName)

    if (!newCollection) {
        throw new Error('Failed to create collection')
    }

    // 3. Create bookmarks
    const bookmarksToInsert = bookmarks.map(b => ({
        user_id: user.id,
        title: b.title,
        url: b.url,
        description: b.description || null,
        is_pinned: false
    }))

    const { data: insertedBookmarks, error: insertError } = await supabase
        .from('bookmarks')
        .insert(bookmarksToInsert)
        .select('id')

    if (insertError) {
        console.error('Import error:', insertError)
        throw new Error('Failed to import bookmarks')
    }

    // 4. Link bookmarks to collection
    if (insertedBookmarks && insertedBookmarks.length > 0) {
        const bookmarkIds = insertedBookmarks.map(b => b.id)
        await addBookmarksToCollection(bookmarkIds, newCollection.id)
    }

    revalidatePath('/dashboard')
    return newCollection.id
}
