'use client'

import React, { useState } from 'react'
import { verifyPopupPermissions } from '@/lib/utils'

interface PopupVerificationModalProps {
    isOpen: boolean
    onClose: () => void
    onVerified: () => void
    count: number
}

// Fixed UI element positions for consistency
export default function PopupVerificationModal({
    isOpen,
    onClose,
    onVerified,
    count,
}: PopupVerificationModalProps) {
    const [failed, setFailed] = useState(false)

    if (!isOpen) return null

    // Function to run the permission check
    const handleVerify = async () => {
        // Attempt to open two test windows.
        // If successful (browser allows multiple popups), verifyPopupPermissions returns true.
        const success = await verifyPopupPermissions()
        if (success) {
            onVerified()
            onClose()
        } else {
            setFailed(true)
        }
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-zinc-800 p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {!failed ? (
                    // Initial Screen: Prompt User to Verify
                    <>
                        <div className="mx-auto w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-1">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                        </div>

                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Permission Check Required
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                You are about to open <strong>{count} tabs</strong>. We need to verify that your browser allows this action.
                            </p>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={handleVerify}
                                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-all active:scale-[0.98] outline-none focus:ring-2 focus:ring-blue-500/50"
                            >
                                Verify & Open Tabs
                            </button>
                            <p className="text-xs text-center text-gray-400 mt-3">
                                This will quickly open and close a test window.
                            </p>
                        </div>
                    </>
                ) : (
                    // Failed Screen: Instructions
                    <>
                        <div className="mx-auto w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-1">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>

                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Tabs were blocked
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Your browser prevented multiple tabs from opening. <span className="font-bold text-gray-700 dark:text-gray-300">This is a one-time setup.</span> You won't need to do this again once allowed.
                            </p>
                        </div>

                        <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-4 text-sm space-y-3 text-left">
                            <div className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center text-xs font-bold border border-gray-200 dark:border-zinc-700 shadow-sm">1</span>
                                <span className="text-gray-600 dark:text-gray-300">
                                    Look for the <strong>popup blocked icon</strong> in your address bar (or check browser notification).
                                </span>
                            </div>
                            <div className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center text-xs font-bold border border-gray-200 dark:border-zinc-700 shadow-sm">2</span>
                                <span className="text-gray-600 dark:text-gray-300">
                                    Click it and select <strong>Always allow popups and redirects...</strong>
                                </span>
                            </div>
                            <div className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center text-xs font-bold border border-gray-200 dark:border-zinc-700 shadow-sm">3</span>
                                <span className="text-gray-600 dark:text-gray-300">
                                    Click <strong>Done</strong> below and try verifying again.
                                </span>
                            </div>
                        </div>

                        <div className="pt-2 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-2.5 px-4 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setFailed(false)} // Reset to Try Again
                                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-all active:scale-[0.98]"
                            >
                                Try Again
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div >
    )
}
