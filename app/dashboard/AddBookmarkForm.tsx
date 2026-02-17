'use client'

import { addBookmarkAction } from '@/app/actions/bookmarks'
import { useState, useRef, useContext } from 'react'
import type { Bookmark } from '@/lib/db/bookmarks'
import { DashboardContext } from './DashboardContent'

interface AddBookmarkFormProps {
  onBookmarkAdded?: (bookmark: Bookmark) => void
}

export default function AddBookmarkForm({ onBookmarkAdded }: AddBookmarkFormProps) {
  const dashboardContext = useContext(DashboardContext)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

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
      }

      // Clear form on success
      formRef.current?.reset()

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

  return (
    <div
      id="add-bookmark-form"
      className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm p-5 transition-all duration-200"
    >
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">
        Add New Bookmark
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Save a new link to your library.
      </p>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label
            htmlFor="add-bookmark-title"
            className="block text-xs text-gray-500 dark:text-gray-400 font-medium mb-2"
          >
            Title
          </label>
          <input
            type="text"
            id="add-bookmark-title"
            name="title"
            placeholder="My Favorite Website"
            disabled={loading}
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
            className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          />
        </div>

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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-500 hover:bg-green-500 hover:scale-[1.005] hover:shadow-[0_0_16px_rgba(34,197,94,0.28)] text-black font-medium px-6 py-3 rounded-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Add Bookmark</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}


