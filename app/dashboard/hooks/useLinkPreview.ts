'use client'

import { useState, useRef, useCallback } from 'react'

export interface LinkPreview {
    title: string
    description: string
    image: string | null
    favicon: string | null
}

// Client-side cache — same URL never fetched twice in a session
const previewCache = new Map<string, LinkPreview>()

export function useLinkPreview() {
    const [preview, setPreview] = useState<LinkPreview | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(false)
    const [visible, setVisible] = useState(false)

    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const abortControllerRef = useRef<AbortController | null>(null)
    const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const activeUrlRef = useRef<string | null>(null)

    const cleanup = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
            debounceTimerRef.current = null
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }
    }, [])

    const handleMouseEnter = useCallback((url: string) => {
        // Cancel any pending leave-cleanup so it doesn't wipe our state
        if (leaveTimerRef.current) {
            clearTimeout(leaveTimerRef.current)
            leaveTimerRef.current = null
        }

        cleanup()
        activeUrlRef.current = url

        // Reset error state cleanly on each new hover
        setError(false)

        // Check client cache first
        const cached = previewCache.get(url)
        if (cached) {
            setPreview(cached)
            setIsLoading(false)
            setVisible(true)
            return
        }

        // Show skeleton immediately, then debounce the actual fetch
        setPreview(null)
        setIsLoading(true)
        setVisible(true)

        debounceTimerRef.current = setTimeout(async () => {
            const controller = new AbortController()
            abortControllerRef.current = controller

            try {
                const res = await fetch(
                    `/api/preview?url=${encodeURIComponent(url)}`,
                    { signal: controller.signal }
                )

                if (!res.ok) {
                    throw new Error('Failed to fetch preview')
                }

                const data: LinkPreview = await res.json()

                // Only update if this is still the active URL
                if (activeUrlRef.current === url) {
                    // Only treat as error if absolutely nothing was found
                    if (!data.title && !data.description && !data.image) {
                        setError(true)
                        setPreview(null)
                    } else {
                        previewCache.set(url, data)
                        setPreview(data)
                        setError(false)
                    }
                    setIsLoading(false)
                }
            } catch (err: unknown) {
                if (err instanceof Error && err.name === 'AbortError') {
                    return
                }
                if (activeUrlRef.current === url) {
                    setError(true)
                    setPreview(null)
                    setIsLoading(false)
                }
            }
        }, 300)
    }, [cleanup])

    const handleMouseLeave = useCallback(() => {
        cleanup()
        setVisible(false)
        activeUrlRef.current = null

        // Delayed reset so fade-out animation can play, tracked in ref so it's cancellable
        leaveTimerRef.current = setTimeout(() => {
            setPreview(null)
            setIsLoading(false)
            setError(false)
            leaveTimerRef.current = null
        }, 200)
    }, [cleanup])

    return {
        preview,
        isLoading,
        error,
        visible,
        handleMouseEnter,
        handleMouseLeave,
    }
}
