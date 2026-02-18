'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createCollection, deleteCollection, getCollections, updateCollection } from '@/lib/db/collections'

//create collection
export async function createCollectionAction(formData: FormData) {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
        throw new Error('User not authenticated')
    }

    const user = data.user

    const name = formData.get('name')

    //validate name
    if (!name || name.toString().trim() === '') {
        throw new Error('Collection name is required')
    }

    if (name.toString().trim().length > 100) {
        throw new Error('Collection name must be less than 100 characters')
    }

    const result = await createCollection(user.id, name.toString())

    revalidatePath('/dashboard')

    return result
}

//delete collection
export async function deleteCollectionAction(collectionId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
        throw new Error('User not authenticated')
    }

    if (!collectionId) {
        throw new Error('Collection ID is required')
    }

    await deleteCollection(collectionId, data.user.id)

    revalidatePath('/dashboard')
}

//update collection
export async function updateCollectionAction(collectionId: string, name: string) {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
        throw new Error('User not authenticated')
    }

    //validate name
    if (!name || name.toString().trim() === '') {
        throw new Error('Collection name is required')
    }

    if (name.toString().trim().length > 100) {
        throw new Error('Collection name must be less than 100 characters')
    }

    const updated = await updateCollection(collectionId, data.user.id, name.toString())

    revalidatePath('/dashboard')

    return updated
}

// Fallback fetch for collections when realtime misses events.
export async function getLatestCollectionsAction() {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
        throw new Error('User not authenticated')
    }

    return getCollections(data.user.id)
}
