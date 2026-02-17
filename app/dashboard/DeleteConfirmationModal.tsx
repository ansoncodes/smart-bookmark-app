'use client'

import { useEffect, useRef } from 'react'

interface DeleteConfirmationModalProps {
  isOpen: boolean
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function DeleteConfirmationModal({
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteConfirmationModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const id = window.requestAnimationFrame(() => {
      cancelButtonRef.current?.focus()
    })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (!isDeleting) onClose()
        return
      }

      if (event.key === 'Tab') {
        const container = dialogRef.current
        if (!container) return

        const focusable = container.querySelectorAll<HTMLElement>(
          'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
        )

        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const active = document.activeElement as HTMLElement | null

        if (event.shiftKey && active === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && active === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.cancelAnimationFrame(id)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isDeleting, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-all duration-200"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleting) {
          onClose()
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-bookmark-title"
        aria-describedby="delete-bookmark-description"
        className="w-full max-w-md rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#0B0F14] shadow-xl text-gray-900 dark:text-zinc-100 transform transition-all duration-200 opacity-100 scale-100"
      >
        <div className="p-6">
          <h3
            id="delete-bookmark-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            Delete bookmark?
          </h3>
          <p
            id="delete-bookmark-description"
            className="mt-2 text-sm text-gray-500 dark:text-zinc-400"
          >
            This action cannot be undone.
          </p>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              ref={cancelButtonRef}
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              aria-label="Cancel delete"
              className="h-10 px-4 rounded-lg border border-gray-300 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              aria-label="Confirm delete bookmark"
              className="h-10 px-4 rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
