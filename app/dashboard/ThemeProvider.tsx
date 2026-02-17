'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const THEME_KEY = 'theme'
const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark'
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  const savedTheme = localStorage.getItem(THEME_KEY)
  return isTheme(savedTheme) ? savedTheme : 'dark'
}

function applyTheme(theme: Theme) {
  const isDark = theme === 'dark'
  const root = document.documentElement
  const body = document.body

  root.classList.toggle('dark', isDark)
  body.classList.toggle('dark', isDark)

  root.dataset.theme = theme
  body.dataset.theme = theme

  root.style.colorScheme = theme
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_KEY && isTheme(event.newValue)) {
        setTheme(event.newValue)
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
