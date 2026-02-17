import { createClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'
import type { Bookmark } from './bookmarks'
import type { Collection } from './collections'

export interface SharedCollectionData {
    collection: Collection
    bookmarks: Bookmark[]
}

export async function createShareLink(userId: string, collectionId: string): Promise<string> {
    const supabase = await createClient()

    // Check if already shared
    const { data: existing } = await supabase
        .from('shared_collections')
        .select('share_id')
        .eq('collection_id', collectionId)
        .single()

    if (existing) {
        return existing.share_id
    }

    // Generate new share ID (10 chars is usually enough for this use case, URL-safe)
    const shareId = nanoid(10)

    const { error } = await supabase.from('shared_collections').insert({
        collection_id: collectionId,
        share_id: shareId,
        created_by: userId
    })

    // If error (collision?), retry once or throw. Collision probability is low with 10 chars.
    if (error) {
        console.error('Error creating share link:', error)
        throw new Error('Failed to create share link')
    }

    return shareId
}

export async function getSharedCollection(shareId: string): Promise<SharedCollectionData | null> {
    const supabase = await createClient()

    // Use the RPC to fetch safely and avoid RLS recursions
    const { data, error } = await supabase
        .rpc('get_shared_collection_data', { share_id_input: shareId })

    if (error) {
        console.error('Error fetching shared collection:', error)
        return null
    }

    if (!data) return null

    // The RPC returns { collection, bookmarks }
    // Cast the result to the expected type
    const { collection, bookmarks } = data as { collection: Collection, bookmarks: Bookmark[] }

    if (!collection) return null

    return { collection, bookmarks: bookmarks || [] }
}

export async function deleteShareLink(userId: string, collectionId: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
        .from('shared_collections')
        .delete()
        .eq('collection_id', collectionId)
        .eq('created_by', userId)

    if (error) throw new Error(error.message)
}
