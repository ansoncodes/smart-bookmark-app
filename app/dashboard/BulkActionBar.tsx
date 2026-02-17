'use client'

import { useState, useRef, useEffect } from 'react'
import type { Collection } from '@/lib/db/collections'

interface BulkActionBarProps {
    selectedCount: number
    allVisibleSelected: boolean
    onToggleSelectAll: () => void
    onOpenSelected: () => void
    onDelete: () => void
    isBulkDeleting: boolean
    collections: Collection[]
    onAddToCollection: (collectionId: string) => Promise<void>
    onRemoveFromCollection: () => Promise<void>
    showRemoveAction: boolean
    bookmarkCollectionMap: Record<string, string[]>
    allSelectedIds: string[]
}

export default function BulkActionBar({
    selectedCount,
    allVisibleSelected,
    onToggleSelectAll,
    onOpenSelected,
    onDelete,
    isBulkDeleting,
    collections,
    onAddToCollection,
    onRemoveFromCollection,
    showRemoveAction,
    bookmarkCollectionMap,
    allSelectedIds,
}: BulkActionBarProps) {
    const [isAdding, setIsAdding] = useState(false)
    const [targetCollectionId, setTargetCollectionId] = useState('')
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    if (selectedCount === 0) return null

    // Helper to filter collections for dropdown (exclude ones where all selected items are already present)
    // Logic: Show collections where at least ONE selected item is NOT in it.
    const relevantCollections = collections.filter((c) => {
        return allSelectedIds.some((id) => {
            const existingCollections = bookmarkCollectionMap[id] || []
            return !existingCollections.includes(c.id)
        })
    })



    return (
        <div className="sticky top-4 z-40 mb-6 animate-in fade-in slide-in-from-top-2 duration-300 fill-mode-both">
            <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-gray-200/50 dark:border-zinc-800/50 rounded-2xl shadow-xl shadow-black/5 p-2 pr-3 flex items-center justify-between gap-4 mx-auto max-w-2xl ring-1 ring-black/5 dark:ring-white/5">

                {/* Left: Selection Info */}
                <div className="flex items-center gap-3 pl-3 border-r border-gray-200 dark:border-zinc-800 pr-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${allVisibleSelected ? 'bg-black dark:bg-white border-transparent text-white dark:text-black' : 'border-gray-300 dark:border-zinc-600 group-hover:border-gray-400 dark:group-hover:border-zinc-500'}`}>
                            <input
                                type="checkbox"
                                checked={allVisibleSelected}
                                onChange={onToggleSelectAll}
                                className="sr-only"
                            />
                            {allVisibleSelected && (
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                    </label>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 tabular-nums">
                        {selectedCount} selected
                    </span>
                </div>

                {/* Center: Actions */}
                <div className="flex items-center gap-2 flex-1">
                    {/* Primary Action: Open */}
                    <button
                        onClick={onOpenSelected}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-zinc-600"
                    >
                        Open
                    </button>

                    {/* Secondary Action: Add to Collection */}
                    {relevantCollections.length > 0 && (
                        <div className="flex items-center gap-2 relative">
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    disabled={isAdding}
                                    className="flex items-center gap-2 pl-3 pr-2 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-zinc-700 disabled:opacity-50 min-w-[160px] justify-between"
                                >
                                    <span className="truncate max-w-[140px]">
                                        {targetCollectionId
                                            ? collections.find(c => c.id === targetCollectionId)?.name
                                            : 'Select collection...'}
                                    </span>
                                    <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Dropdown Menu */}
                                {isDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg shadow-xl shadow-black/10 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-left">
                                        <div className="max-h-60 overflow-y-auto py-1">
                                            {relevantCollections.map((c) => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => {
                                                        setTargetCollectionId(c.id)
                                                        setIsDropdownOpen(false)
                                                    }}
                                                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between
                               ${targetCollectionId === c.id
                                                            ? 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 font-medium'
                                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                                                        }`}
                                                >
                                                    <span className="truncate">{c.name}</span>
                                                    {targetCollectionId === c.id && (
                                                        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                disabled={!targetCollectionId || isAdding}
                                onClick={async () => {
                                    if (!targetCollectionId) return
                                    setIsAdding(true)
                                    try {
                                        await onAddToCollection(targetCollectionId)
                                        setTargetCollectionId('')
                                    } finally {
                                        setIsAdding(false)
                                    }
                                }}
                                className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-green-600/20"
                            >
                                {isAdding ? 'Adding...' : 'Add'}
                            </button>
                        </div>
                    )}

                    {/* Secondary Action: Remove from Collection */}
                    {showRemoveAction && (
                        <button
                            onClick={onRemoveFromCollection}
                            className="px-3 py-1.5 text-sm font-medium text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                        >
                            Remove
                        </button>
                    )}
                </div>

                {/* Right: Danger Action */}
                <div className="pl-4 border-l border-gray-200 dark:border-zinc-800">
                    <button
                        onClick={onDelete}
                        disabled={isBulkDeleting}
                        className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                        {isBulkDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    )
}
