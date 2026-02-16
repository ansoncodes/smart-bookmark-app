'use client'

import { createContext, useRef } from 'react'
import type { Bookmark } from '@/lib/db/bookmarks'
import AddBookmarkForm from '@/app/dashboard/AddBookmarkForm'
import BookmarkList from '@/app/dashboard/BookmarkList'

interface DashboardContextType {
  optimisticAddCallbackRef: React.MutableRefObject<((bookmark: Bookmark) => void) | null>
}

export const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

interface DashboardContentProps {
  initialBookmarks: Bookmark[]
  userId: string
}

export default function DashboardContent({
  initialBookmarks,
  userId,
}: DashboardContentProps) {
  //use a ref to store the callback to avoid state updates during render
  const optimisticAddCallbackRef = useRef<((bookmark: Bookmark) => void) | null>(null)

  const contextValue: DashboardContextType = {
    optimisticAddCallbackRef,
  }

  return (
    <DashboardContext.Provider value={contextValue}>
      <div className="space-y-6">
        {/* Add Bookmark Form */}
        <AddBookmarkForm />

        {/* Bookmark List with Real-time */}
        <BookmarkList initialBookmarks={initialBookmarks} userId={userId} />
      </div>
    </DashboardContext.Provider>
  )
}

