'use client'

import { addBookmarkAction } from '@/app/actions/bookmarks'
import { useState, useRef, useContext, useEffect, useCallback } from 'react'
import type { Bookmark } from '@/lib/db/bookmarks'
import type { Collection } from '@/lib/db/collections'
import { DashboardContext } from './DashboardContent'

interface AddBookmarkFormProps {
  onBookmarkAdded?: (bookmark: Bookmark) => void
  collections?: Collection[]
  selectedCollectionId?: string | null
  onAddToCollection?: (bookmarkIds: string[], collectionId: string) => void
}

export default function AddBookmarkForm({ onBookmarkAdded, collections = [], selectedCollectionId, onAddToCollection }: AddBookmarkFormProps) {
  const dashboardContext = useContext(DashboardContext)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [collectionId, setCollectionId] = useState<string>(selectedCollectionId || '')
  const [isExpanded, setIsExpanded] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)

  // Measure the form content height whenever expanded state changes
  const measureHeight = useCallback(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [])

  useEffect(() => {
    if (isExpanded) {
      measureHeight()
      // Also re-measure after a brief delay in case content isn't fully rendered
      const timer = setTimeout(measureHeight, 50)
      return () => clearTimeout(timer)
    }
  }, [isExpanded, measureHeight])

  // Auto-focus title input when expanded
  useEffect(() => {
    if (isExpanded && titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current?.focus()
      }, 300)
    }
  }, [isExpanded])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(event.currentTarget)
    const title = formData.get('title') as string
    const url = formData.get('url') as string

    //client-side validation
    if (!title || title.trim() === '') {
      setError('Please enter a title')
      setLoading(false)
      return
    }

    if (!url || url.trim() === '') {
      setError('Please enter a URL')
      setLoading(false)
      return
    }

    //validate URL format
    try {
      new URL(url)
    } catch {
      setError('Please enter a valid URL (e.g., https://example.com)')
      setLoading(false)
      return
    }

    try {
      const bookmark = await addBookmarkAction(formData)

      if (bookmark) {
        if (dashboardContext?.optimisticAddCallbackRef.current) {
          dashboardContext.optimisticAddCallbackRef.current(bookmark)
        }
        if (onBookmarkAdded) {
          onBookmarkAdded(bookmark)
        }
        //update collection mapping if a collection was selected
        if (collectionId && onAddToCollection) {
          onAddToCollection([bookmark.id], collectionId)
        }
      }

      // Clear form and collapse on success
      formRef.current?.reset()
      setCollectionId(selectedCollectionId || '')
      setIsExpanded(false)

      // Show success message briefly
      const successMessage = document.createElement('div')
      successMessage.className =
        'fixed top-4 right-4 bg-green-500 text-black px-6 py-3 rounded-lg shadow-sm z-50 flex items-center gap-2'
      successMessage.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        <span>Bookmark added successfully!</span>
      `
      document.body.appendChild(successMessage)

      setTimeout(() => {
        successMessage.remove()
      }, 3000)
    } catch (err) {
      console.error('[AddBookmarkForm] Error adding bookmark:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to add bookmark. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  function handleCancel() {
    setIsExpanded(false)
    setError(null)
    formRef.current?.reset()
    setCollectionId(selectedCollectionId || '')
  }

  return (
    <div id="add-bookmark-form">
      {/* Collapsed state - Always in DOM, hidden when expanded */}
      <div
        className="transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          maxHeight: isExpanded ? '0px' : '80px',
          opacity: isExpanded ? 0 : 1,
          overflow: 'hidden',
          transform: isExpanded ? 'translateY(-8px)' : 'translateY(0)',
        }}
      >
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full group bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 rounded-xl px-5 py-3.5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 flex items-center gap-3 text-left"
          tabIndex={isExpanded ? -1 : 0}
        >
          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-all duration-300">
            <svg
              className="w-5 h-5 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Add Bookmark
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Press to add a new link to your library
            </p>
          </div>

        </button>
      </div>

      {/* Expanded state - Always in DOM, slides down smoothly */}
      <div
        className="transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] overflow-hidden"
        style={{
          maxHeight: isExpanded ? `${contentHeight + 40}px` : '0px',
          opacity: isExpanded ? 1 : 0,
          transform: isExpanded ? 'translateY(0)' : 'translateY(-12px)',
        }}
      >
        <div
          ref={contentRef}
          className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm p-5"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Add New Bookmark
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Save a new link to your library
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
              title="Close"
              tabIndex={isExpanded ? 0 : -1}
            >
              <svg
                className="w-5 h-5 text-gray-500"
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
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label
                htmlFor="add-bookmark-title"
                className="block text-xs text-gray-500 dark:text-gray-400 font-medium mb-2"
              >
                Title
              </label>
              <input
                ref={titleInputRef}
                type="text"
                id="add-bookmark-title"
                name="title"
                placeholder="My Favorite Website"
                disabled={loading}
                tabIndex={isExpanded ? 0 : -1}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              />
            </div>

            <div>
              <label
                htmlFor="url"
                className="block text-xs text-gray-500 dark:text-gray-400 font-medium mb-2"
              >
                URL
              </label>
              <input
                type="url"
                id="url"
                name="url"
                placeholder="https://example.com"
                disabled={loading}
                tabIndex={isExpanded ? 0 : -1}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-xs text-gray-500 dark:text-gray-400 font-medium mb-2"
              >
                Description (optional)
              </label>
              <textarea
                id="description"
                name="description"
                placeholder="Add a note or description about this bookmark..."
                rows={3}
                disabled={loading}
                tabIndex={isExpanded ? 0 : -1}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 resize-vertical"
              />
            </div>

            {/* Collection selector */}
            {collections.length > 0 && (
              <div>
                <label
                  htmlFor="collection"
                  className="block text-xs text-gray-500 dark:text-gray-400 font-medium mb-2"
                >
                  Collection (optional)
                </label>
                <select
                  id="collection"
                  value={collectionId}
                  onChange={(e) => setCollectionId(e.target.value)}
                  disabled={loading}
                  tabIndex={isExpanded ? 0 : -1}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <option value="">No collection</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Hidden input for collection_id */}
            <input type="hidden" name="collection_id" value={collectionId} />

            {error && (
              <div className="bg-red-50 dark:bg-zinc-950 border border-red-300 dark:border-red-900/50 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-start gap-2">
                <svg
                  className="w-5 h-5 flex-shrink-0 mt-0.5"
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
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                tabIndex={isExpanded ? 0 : -1}
                className="flex-1 bg-green-500 hover:bg-green-600 hover:scale-[1.01] text-black font-medium px-6 py-2.5 rounded-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
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
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
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
                    <span>Add Bookmark</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                tabIndex={isExpanded ? 0 : -1}
                className="px-6 py-2.5 border border-gray-300 dark:border-zinc-800 rounded-lg font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
