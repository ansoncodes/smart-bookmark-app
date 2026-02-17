import { notFound } from 'next/navigation'
import { getSharedCollection } from '@/lib/db/shared'
import SharedView from './SharedView'
import type { Metadata } from 'next'

interface PageProps {
    params: Promise<{ shareId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { shareId } = await params
    const data = await getSharedCollection(shareId)
    if (!data) return { title: 'Collection Not Found' }
    return {
        title: `${data.collection.name} - Smart Bookmark`,
        description: `View shared bookmarks from ${data.collection.name}`,
        openGraph: {
            title: `${data.collection.name} - Smart Bookmark`,
            description: `${data.bookmarks.length} bookmarks shared via Smart Bookmark`,
        }
    }
}

export default async function SharedCollectionPage({ params }: PageProps) {
    const { shareId } = await params
    const data = await getSharedCollection(shareId)

    if (!data) {
        notFound()
    }

    return <SharedView collection={data.collection} bookmarks={data.bookmarks} shareId={shareId} />
}
