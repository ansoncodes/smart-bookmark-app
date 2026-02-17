'use client'

import { useState } from 'react'
import type { Collection } from '@/lib/db/collections'
import { createCollectionAction } from '@/app/actions/collections'

interface SidebarProps {
    collections: Collection[]
    selectedCollectionId: string | null
    onSelectCollection: (id: string | null) => void
    onCollectionCreated: (collection: Collection) => void
}

export default function Sidebar({
    collections,
    selectedCollectionId,
    onSelectCollection,
    onCollectionCreated,
}: SidebarProps) {
    const [isCreating, setIsCreating] = useState(false)
    const [newName, setNewName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleCreate() {
        if (!newName.trim()) return

        setLoading(true)
        setError(null)

        try {
            const formData = new FormData()
            formData.append('name', newName.trim())
            const collection = await createCollectionAction(formData)

            if (collection) {
                onCollectionCreated(collection)
                setNewName('')
                setIsCreating(false)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create collection')
        } finally {
            setLoading(false)
        }
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleCreate()
        }
        if (e.key === 'Escape') {
            setIsCreating(false)
            setNewName('')
            setError(null)
        }
    }

    return (
        <aside className="w-56 flex-shrink-0">
            <div className="sticky top-24">
                <nav className="space-y-1">
                    {/* All Bookmarks */}
                    <button
                        onClick={() => onSelectCollection(null)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${selectedCollectionId === null
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800/60 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        All Bookmarks
                    </button>

                    {/* Separator */}
                    {collections.length > 0 && (
                        <div className="pt-3 pb-1 px-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                Collections
                            </p>
                        </div>
                    )}

                    {/* Collection items */}
                    {collections.map((collection) => (
                        <button
                            key={collection.id}
                            onClick={() => onSelectCollection(collection.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${selectedCollectionId === collection.id
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400 font-medium'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800/60 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            <span className="truncate">{collection.name}</span>
                        </button>
                    ))}
                </nav>

                {/* New Collection */}
                <div className="mt-4 px-1">
                    {isCreating ? (
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Collection name"
                                autoFocus
                                disabled={loading}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 disabled:opacity-50 transition-all duration-200"
                            />
                            {error && (
                                <p className="text-xs text-red-500">{error}</p>
                            )}
                            <div className="flex gap-1.5">
                                <button
                                    onClick={handleCreate}
                                    disabled={loading || !newName.trim()}
                                    className="flex-1 px-3 py-1.5 text-xs font-medium bg-green-500 text-black rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                >
                                    {loading ? 'Creating...' : 'Create'}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsCreating(false)
                                        setNewName('')
                                        setError(null)
                                    }}
                                    disabled={loading}
                                    className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-zinc-700 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-all duration-200"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-zinc-800/60 transition-all duration-200"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New Collection
                        </button>
                    )}
                </div>
            </div>
        </aside>
    )
}
