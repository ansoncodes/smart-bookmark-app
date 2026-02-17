'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useRef, useContext, useMemo } from 'react'
import { deleteBookmarkAction, togglePinBookmarkAction, updateBookmarkAction, addToCollectionAction, removeFromCollectionAction } from '@/app/actions/bookmarks'
import type { Bookmark } from '@/lib/db/bookmarks'
import type { Collection } from '@/lib/db/collections'
import { DashboardContext } from './DashboardContent'
import DeleteConfirmationModal from './DeleteConfirmationModal'
import { useLinkPreview } from './hooks/useLinkPreview'
import PreviewCard from './PreviewCard'

interface BookmarkListProps {
  initialBookmarks: Bookmark[]
  userId: string
  selectedCollectionId?: string | null
  collectionName?: string | null
  collections?: Collection[]
  bookmarkCollectionMap?: Record<string, string[]>
  onAddToCollection?: (bookmarkIds: string[], collectionId: string) => void
  onRemoveFromCollection?: (bookmarkIds: string[], collectionId: string) => void
}

function sortBookmarks(items: Bookmark[]): Bookmark[] {
  return [...items].sort((a, b) => {
    const pinDiff = Number(Boolean(b.is_pinned)) - Number(Boolean(a.is_pinned))
    if (pinDiff !== 0) return pinDiff

    const timeA = new Date(a.created_at).getTime()
    const timeB = new Date(b.created_at).getTime()
    return timeB - timeA
  })
}

export default function BookmarkList({
  initialBookmarks,
  userId,
  selectedCollectionId,
  collectionName,
  collections = [],
  bookmarkCollectionMap = {},
  onAddToCollection,
  onRemoveFromCollection,
}: BookmarkListProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(sortBookmarks(initialBookmarks))
  const [sortBy, setSortBy] = useState('newest')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [bulkCollectionId, setBulkCollectionId] = useState('')
  const [isAddingToCollection, setIsAddingToCollection] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [pinningIds, setPinningIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [connected, setConnected] = useState(false)
  const [deleteModalBookmarkId, setDeleteModalBookmarkId] = useState<string | null>(null)

  const dashboardContext = useContext(DashboardContext)
  const channelRef = useRef<any>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Link preview on hover
  const { preview, isLoading: previewLoading, error: previewError, visible: previewVisible, handleMouseEnter: onPreviewEnter, handleMouseLeave: onPreviewLeave } = useLinkPreview()
  const [hoveredBookmarkId, setHoveredBookmarkId] = useState<string | null>(null)
  const [previewShowAbove, setPreviewShowAbove] = useState(false)

  //filter bookmarks based on collection and search query
  const filteredBookmarks = useMemo(() => {
    //first filter by collection using junction table map
    let items = bookmarks
    if (selectedCollectionId) {
      items = items.filter((b) => {
        const collectionIds = bookmarkCollectionMap[b.id] || []
        return collectionIds.includes(selectedCollectionId)
      })
    }

    //then filter by search
    if (!searchQuery.trim()) {
      return items
    }

    const query = searchQuery.toLowerCase().trim()

    return items.filter((bookmark) => {
      //search in title
      const titleMatch = bookmark.title.toLowerCase().includes(query)

      //search in URL
      const urlMatch = bookmark.url.toLowerCase().includes(query)

      //search in domain
      const domain = getDomain(bookmark.url).toLowerCase()
      const domainMatch = domain.includes(query)

      return titleMatch || urlMatch || domainMatch
    })
  }, [bookmarks, searchQuery, selectedCollectionId, bookmarkCollectionMap])

  const sortedBookmarks = useMemo(() => {
    const items = [...filteredBookmarks]

    items.sort((a, b) => {
      if (Boolean(a.is_pinned) !== Boolean(b.is_pinned)) {
        return Boolean(b.is_pinned) ? 1 : -1
      }

      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }

      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }

      if (sortBy === 'az') {
        return a.title.localeCompare(b.title)
      }

      return 0
    })

    return items
  }, [filteredBookmarks, sortBy])

  //register optimistic callback
  useEffect(() => {
    if (dashboardContext?.optimisticAddCallbackRef) {
      dashboardContext.optimisticAddCallbackRef.current = (bookmark: Bookmark) => {
        setBookmarks((current) => {
          //don't add if already exists
          if (current.some((b) => b.id === bookmark.id)) {
            return current
          }
          return sortBookmarks([bookmark, ...current])
        })
      }
    }
  }, [dashboardContext])

  //subscribe to real-time updates
  useEffect(() => {
    console.log('[BookmarkList] Setting up subscription for userId:', userId)

    const supabase = createClient()

    //create the channel
    const channel = supabase.channel(`bookmarks-${userId}`)

    //handle INSERT events
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'bookmarks' },
      (payload: any) => {
        console.log('[BookmarkList] INSERT event received')

        //only add if it belongs to this user
        if (payload.new.user_id !== userId) {
          return
        }

        setBookmarks((current) => {
          //check if already exists
          if (current.some((b) => b.id === payload.new.id)) {
            return current
          }
          //add to the beginning
          return sortBookmarks([payload.new, ...current])
        })
      }
    )

    //handle UPDATE events
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'bookmarks' },
      (payload: any) => {
        console.log('[BookmarkList] UPDATE event received')

        if (payload.new.user_id !== userId) {
          return
        }

        setBookmarks((current) =>
          sortBookmarks(
            current.map((b) => (b.id === payload.new.id ? payload.new : b))
          )
        )
        setEditingId(null)
      }
    )

    //handle DELETE events
    channel.on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'bookmarks' },
      (payload: any) => {
        console.log('[BookmarkList] DELETE event received')

        setBookmarks((current) => current.filter((b) => b.id !== payload.old.id))
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.delete(payload.old.id)
          return next
        })
      }
    )

    //subscribe to the channel
    channel.subscribe((status: string) => {
      console.log('[BookmarkList] Subscription status:', status)

      if (status === 'SUBSCRIBED') {
        console.log('[BookmarkList] Successfully connected to real-time')
        setConnected(true)
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[BookmarkList] Channel error, will retry')
        setConnected(false)
        attemptReconnect()
      } else if (status === 'CLOSED') {
        console.log('[BookmarkList] Channel closed')
        setConnected(false)
      }
    })

    channelRef.current = channel

    //cleanup function
    return () => {
      console.log('[BookmarkList] Cleaning up subscription')
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [userId])

  //handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !connected) {
        console.log('[BookmarkList] Tab is visible again, reconnecting...')
        reconnect()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [connected])

  //attempt to reconnect with delay
  const attemptReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    console.log('[BookmarkList] Attempting to reconnect in 3 seconds...')
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnect()
    }, 3000)
  }

  //reconnect by recreating subscription
  const reconnect = () => {
    if (channelRef.current) {
      const supabase = createClient()
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    //this will trigger the useEffect again
    setConnected(false)
  }

  async function handleDelete(id: string) {
    //optimistic update
    setBookmarks((current) => current.filter((b) => b.id !== id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setDeletingIds((prev) => new Set(prev).add(id))

    try {
      await deleteBookmarkAction(id)
      console.log('[BookmarkList] Bookmark deleted successfully')
    } catch (error) {
      console.error('Failed to delete bookmark:', error)
      alert('Failed to delete bookmark')
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  function openDeleteModal(id: string) {
    setDeleteModalBookmarkId(id)
  }

  function closeDeleteModal() {
    if (deleteModalBookmarkId && deletingIds.has(deleteModalBookmarkId)) {
      return
    }
    setDeleteModalBookmarkId(null)
  }

  async function confirmDeleteFromModal() {
    if (!deleteModalBookmarkId) return
    await handleDelete(deleteModalBookmarkId)
    setDeleteModalBookmarkId(null)
  }

  async function handleCopy(id: string, url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)

      window.setTimeout(() => {
        setCopiedId(null)
      }, 1500)
    } catch (error) {
      console.error('Copy failed:', error)
      alert('Failed to copy link')
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleSelectAllVisible() {
    const visibleIds = filteredBookmarks.map((b) => b.id)
    const allVisibleSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))

    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        for (const id of visibleIds) {
          next.delete(id)
        }
      } else {
        for (const id of visibleIds) {
          next.add(id)
        }
      }
      return next
    })
  }

  async function handleBulkDelete() {
    if (!confirm('Delete selected bookmarks?')) return

    setIsBulkDeleting(true)
    try {
      for (const id of selectedIds) {
        await deleteBookmarkAction(id)
      }
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Bulk delete failed:', error)
      alert('Failed to delete some bookmarks')
    } finally {
      setIsBulkDeleting(false)
    }
  }

  function handleEditClick(bookmark: Bookmark) {
    setEditingId(bookmark.id)
    setEditTitle(bookmark.title)
    setEditUrl(bookmark.url)
    setEditError(null)
  }

  async function handleTogglePin(bookmark: Bookmark) {
    setPinningIds((prev) => new Set(prev).add(bookmark.id))
    const previousPinned = Boolean(bookmark.is_pinned)

    //optimistic update so pin status changes instantly.
    setBookmarks((current) =>
      sortBookmarks(
        current.map((b) =>
          b.id === bookmark.id ? { ...b, is_pinned: !previousPinned } : b
        )
      )
    )

    try {
      await togglePinBookmarkAction(bookmark.id, previousPinned)
    } catch (error) {
      console.error('Failed to toggle pin:', error)
      //rollback optimistic change on failure.
      setBookmarks((current) =>
        sortBookmarks(
          current.map((b) =>
            b.id === bookmark.id ? { ...b, is_pinned: previousPinned } : b
          )
        )
      )
      alert('Failed to toggle pin')
    } finally {
      setPinningIds((prev) => {
        const next = new Set(prev)
        next.delete(bookmark.id)
        return next
      })
    }
  }

  function handleCancelEdit() {
    setEditingId(null)
    setEditTitle('')
    setEditUrl('')
    setEditError(null)
  }

  async function handleUpdate(id: string) {
    setEditError(null)

    //validate
    if (!editTitle.trim()) {
      setEditError('Title is required')
      return
    }

    if (!editUrl.trim()) {
      setEditError('URL is required')
      return
    }

    //validate URL format
    try {
      new URL(editUrl)
    } catch {
      setEditError('Please enter a valid URL')
      return
    }

    setIsUpdating(true)

    const formData = new FormData()
    formData.append('title', editTitle)
    formData.append('url', editUrl)

    try {
      await updateBookmarkAction(id, formData)
      console.log('[BookmarkList] Bookmark updated successfully')
    } catch (error) {
      console.error('Failed to update bookmark:', error)
      setEditError('Failed to update bookmark')
    } finally {
      setIsUpdating(false)
    }
  }

  function formatDate(dateString: string) {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

      if (diffInSeconds < 60) return 'Just now'
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
      return date.toLocaleDateString()
    } catch (error) {
      return 'Unknown date'
    }
  }

  function getDomain(url: string) {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.replace('www.', '')
    } catch (error) {
      return ''
    }
  }

  function handleClearSearch() {
    setSearchQuery('')
  }

  function handleAddFirstBookmarkClick() {
    const formSection = document.getElementById('add-bookmark-form')
    const titleInput = document.getElementById('add-bookmark-title') as HTMLInputElement | null

    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    if (titleInput) {
      //delay focus slightly to avoid interrupting smooth scroll.
      window.setTimeout(() => {
        titleInput.focus()
      }, 250)
    }
  }

  //empty state
  if (bookmarks.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm p-12 md:p-14 min-h-[320px] flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center shadow-sm mb-6">
          <svg className="w-10 h-10 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white mb-3">
          No bookmarks yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-8">
          Start building your personal link library. Save articles, tools, and resources in one place.
        </p>
        <button
          onClick={handleAddFirstBookmarkClick}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-green-500 hover:bg-green-600 text-black font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-950"
        >
          + Add your first bookmark
        </button>
      </div>
    )
  }

  const isSearching = searchQuery.trim().length > 0
  const hasNoResults = isSearching && filteredBookmarks.length === 0
  const allVisibleSelected =
    filteredBookmarks.length > 0 &&
    filteredBookmarks.every((bookmark) => selectedIds.has(bookmark.id))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {collectionName || 'All Bookmarks'}
          </h2>
        </div>

        <div className="relative w-full md:w-auto md:flex-1 md:max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-4 w-4 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bookmarks..."
            className="h-10 w-full pl-9 pr-9 border border-gray-300 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all duration-200"
          />

          {isSearching && (
            <button
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              title="Clear search"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 md:justify-end">
          <div className="flex items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">Sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 dark:border-zinc-800 rounded-md px-3 py-1 text-sm bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/30 transition-all duration-200"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="az">A-Z</option>
            </select>
          </div>
          <span className="inline-flex items-center px-3 py-1 text-xs bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full">
            {/* Show total count for current context (All or Collection), ignoring search */}
            {selectedCollectionId
              ? bookmarks.filter((b) => (bookmarkCollectionMap[b.id] || []).includes(selectedCollectionId)).length
              : bookmarks.length} bookmarks
          </span>
        </div>
      </div>

      {
        isSearching && (
          <p className="text-sm text-gray-400 mb-3 transition-all duration-200">
            {hasNoResults
              ? 'No results found'
              : `Showing ${sortedBookmarks.length} results`}
          </p>
        )
      }

      <div className="flex items-center gap-3 md:justify-end">
        {/* Bulk actions bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 px-3 py-2 rounded-lg">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAllVisible}
                className="w-4 h-4 accent-green-500"
              />
              Select all
            </label>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {selectedIds.size} selected
            </span>

            {/* Add to Collection */}
            {collections.length > 0 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={bulkCollectionId}
                  onChange={(e) => setBulkCollectionId(e.target.value)}
                  className="border border-gray-300 dark:border-zinc-700 rounded-md px-2 py-1.5 text-sm bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/30 transition-all duration-200"
                >
                  <option value="">Select collection</option>
                  {collections
                    .filter((c) => {
                      //only show collections where at least one selected bookmark is NOT already in it
                      const ids = Array.from(selectedIds)
                      return ids.some((id) => !(bookmarkCollectionMap[id] || []).includes(c.id))
                    })
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                <button
                  disabled={!bulkCollectionId || isAddingToCollection}
                  onClick={async () => {
                    if (!bulkCollectionId) return
                    const ids = Array.from(selectedIds)
                    setIsAddingToCollection(true)
                    try {
                      await addToCollectionAction(ids, bulkCollectionId)
                      onAddToCollection?.(ids, bulkCollectionId)
                      setSelectedIds(new Set())
                      setBulkCollectionId('')
                    } catch (err) {
                      console.error('Failed to add bookmarks to collection:', err)
                    } finally {
                      setIsAddingToCollection(false)
                    }
                  }}
                  className="bg-green-500 text-black px-3 py-1.5 rounded-md text-sm hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isAddingToCollection ? 'Adding...' : 'Add'}
                </button>
              </div>
            )}

            {/* Remove from current collection */}
            {selectedCollectionId && (
              <button
                onClick={async () => {
                  const ids = Array.from(selectedIds)
                  try {
                    await removeFromCollectionAction(ids, selectedCollectionId)
                    onRemoveFromCollection?.(ids, selectedCollectionId)
                    setSelectedIds(new Set())
                  } catch (err) {
                    console.error('Failed to remove bookmarks from collection:', err)
                  }
                }}
                className="bg-yellow-500 text-black px-3 py-1.5 rounded-md text-sm hover:bg-yellow-600 transition-all duration-200"
              >
                Remove from collection
              </button>
            )}

            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-red-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isBulkDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      {/* Bookmarks list */}
      <div className="space-y-4">
        {sortedBookmarks.map((bookmark) => {
          const domain = getDomain(bookmark.url)
          const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`

          return (
            <div
              key={bookmark.id}
              className={`group relative bg-white dark:bg-zinc-900 border rounded-xl shadow-sm p-5 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:shadow-md hover:scale-[1.01] cursor-pointer transition-all duration-200 ${bookmark.is_pinned
                ? 'border-green-300 dark:border-green-700/70'
                : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
                } ${deletingIds.has(bookmark.id) ? 'opacity-50' : ''
                } ${hoveredBookmarkId === bookmark.id ? 'z-50' : ''
                }`}
              onMouseEnter={(e) => {
                if (editingId !== bookmark.id) {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const spaceBelow = window.innerHeight - rect.bottom
                  setPreviewShowAbove(spaceBelow < 280)
                  setHoveredBookmarkId(bookmark.id)
                  onPreviewEnter(bookmark.url)
                }
              }}
              onMouseLeave={() => {
                setHoveredBookmarkId(null)
                onPreviewLeave()
              }}
            >
              {editingId === bookmark.id ? (
                //edit mode
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(bookmark.id)}
                      onChange={() => toggleSelect(bookmark.id)}
                      className="w-4 h-4 accent-green-500"
                      disabled={isBulkDeleting}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Select
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      disabled={isUpdating}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30 disabled:opacity-50 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white transition-all duration-200"
                      placeholder="Bookmark title"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">
                      URL
                    </label>
                    <input
                      type="url"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      disabled={isUpdating}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30 disabled:opacity-50 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white transition-all duration-200"
                      placeholder="https://example.com"
                    />
                  </div>

                  {editError && (
                    <div className="text-sm text-red-400 flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {editError}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate(bookmark.id)}
                      disabled={isUpdating}
                      className="flex-1 bg-green-500 text-black px-4 py-2 rounded-lg font-medium hover:bg-green-600 hover:scale-[1.01] disabled:opacity-50 transition-all duration-200"
                    >
                      {isUpdating ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isUpdating}
                      className="px-4 py-2 border border-gray-300 dark:border-zinc-800 rounded-lg font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                //view mode
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Checkbox column - fixed width */}
                    <div className="w-5 flex justify-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(bookmark.id)}
                        onChange={() => toggleSelect(bookmark.id)}
                        className="w-4 h-4 accent-green-500 opacity-70 hover:opacity-100 transition"
                        disabled={isBulkDeleting}
                      />
                    </div>

                    {/* Icon column - fixed width with fallback */}
                    <div className="w-8 h-8 rounded-md border border-gray-700 bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                        {(domain.charAt(0) || '?').toUpperCase()}
                      </div>
                      <img
                        src={faviconUrl}
                        alt={domain || 'Website icon'}
                        className="absolute inset-0 w-8 h-8 rounded-md bg-gray-800 object-contain transition-transform duration-200 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>

                    {/* Text column - flexible */}
                    <a
                      href={bookmark.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-0"
                    >
                      <h3 className="text-base font-semibold tracking-tight text-gray-900 dark:text-white group-hover:text-green-400 transition-all duration-200 truncate">
                        {bookmark.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {domain || 'Unknown domain'}
                        </p>
                        <span className="text-gray-500 dark:text-gray-400">&middot;</span>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(bookmark.created_at)}
                        </p>
                      </div>
                    </a>
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePin(bookmark)}
                      disabled={pinningIds.has(bookmark.id)}
                      className={`p-2 hover:scale-110 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${bookmark.is_pinned
                        ? 'text-green-600 dark:text-green-500 hover:text-green-500'
                        : 'text-gray-500 dark:text-gray-400 hover:text-green-500'
                        }`}
                      title={bookmark.is_pinned ? 'Unpin bookmark' : 'Pin bookmark'}
                    >
                      {bookmark.is_pinned ? (
                        <svg
                          className="w-5 h-5 text-green-500"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.784 1.4 8.168L12 19.296l-7.334 3.866 1.4-8.168L.132 9.21l8.2-1.192L12 .587z" />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.364 1.118l1.519 4.674c.3.921-.755 1.688-1.539 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.539-1.118l1.519-4.674a1 1 0 00-.364-1.118L2.078 10.1c-.783-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.518-4.674z"
                          />
                        </svg>
                      )}
                    </button>

                    <a
                      href={bookmark.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-green-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-all duration-200"
                      title="Open link"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>

                    <button
                      onClick={() => handleEditClick(bookmark)}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-green-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-all duration-200"
                      title="Edit bookmark"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>

                    <button
                      onClick={() => handleCopy(bookmark.id, bookmark.url)}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-all duration-200"
                      title="Copy link"
                    >
                      {copiedId === bookmark.id ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth={2} />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                          />
                        </svg>
                      )}
                    </button>

                    <button
                      onClick={() => openDeleteModal(bookmark.id)}
                      disabled={deletingIds.has(bookmark.id)}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete bookmark"
                    >
                      {deletingIds.has(bookmark.id) ? (
                        <svg
                          className="w-5 h-5 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Peek Preview */}
              {hoveredBookmarkId === bookmark.id && (
                <PreviewCard
                  preview={preview}
                  isLoading={previewLoading}
                  error={previewError}
                  visible={previewVisible}
                  showAbove={previewShowAbove}
                />
              )}
            </div>
          )
        })}
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModalBookmarkId !== null}
        isDeleting={deleteModalBookmarkId ? deletingIds.has(deleteModalBookmarkId) : false}
        onClose={closeDeleteModal}
        onConfirm={confirmDeleteFromModal}
      />

    </div >
  )
}
