'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useRef, useContext, useMemo } from 'react'
import { deleteBookmarkAction, updateBookmarkAction } from '@/app/actions/bookmarks'
import type { Bookmark } from '@/lib/db/bookmarks'
import { DashboardContext } from './DashboardContent'

interface BookmarkListProps {
  initialBookmarks: Bookmark[]
  userId: string
}

export default function BookmarkList({
  initialBookmarks,
  userId,
}: BookmarkListProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks)
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [connected, setConnected] = useState(false)

  const dashboardContext = useContext(DashboardContext)
  const channelRef = useRef<any>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  //filter bookmarks based on search query
  const filteredBookmarks = useMemo(() => {
    if (!searchQuery.trim()) {
      return bookmarks
    }

    const query = searchQuery.toLowerCase().trim()

    return bookmarks.filter((bookmark) => {
      //search in title
      const titleMatch = bookmark.title.toLowerCase().includes(query)

      //search in URL
      const urlMatch = bookmark.url.toLowerCase().includes(query)

      //search in domain
      const domain = getDomain(bookmark.url).toLowerCase()
      const domainMatch = domain.includes(query)

      return titleMatch || urlMatch || domainMatch
    })
  }, [bookmarks, searchQuery])

  //register optimistic callback
  useEffect(() => {
    if (dashboardContext?.optimisticAddCallbackRef) {
      dashboardContext.optimisticAddCallbackRef.current = (bookmark: Bookmark) => {
        setBookmarks((current) => {
          //don't add if already exists
          if (current.some((b) => b.id === bookmark.id)) {
            return current
          }
          return [bookmark, ...current]
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
          return [payload.new, ...current]
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
          current.map((b) => (b.id === payload.new.id ? payload.new : b))
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
    if (!confirm('Are you sure you want to delete this bookmark?')) return

    //optimistic update
    setBookmarks((current) => current.filter((b) => b.id !== id))
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

  function handleEditClick(bookmark: Bookmark) {
    setEditingId(bookmark.id)
    setEditTitle(bookmark.title)
    setEditUrl(bookmark.url)
    setEditError(null)
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
      return url
    }
  }

  function handleClearSearch() {
    setSearchQuery('')
  }

  //empty state
  if (bookmarks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookmarks yet</h3>
        <p className="text-gray-600 mb-4">Add your first bookmark using the form above</p>
        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
          connected ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></span>
          {connected ? 'Connected' : 'Connecting...'}
        </div>
      </div>
    )
  }

  const isSearching = searchQuery.trim().length > 0
  const hasNoResults = isSearching && filteredBookmarks.length === 0

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
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
            placeholder="Search bookmarks by title, URL, or domain..."
            className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />

          {isSearching && (
            <button
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              title="Clear search"
            >
              <svg
                className="h-5 w-5"
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

        {isSearching && (
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Showing <span className="font-semibold text-gray-900">{filteredBookmarks.length}</span> of{' '}
              <span className="font-semibold text-gray-900">{bookmarks.length}</span> bookmarks
            </span>
            
            {hasNoResults && (
              <span className="text-amber-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                No matches found
              </span>
            )}
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {isSearching ? 'Search Results' : 'My Bookmarks'} ({filteredBookmarks.length})
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
          <span className="text-gray-600">{connected ? 'Connected' : 'Connecting...'}</span>
        </div>
      </div>

      {/* No Results State */}
      {hasNoResults ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No bookmarks found
          </h3>
          <p className="text-gray-600 mb-4">
            No bookmarks match "{searchQuery}"
          </p>
          <button
            onClick={handleClearSearch}
            className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
          >
            Clear search
          </button>
        </div>
      ) : (
        /* Bookmarks list */
        <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
          {filteredBookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className={`p-4 hover:bg-gray-50 transition-colors ${
                deletingIds.has(bookmark.id) ? 'opacity-50' : ''
              }`}
            >
              {editingId === bookmark.id ? (
                //edit mode
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      disabled={isUpdating}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                      placeholder="Bookmark title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL
                    </label>
                    <input
                      type="url"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      disabled={isUpdating}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                      placeholder="https://example.com"
                    />
                  </div>

                  {editError && (
                    <div className="text-sm text-red-600 flex items-center gap-2">
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
                      className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {isUpdating ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isUpdating}
                      className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                //view mode
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <a
                      href={bookmark.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group"
                    >
                      <h3 className="text-base font-medium text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                        {bookmark.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-500 truncate">
                          {getDomain(bookmark.url)}
                        </p>
                        <span className="text-gray-300">•</span>
                        <p className="text-sm text-gray-400">
                          {formatDate(bookmark.created_at)}
                        </p>
                      </div>
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={bookmark.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
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
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
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
                      onClick={() => handleDelete(bookmark.id)}
                      disabled={deletingIds.has(bookmark.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}