import { createClient } from '@/lib/supabase/server'

export interface Collection {
    id: string
    name: string
    user_id: string
    created_at: string
}

//get collections
export async function getCollections(userId: string): Promise<Collection[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching collections:', error.message)
        throw new Error('Failed to fetch collections')
    }

    return data || []
}

//create collection
export async function createCollection(
    userId: string,
    name: string
): Promise<Collection | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('collections')
        .insert({
            name: name.trim(),
            user_id: userId,
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating collection:', error.message)
        throw new Error('Failed to create collection')
    }

    return data
}

//delete collection
export async function deleteCollection(collectionId: string, userId: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', collectionId)
        .eq('user_id', userId)

    if (error) {
        console.error('Error deleting collection:', error.message)
        throw new Error(`Failed to delete collection: ${error.message}`)
    }
}
