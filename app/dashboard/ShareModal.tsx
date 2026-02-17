'use client'

import { useState, useEffect } from 'react'
import { generateShareLinkAction } from '@/app/actions/shared'

interface ShareModalProps {
    isOpen: boolean
    onClose: () => void
    collectionId: string
    collectionName: string
}

export default function ShareModal({ isOpen, onClose, collectionId, collectionName }: ShareModalProps) {
    const [shareId, setShareId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            setShareId(null)
            setError(null)
            setCopied(false)
            // Ideally we'd fetch if it's already shared here, but generating again returns the same ID
        }
    }, [isOpen, collectionId])

    if (!isOpen) return null

    const handleGenerate = async () => {
        setLoading(true)
        setError(null)
        try {
            const id = await generateShareLinkAction(collectionId)
            setShareId(id)
        } catch (err: any) {
            setError(err.message || 'Failed to generate link')
        } finally {
            setLoading(false)
        }
    }

    const shareUrl = shareId ? `${window.location.origin}/shared/${shareId}` : ''

    const handleCopy = () => {
        if (!shareUrl) return
        navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
        }}>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-zinc-800">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Share Collection</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Share <span className="font-medium text-gray-900 dark:text-white">"{collectionName}"</span> with others. Anyone with the link can view these bookmarks.
                    </p>

                    {!shareId ? (
                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            className="w-full py-2.5 px-4 bg-gray-900 dark:bg-white text-white dark:text-black font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white dark:text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Generating...
                                </>
                            ) : (
                                'Generate Share Link'
                            )}
                        </button>
                    ) : (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Share Link</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={shareUrl}
                                    className="flex-1 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-300 focus:outline-none"
                                />
                                <button
                                    onClick={handleCopy}
                                    className="px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors min-w-[80px]"
                                >
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                        </div>
                    )}

                    {error && <p className="text-sm text-red-500">{error}</p>}
                </div>
            </div>
        </div>
    )
}
