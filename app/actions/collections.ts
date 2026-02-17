'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createCollection } from '@/lib/db/collections'

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
