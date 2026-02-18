'use client'

export default function MobileSidebarTrigger() {
  function handleOpenSidebar() {
    window.dispatchEvent(new CustomEvent('open-mobile-sidebar'))
  }

  return (
    <button
      onClick={handleOpenSidebar}
      className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-white/10 transition-colors"
      aria-label="Open sidebar"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  )
}
