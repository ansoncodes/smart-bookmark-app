'use client'

import { createContext, useRef, useState, useMemo, useCallback } from 'react'
import type { Bookmark } from '@/lib/db/bookmarks'
import type { Collection } from '@/lib/db/collections'
import type { BookmarkCollection } from '@/lib/db/bookmarkCollections'
import AddBookmarkForm from '@/app/dashboard/AddBookmarkForm'
import BookmarkList from '@/app/dashboard/BookmarkList'
import Sidebar from '@/app/dashboard/Sidebar'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import { getLatestBookmarkCollectionsAction } from '@/app/actions/bookmarks'

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
  const isSyncingRelationsRef = useRef(false)

  // Use a ref for selectedCollectionId to avoid re-subscribing when it changes
  const selectedCollectionIdRef = useRef<string | null>(null)
  useEffect(() => {
    selectedCollectionIdRef.current = selectedCollectionId
  }, [selectedCollectionId])

  // Memoize the supabase client instance
  const [supabase] = useState(() => createClient())
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  useEffect(() => {
    const handleOpenMobileSidebar = () => setIsMobileSidebarOpen(true)
    window.addEventListener('open-mobile-sidebar', handleOpenMobileSidebar)
    return () => {
      window.removeEventListener('open-mobile-sidebar', handleOpenMobileSidebar)
    }
  }, [])

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
    setCollections((prev) => {
      if (prev.some((c) => c.id === collection.id)) {
        return prev
      }
      return [...prev, collection]
    })
  }

  function handleCollectionDeleted(collectionId: string) {
    setCollections((prev) => prev.filter((c) => c.id !== collectionId))
    // Also clean up bookmark_collections entries for this collection
    setBookmarkCollections((prev) => prev.filter((bc) => bc.collection_id !== collectionId))
    // If the deleted collection was selected, go back to All Bookmarks
    if (selectedCollectionId === collectionId) {
      setSelectedCollectionId(null)
    }
  }

  function handleCollectionUpdated(updatedCollection: Collection) {
    setCollections((prev) =>
      prev.map((c) => (c.id === updatedCollection.id ? updatedCollection : c))
    )
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

  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
      return
    }

    const channel = new BroadcastChannel('bookmark-sync')
    const onMessage = (event: MessageEvent) => {
      const payload = event.data as {
        type?: string
        relation?: BookmarkCollection
      }

      if (payload?.type !== 'bookmark-collection-added' || !payload.relation) {
        return
      }

      const relation = payload.relation
      setBookmarkCollections((prev) => {
        const exists = prev.some(
          (bc) =>
            bc.id === relation.id ||
            (bc.bookmark_id === relation.bookmark_id && bc.collection_id === relation.collection_id)
        )
        if (exists) return prev
        return [...prev, relation]
      })
    }

    channel.addEventListener('message', onMessage)
    return () => {
      channel.removeEventListener('message', onMessage)
      channel.close()
    }
  }, [])

  //subscribe to real-time updates for collections and assignments
  useEffect(() => {
    console.log('[DashboardContent] Setting up real-time subscriptions for userId:', userId)

    // 1. Collections Channel
    const collectionsChannel = supabase
      .channel(`dashboard-collections-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'collections', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          console.log('[DashboardContent] Collection INSERT:', payload.new.name)
          setCollections((prev) => {
            if (prev.some(c => c.id === payload.new.id)) return prev
            return [...prev, payload.new as Collection]
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'collections', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          console.log('[DashboardContent] Collection UPDATE:', payload.new.name)
          setCollections((prev) =>
            prev.map(c => c.id === payload.new.id ? (payload.new as Collection) : c)
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'collections' },
        (payload: any) => {
          console.log('[DashboardContent] Collection DELETE:', payload.old.id)
          const deletedId = payload.old.id
          setCollections((prev) => prev.filter(c => c.id !== deletedId))
          setBookmarkCollections((prev) => prev.filter(bc => bc.collection_id !== deletedId))
          if (selectedCollectionIdRef.current === deletedId) {
            setSelectedCollectionId(null)
          }
        }
      )
      .subscribe((status) => {
        console.log('[DashboardContent] Collections channel status:', status)
      })

    // 2. Bookmark-Collection Junction Channel
    const relationsChannel = supabase
      .channel(`dashboard-relations-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookmark_collections' },
        (payload: any) => {
          console.log('[DashboardContent] Relation INSERT:', payload.new)
          setBookmarkCollections((prev) => {
            // First, find if we already have this mapping (either real or temp)
            const existingIndex = prev.findIndex(
              bc => (bc.id === payload.new.id) ||
                (bc.bookmark_id === payload.new.bookmark_id && bc.collection_id === payload.new.collection_id)
            )

            if (existingIndex > -1) {
              // Replace the existing entry with the real one from Supabase
              const next = [...prev]
              next[existingIndex] = payload.new as BookmarkCollection
              return next
            }

            return [...prev, payload.new as BookmarkCollection]
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'bookmark_collections' },
        (payload: any) => {
          console.log('[DashboardContent] Relation DELETE full payload:', payload)
          // Since we might only have the 'id' in payload.old, we filter by that.
          // If the project doesn't have 'FULL' replica identity, filtering by other columns won't work.
          setBookmarkCollections((prev) => {
            const deletedId = payload.old.id
            if (!deletedId) {
              console.warn('[DashboardContent] DELETE event received but payload.old.id is missing. Is REPLICA IDENTITY FULL set?')
              return prev
            }
            return prev.filter(bc => bc.id !== deletedId)
          })
        }
      )
      .subscribe((status) => {
        console.log('[DashboardContent] Relations channel status:', status)
      })

    return () => {
      console.log('[DashboardContent] Cleaning up real-time subscriptions')
      supabase.removeChannel(collectionsChannel)
      supabase.removeChannel(relationsChannel)
    }
  }, [userId, supabase])

  // Cross-browser fallback: periodically sync bookmark-collection mappings.
  useEffect(() => {
    let mounted = true

    const syncLatestRelations = async () => {
      if (isSyncingRelationsRef.current || document.hidden) {
        return
      }
      isSyncingRelationsRef.current = true
      try {
        const latest = await getLatestBookmarkCollectionsAction()
        if (!mounted) return
        setBookmarkCollections(latest)
      } catch (error) {
        console.error('[DashboardContent] Fallback relation sync failed:', error)
      } finally {
        isSyncingRelationsRef.current = false
      }
    }

    const intervalId = window.setInterval(syncLatestRelations, 5000)

    const onVisible = () => {
      if (!document.hidden) {
        syncLatestRelations().catch(() => {})
      }
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      mounted = false
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [])

  return (
    <DashboardContext.Provider value={contextValue}>
      <div className="flex flex-col md:flex-row md:gap-8">
        {/* Mobile Header */}
        {/* Sidebar */}
        <Sidebar
          collections={collections}
          selectedCollectionId={selectedCollectionId}
          onSelectCollection={setSelectedCollectionId}
          onCollectionCreated={handleCollectionCreated}
          onCollectionDeleted={handleCollectionDeleted}
          onCollectionUpdated={handleCollectionUpdated}
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content */}
        <div className="flex-1 min-w-0 p-4 md:p-0 space-y-6">
          {/* Add Bookmark Form */}
          <div className="relative z-10">
            <AddBookmarkForm
              collections={collections}
              selectedCollectionId={selectedCollectionId}
              onAddToCollection={handleAddToCollection}
            />
          </div>

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
