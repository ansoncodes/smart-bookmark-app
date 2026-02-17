'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Bookmark } from '@/lib/db/bookmarks'
import type { Collection } from '@/lib/db/collections'
import { importSharedCollectionAction } from '@/app/actions/shared'

interface SharedViewProps {
    collection: Collection
    bookmarks: Bookmark[]
    shareId: string
}

export default function SharedView({ collection, bookmarks, shareId }: SharedViewProps) {
    const router = useRouter()
    const [importing, setImporting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleImport = async () => {
        setImporting(true)
        setError(null)
        try {
            await importSharedCollectionAction(shareId)
            router.push('/dashboard')
        } catch (err: any) {
            if (err.message === 'Unauthorized') {
                // Redirect to login with return URL
                router.push(`/login?next=/shared/${shareId}`)
            } else {
                setError(err.message || 'Failed to import')
            }
        } finally {
            setImporting(false)
        }
    }

    return (
        <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100 font-sans">
            {/* Header */}
            <header className="border-b border-gray-200 dark:border-zinc-800 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-10">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center border border-gray-200 dark:border-zinc-700">
                            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="font-semibold text-lg leading-tight">{collection.name}</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{bookmarks.length} bookmarks</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {error && <span className="text-sm text-red-500 hidden sm:inline-block animate-in fade-in">{error}</span>}
                        <button
                            onClick={handleImport}
                            disabled={importing}
                            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
                        >
                            {importing ? 'Saving...' : 'Save to My Collection'}
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-5xl mx-auto px-4 py-8">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {bookmarks.map(bookmark => (
                        <a
                            key={bookmark.id}
                            href={bookmark.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block p-4 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-xl hover:border-gray-300 dark:hover:border-zinc-700 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 transition-all duration-300 h-full flex flex-col"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0 pr-3">
                                    <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {bookmark.title}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 truncate mt-0.5 font-mono">
                                        {new URL(bookmark.url).hostname.replace(/^www\./, '')}
                                    </p>
                                </div>
                                <img
                                    src={`https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=64`}
                                    alt=""
                                    className="w-8 h-8 rounded-lg bg-white dark:bg-black/20 p-1 border border-gray-100 dark:border-zinc-800 opacity-80 group-hover:opacity-100 transition-opacity"
                                />
                            </div>
                            {bookmark.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-auto pt-2 border-t border-gray-100 dark:border-zinc-800/50">
                                    {bookmark.description}
                                </p>
                            )}
                        </a>
                    ))}
                </div>

                {bookmarks.length === 0 && (
                    <div className="text-center py-20 px-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 dark:bg-zinc-900 mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Sample Collection</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">This collection is empty, but normally it would be full of interesting links.</p>
                    </div>
                )}
            </main>
        </div>
    )
}
