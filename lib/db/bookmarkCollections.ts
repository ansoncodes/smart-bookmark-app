import { createClient } from '@/lib/supabase/server'

export interface BookmarkCollection {
    id: string
    bookmark_id: string
    collection_id: string
}

//get all bookmark-collection mappings for a user's bookmarks
export async function getBookmarkCollections(userId: string): Promise<BookmarkCollection[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('bookmark_collections')
        .select('id, bookmark_id, collection_id, bookmarks!inner(user_id)')
        .eq('bookmarks.user_id', userId)

    if (error) {
        console.error('Error fetching bookmark collections:', error.message)
        throw new Error('Failed to fetch bookmark collections')
    }

    //strip the joined bookmarks data
    return (data || []).map(({ id, bookmark_id, collection_id }) => ({
        id,
        bookmark_id,
        collection_id,
    }))
}

//add bookmarks to a collection
export async function addBookmarksToCollection(
    bookmarkIds: string[],
    collectionId: string
): Promise<void> {
    const supabase = await createClient()

    const rows = bookmarkIds.map((bookmarkId) => ({
        bookmark_id: bookmarkId,
        collection_id: collectionId,
    }))

    const { error } = await supabase
        .from('bookmark_collections')
        .upsert(rows, { onConflict: 'bookmark_id,collection_id', ignoreDuplicates: true })

    if (error) {
        console.error('Error adding bookmarks to collection:', error.message)
        throw new Error('Failed to add bookmarks to collection')
    }
}

//remove bookmarks from a collection
export async function removeBookmarksFromCollection(
    bookmarkIds: string[],
    collectionId: string
): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
        .from('bookmark_collections')
        .delete()
        .in('bookmark_id', bookmarkIds)
        .eq('collection_id', collectionId)

    if (error) {
        console.error('Error removing bookmarks from collection:', error.message)
        throw new Error('Failed to remove bookmarks from collection')
    }
}
