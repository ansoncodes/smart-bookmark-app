'use client'

import type { LinkPreview } from './hooks/useLinkPreview'

interface PreviewCardProps {
    preview: LinkPreview | null
    isLoading: boolean
    error: boolean
    visible: boolean
    showAbove?: boolean
}

function SkeletonLoader() {
    return (
        <div className="space-y-3 animate-pulse">
            {/* Image skeleton */}
            <div className="w-full h-28 rounded-lg bg-gray-200 dark:bg-zinc-800/60 shimmer-bg" />
            {/* Title skeleton */}
            <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-zinc-800/60 shimmer-bg" />
            {/* Description skeleton lines */}
            <div className="space-y-2">
                <div className="h-3 w-full rounded bg-gray-200 dark:bg-zinc-800/60 shimmer-bg" />
                <div className="h-3 w-5/6 rounded bg-gray-200 dark:bg-zinc-800/60 shimmer-bg" />
            </div>
            {/* Domain skeleton */}
            <div className="flex items-center gap-2 pt-1">
                <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-zinc-800/60 shimmer-bg" />
                <div className="h-3 w-24 rounded bg-gray-200 dark:bg-zinc-800/60 shimmer-bg" />
            </div>
        </div>
    )
}

function ErrorState() {
    return (
        <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800/60 flex items-center justify-center mb-3">
                <svg
                    className="w-5 h-5 text-gray-400 dark:text-zinc-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18"
                    />
                </svg>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-500 font-medium">Preview not available</p>
        </div>
    )
}

export default function PreviewCard({
    preview,
    isLoading,
    error,
    visible,
    showAbove = false,
}: PreviewCardProps) {
    if (!visible && !isLoading && !preview && !error) {
        return null
    }

    const positionClasses = showAbove
        ? 'bottom-full mb-2'
        : 'top-full mt-2'

    const animationClasses = visible
        ? 'opacity-100 translate-y-0'
        : showAbove
            ? 'opacity-0 translate-y-1'
            : 'opacity-0 -translate-y-1'

    return (
        <div
            className={`absolute left-0 ${positionClasses} z-50 w-[300px] pointer-events-none transition-all duration-200 ${animationClasses}`}
            style={{ filter: visible ? 'none' : 'blur(2px)' }}
        >
            <div className="rounded-xl border border-gray-200 dark:border-zinc-700/50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/10 dark:shadow-black/40 p-4 ring-1 ring-black/[0.03] dark:ring-white/[0.03]">
                {isLoading && <SkeletonLoader />}

                {error && !isLoading && <ErrorState />}

                {preview && !isLoading && !error && (
                    <div className="space-y-3">
                        {/* OG Image */}
                        {preview.image && (
                            <div className="w-full h-28 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800/40">
                                <img
                                    src={preview.image}
                                    alt={preview.title || 'Preview'}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                    }}
                                />
                            </div>
                        )}

                        {/* Title */}
                        {preview.title && (
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2">
                                {preview.title}
                            </h4>
                        )}

                        {/* Description */}
                        {preview.description && (
                            <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed line-clamp-3">
                                {preview.description}
                            </p>
                        )}

                        {/* Domain footer */}
                        {preview.favicon && (
                            <div className="flex items-center gap-2 pt-1 border-t border-gray-200/60 dark:border-zinc-800/60">
                                <img
                                    src={preview.favicon}
                                    alt=""
                                    className="w-4 h-4 rounded-sm"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                    }}
                                />
                                <span className="text-[11px] text-gray-400 dark:text-zinc-500 truncate">
                                    {(() => {
                                        try {
                                            return new URL(preview.image || '').hostname.replace('www.', '')
                                        } catch {
                                            return ''
                                        }
                                    })()}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
