import { useState, useRef, useEffect } from 'react'
import type { Collection } from '@/lib/db/collections'
import { createCollectionAction, deleteCollectionAction, updateCollectionAction } from '@/app/actions/collections'

interface SidebarProps {
    collections: Collection[]
    selectedCollectionId: string | null
    onSelectCollection: (id: string | null) => void
    onCollectionCreated: (collection: Collection) => void
    onCollectionDeleted: (collectionId: string) => void
    onCollectionUpdated: (collection: Collection) => void
    isOpen?: boolean
    onClose?: () => void
}

export default function Sidebar({
    collections,
    selectedCollectionId,
    onSelectCollection,
    onCollectionCreated,
    onCollectionDeleted,
    onCollectionUpdated,
    isOpen = false,
    onClose,
}: SidebarProps) {
    const [isCreating, setIsCreating] = useState(false)
    const [newName, setNewName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const editInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (editingId && editInputRef.current) {
            editInputRef.current.focus()
        }
    }, [editingId])

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

    async function handleDelete(collectionId: string) {
        setDeletingId(collectionId)
        try {
            await deleteCollectionAction(collectionId)
            // If the deleted collection was selected, go back to All Bookmarks
            if (selectedCollectionId === collectionId) {
                onSelectCollection(null)
            }
            onCollectionDeleted(collectionId)
        } catch (err) {
            console.error('Failed to delete collection:', err)
        } finally {
            setDeletingId(null)
            setConfirmDeleteId(null)
        }
    }

    async function handleUpdate(collectionId: string) {
        if (!editName.trim()) return

        setLoading(true)
        setError(null)

        try {
            const updated = await updateCollectionAction(collectionId, editName.trim())
            if (updated) {
                onCollectionUpdated(updated)
            }
            setEditingId(null)
            setEditName('')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update collection')
        } finally {
            setLoading(false)
        }
    }

    function startEditing(collection: Collection) {
        setEditingId(collection.id)
        setEditName(collection.name)
        setError(null)
        setConfirmDeleteId(null) // Close delete confirmation if open
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

    function handleEditKeyDown(e: React.KeyboardEvent, collectionId: string) {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleUpdate(collectionId)
        }
        if (e.key === 'Escape') {
            setEditingId(null)
            setEditName('')
            setError(null)
        }
    }

    const renderSidebarContent = () => (
        <div className="h-full overflow-y-auto">
            <nav className="space-y-1">
                <div className="md:hidden mb-6 px-2">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Smart Bookmarks</h2>
                </div>

                    {/* All Bookmarks */}
                    <button
                        onClick={() => {
                            onSelectCollection(null)
                            onClose?.()
                        }}
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
                        <div key={collection.id} className="group relative">
                            {editingId === collection.id ? (
                                // Editing Mode
                                <div className="px-1 py-1">
                                    <input
                                        ref={editInputRef}
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={() => handleUpdate(collection.id)}
                                        onKeyDown={(e) => handleEditKeyDown(e, collection.id)}
                                        className="w-full px-2 py-1 text-sm border border-green-500 rounded bg-white dark:bg-zinc-800 focus:outline-none"
                                    />
                                    <div className="flex gap-1 mt-1 justify-end">
                                        <button
                                            onClick={() => handleUpdate(collection.id)}
                                            className="text-xs text-green-600 font-medium px-1.5 py-0.5 hover:bg-green-50 rounded"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="text-xs text-gray-500 px-1.5 py-0.5 hover:bg-gray-100 rounded"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // Display Mode
                                <>
                                    <button
                                        onClick={() => {
                                            onSelectCollection(collection.id)
                                            onClose?.()
                                        }}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 pr-12 ${selectedCollectionId === collection.id
                                            ? 'bg-green-500/10 text-green-600 dark:text-green-400 font-medium'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800/60 hover:text-gray-900 dark:hover:text-white'
                                            }`}
                                    >
                                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                        </svg>
                                        <span className="truncate">{collection.name}</span>
                                    </button>

                                    {/* Action Buttons (Edit/Delete) */}
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                                        {/* Edit Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                startEditing(collection)
                                            }}
                                            className="p-1 rounded-md text-gray-400 dark:text-white/30 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                                            title="Rename collection"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>

                                        {/* Delete Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setConfirmDeleteId(collection.id)
                                            }}
                                            className="p-1 rounded-md text-gray-400 dark:text-white/30 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                            title="Delete collection"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* Confirmation overlay */}
                            {confirmDeleteId === collection.id && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-lg border border-red-200 dark:border-red-500/20">
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => handleDelete(collection.id)}
                                            disabled={deletingId === collection.id}
                                            className="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-md hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50 transition-all duration-200"
                                        >
                                            {deletingId === collection.id ? '...' : 'Delete'}
                                        </button>
                                        <button
                                            onClick={() => setConfirmDeleteId(null)}
                                            disabled={deletingId === collection.id}
                                            className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-zinc-700 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-all duration-200"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </nav>

                {/* New Collection */}
                <div className="mt-4 pb-4">
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
                            {error && !editingId && (
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
    )

    return (
        <>
            <aside className="hidden md:block w-56 flex-shrink-0">
                <div className="sticky top-24">
                    {renderSidebarContent()}
                </div>
            </aside>

            <div className={`md:hidden fixed inset-0 z-50 transition-visibility duration-300 ${isOpen ? 'visible' : 'invisible pointer-events-none'}`}>
                <div
                    className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={onClose}
                />

                <aside
                    className={`absolute inset-y-0 left-0 w-[85vw] max-w-xs bg-white dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800 shadow-2xl transform transition-transform duration-300 ease-out p-6 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
                >
                    {renderSidebarContent()}
                </aside>
            </div>
        </>
    )
}
