'use client'

import { createContext, useRef, useState, useMemo, useCallback } from 'react'
import type { Bookmark } from '@/lib/db/bookmarks'
import type { Collection } from '@/lib/db/collections'
import type { BookmarkCollection } from '@/lib/db/bookmarkCollections'
import AddBookmarkForm from '@/app/dashboard/AddBookmarkForm'
import BookmarkList from '@/app/dashboard/BookmarkList'
import Sidebar from '@/app/dashboard/Sidebar'

interface DashboardContextType {
  optimisticAddCallbackRef: React.MutableRefObject<((bookmark: Bookmark) => void) | null>
}

export const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

interface DashboardContentProps {
  initialBookmarks: Bookmark[]
  initialCollections: Collection[]
  initialBookmarkCollections: BookmarkCollection[]
  userId: string
}

export default function DashboardContent({
  initialBookmarks,
  initialCollections,
  initialBookmarkCollections,
  userId,
}: DashboardContentProps) {
  //use a ref to store the callback to avoid state updates during render
  const optimisticAddCallbackRef = useRef<((bookmark: Bookmark) => void) | null>(null)

  const [collections, setCollections] = useState<Collection[]>(initialCollections)
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)
  const [bookmarkCollections, setBookmarkCollections] = useState<BookmarkCollection[]>(initialBookmarkCollections)

  const contextValue: DashboardContextType = {
    optimisticAddCallbackRef,
  }

  //get the name of the selected collection
  const selectedCollectionName = useMemo(() => {
    if (!selectedCollectionId) return null
    const found = collections.find((c) => c.id === selectedCollectionId)
    return found?.name || null
  }, [selectedCollectionId, collections])

  //build a map of bookmark_id -> collection_ids for fast lookup
  const bookmarkCollectionMap = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const bc of bookmarkCollections) {
      if (!map[bc.bookmark_id]) {
        map[bc.bookmark_id] = []
      }
      map[bc.bookmark_id].push(bc.collection_id)
    }
    return map
  }, [bookmarkCollections])

  function handleCollectionCreated(collection: Collection) {
    setCollections((prev) => [...prev, collection])
  }

  //add bookmarks to a collection (update local state)
  const handleAddToCollection = useCallback((bookmarkIds: string[], collectionId: string) => {
    setBookmarkCollections((prev) => {
      const newEntries: BookmarkCollection[] = []
      for (const bookmarkId of bookmarkIds) {
        //don't add duplicates
        const exists = prev.some(
          (bc) => bc.bookmark_id === bookmarkId && bc.collection_id === collectionId
        )
        if (!exists) {
          newEntries.push({
            id: `temp-${bookmarkId}-${collectionId}`,
            bookmark_id: bookmarkId,
            collection_id: collectionId,
          })
        }
      }
      return [...prev, ...newEntries]
    })
  }, [])

  //remove bookmarks from a collection (update local state)
  const handleRemoveFromCollection = useCallback((bookmarkIds: string[], collectionId: string) => {
    setBookmarkCollections((prev) =>
      prev.filter(
        (bc) => !(bookmarkIds.includes(bc.bookmark_id) && bc.collection_id === collectionId)
      )
    )
  }, [])

  return (
    <DashboardContext.Provider value={contextValue}>
      <div className="flex gap-8">
        {/* Sidebar */}
        <Sidebar
          collections={collections}
          selectedCollectionId={selectedCollectionId}
          onSelectCollection={setSelectedCollectionId}
          onCollectionCreated={handleCollectionCreated}
        />

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Add Bookmark Form */}
          <AddBookmarkForm
            collections={collections}
            selectedCollectionId={selectedCollectionId}
            onAddToCollection={handleAddToCollection}
          />

          {/* Bookmark List with Real-time */}
          <BookmarkList
            initialBookmarks={initialBookmarks}
            userId={userId}
            selectedCollectionId={selectedCollectionId}
            collectionName={selectedCollectionName}
            collections={collections}
            bookmarkCollectionMap={bookmarkCollectionMap}
            onAddToCollection={handleAddToCollection}
            onRemoveFromCollection={handleRemoveFromCollection}
          />
        </div>
      </div>
    </DashboardContext.Provider>
  )
}
