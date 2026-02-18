'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SignOutButton() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function handleSignOut() {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
      alert('Error signing out')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2 inline-flex items-center justify-center shrink-0 text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label={loading ? 'Signing out' : 'Sign out'}
    >
      {loading ? (
        <span className="text-xs sm:text-sm">...</span>
      ) : (
        <>
          <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1m0-10V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h5a2 2 0 002-2v-1" />
          </svg>
          <span className="hidden sm:inline">Sign out</span>
        </>
      )}
    </button>
  )
}


