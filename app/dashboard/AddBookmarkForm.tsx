'use client'

import { addBookmarkAction } from '@/app/actions/bookmarks'
import { useState, useRef, useContext, useEffect, useCallback } from 'react'
import type { Bookmark } from '@/lib/db/bookmarks'
import type { Collection } from '@/lib/db/collections'
import { DashboardContext } from './DashboardContent'
import { normalizeUrl, isValidUrl } from '@/lib/utils/url'

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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)
  const [overflowVisible, setOverflowVisible] = useState(false)

  const measureHeight = useCallback(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [])

  useEffect(() => {
    if (isExpanded) {
      measureHeight()
      const timer = setTimeout(measureHeight, 50)
      // Allow overflow after animation completes so dropdown isn't clipped
      const overflowTimer = setTimeout(() => setOverflowVisible(true), 850)
      return () => { clearTimeout(timer); clearTimeout(overflowTimer) }
    } else {
      setOverflowVisible(false)
    }
  }, [isExpanded, measureHeight])

  useEffect(() => {
    if (isExpanded && titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current?.focus()
      }, 300)
    }
  }, [isExpanded])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  // Close dropdown when form collapses
  useEffect(() => {
    if (!isExpanded) setDropdownOpen(false)
  }, [isExpanded])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(event.currentTarget)
    const title = formData.get('title') as string
    const url = formData.get('url') as string

    if (!title || title.trim() === '') {
      setError('Please enter a title')
      setLoading(false)
      return
    }

    const normalizedUrl = normalizeUrl(url)

    if (!isValidUrl(normalizedUrl)) {
      setError('Please enter a valid URL (e.g., example.com or https://example.com)')
      setLoading(false)
      return
    }

    try {
      // Re-create FormData with normalized URL
      const finalFormData = new FormData()
      finalFormData.append('title', title)
      finalFormData.append('url', normalizedUrl)
      if (formData.get('description')) {
        finalFormData.append('description', formData.get('description') as string)
      }
      if (formData.get('collection_id')) {
        finalFormData.append('collection_id', formData.get('collection_id') as string)
      }

      const bookmark = await addBookmarkAction(finalFormData)

      if (bookmark) {
        if (dashboardContext?.optimisticAddCallbackRef.current) {
          dashboardContext.optimisticAddCallbackRef.current(bookmark)
        }
        if (onBookmarkAdded) {
          onBookmarkAdded(bookmark)
        }
        if (collectionId && onAddToCollection) {
          onAddToCollection([bookmark.id], collectionId)
        }
      }

      formRef.current?.reset()
      setCollectionId(selectedCollectionId || '')
      setIsExpanded(false)

      // Toast notification
      const toast = document.createElement('div')
      toast.className =
        'fixed top-4 right-4 bg-gray-100 dark:bg-white/[0.08] backdrop-blur-xl border border-gray-200 dark:border-white/[0.1] text-gray-800 dark:text-white/90 px-5 py-3 rounded-xl z-50 flex items-center gap-2.5 text-sm shadow-sm'
      toast.innerHTML = `
        <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        <span>Bookmark added</span>
      `
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 2500)
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

  // Shared input classes — light + dark
  const inputClass =
    'w-full px-3 py-2 text-sm rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ' +
    'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 ' +
    'focus:outline-none focus:border-gray-400 focus:bg-white focus:ring-1 focus:ring-gray-200 ' +
    'dark:bg-white/[0.04] dark:border-white/[0.08] dark:text-white/90 dark:placeholder-white/30 ' +
    'dark:focus:border-white/[0.2] dark:focus:bg-white/[0.06] dark:focus:ring-0'

  return (
    <div id="add-bookmark-form">
      {/* Collapsed state */}
      <div
        className="transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          maxHeight: isExpanded ? '0px' : '64px',
          opacity: isExpanded ? 0 : 1,
          overflow: 'hidden',
          transform: isExpanded ? 'translateY(-6px)' : 'translateY(0)',
        }}
      >
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full group rounded-2xl px-4 py-3 transition-all duration-200 flex items-center gap-3 text-left bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 dark:bg-white/[0.03] dark:border-white/[0.08] dark:hover:bg-white/[0.06] dark:hover:border-white/[0.14]"
          tabIndex={isExpanded ? -1 : 0}
        >
          <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/15 transition-all duration-200">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-white/80">Add Bookmark</p>
            <p className="text-xs text-gray-500 dark:text-white/40">Save a new link to your library</p>
          </div>
        </button>
      </div>

      {/* Expanded state */}
      <div
        className={`transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${overflowVisible ? 'overflow-visible' : 'overflow-hidden'}`}
        style={{
          maxHeight: isExpanded ? `${contentHeight + 40}px` : '0px',
          opacity: isExpanded ? 1 : 0,
          transform: isExpanded ? 'translateY(0)' : 'translateY(-10px)',
        }}
      >
        <div
          ref={contentRef}
          className="rounded-2xl p-4 bg-white border border-gray-200 dark:bg-white/[0.03] dark:border-white/[0.08]"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-medium text-gray-800 dark:text-white/80">New Bookmark</h2>
              <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">Save a link to your library</p>
            </div>
            <button
              onClick={handleCancel}
              className="p-1.5 rounded-lg transition-colors duration-150 hover:bg-gray-200 dark:hover:bg-white/[0.06]"
              title="Close"
              tabIndex={isExpanded ? 0 : -1}
            >
              <svg className="w-4 h-4 text-gray-400 dark:text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Title */}
              <div className="flex-1">
                <label htmlFor="add-bookmark-title" className="block text-xs text-gray-500 dark:text-white/50 mb-1.5">
                  Title
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  id="add-bookmark-title"
                  name="title"
                  placeholder="e.g. My Favorite Article"
                  disabled={loading}
                  tabIndex={isExpanded ? 0 : -1}
                  className={inputClass}
                />
              </div>

              {/* URL */}
              <div className="flex-1">
                <label htmlFor="url" className="block text-xs text-gray-500 dark:text-white/50 mb-1.5">
                  URL
                </label>
                <input
                  type="text"
                  id="url"
                  name="url"
                  placeholder="https://example.com"
                  disabled={loading}
                  tabIndex={isExpanded ? 0 : -1}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-xs text-gray-500 dark:text-white/50 mb-1.5">
                Description
                <span className="text-gray-400 dark:text-white/25 ml-1">optional</span>
              </label>
              <textarea
                id="description"
                name="description"
                placeholder="Add a short note..."
                rows={2}
                disabled={loading}
                tabIndex={isExpanded ? 0 : -1}
                className={`${inputClass} resize-none`}
              />
            </div>

            {/* Collection selector — custom dropdown */}
            {collections.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                <label className="block text-xs text-gray-500 dark:text-white/50 mb-1.5">
                  Collection
                  <span className="text-gray-400 dark:text-white/25 ml-1">optional</span>
                </label>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  disabled={loading}
                  tabIndex={isExpanded ? 0 : -1}
                  className={`${inputClass} appearance-none cursor-pointer pr-8 text-left relative`}
                >
                  <span className={collectionId ? 'text-gray-900 dark:text-white/90' : 'text-gray-400 dark:text-white/30'}>
                    {collectionId ? collections.find(c => c.id === collectionId)?.name || 'None' : 'None'}
                  </span>
                  <svg className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/30 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown menu */}
                {dropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-xl overflow-hidden border bg-white border-gray-200 shadow-lg dark:bg-zinc-900 dark:border-white/[0.1] dark:shadow-black/30">
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => { setCollectionId(''); setDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors duration-100 ${collectionId === ''
                          ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/[0.06]'
                          }`}
                      >
                        None
                      </button>
                      {collections.map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => { setCollectionId(c.id); setDropdownOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors duration-100 ${collectionId === c.id
                            ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/[0.06]'
                            }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <input type="hidden" name="collection_id" value={collectionId} />

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 text-red-600 dark:text-red-400/90 bg-red-50 dark:bg-red-500/[0.06] border border-red-200 dark:border-red-500/[0.1] rounded-lg px-3 py-2.5">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs">{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                tabIndex={isExpanded ? 0 : -1}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Adding…</span>
                  </>
                ) : (
                  <span>Add Bookmark</span>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                tabIndex={isExpanded ? 0 : -1}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 bg-transparent border border-gray-200 hover:bg-gray-100 hover:text-gray-800 dark:text-white/60 dark:border-white/[0.1] dark:hover:bg-white/[0.05] dark:hover:text-white/80"
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
