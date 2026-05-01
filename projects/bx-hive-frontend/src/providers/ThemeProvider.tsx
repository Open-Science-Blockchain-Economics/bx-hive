import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'
export type Accent = 'cyan' | 'amber' | 'hive' | 'ink'

const THEME_KEY = 'bx-hive-theme'
const ACCENT_KEY = 'bx-hive-accent'
const DEFAULT_THEME: Theme = 'light'
const DEFAULT_ACCENT: Accent = 'cyan'

interface ThemeContextValue {
  theme: Theme
  accent: Accent
  setTheme: (theme: Theme) => void
  setAccent: (accent: Accent) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME
  const stored = window.localStorage.getItem(THEME_KEY)
  return stored === 'light' || stored === 'dark' ? stored : DEFAULT_THEME
}

function readStoredAccent(): Accent {
  if (typeof window === 'undefined') return DEFAULT_ACCENT
  const stored = window.localStorage.getItem(ACCENT_KEY)
  return stored === 'cyan' || stored === 'amber' || stored === 'hive' || stored === 'ink' ? stored : DEFAULT_ACCENT
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)
  const [accent, setAccentState] = useState<Accent>(readStoredAccent)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent)
    window.localStorage.setItem(ACCENT_KEY, accent)
  }, [accent])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const setAccent = useCallback((next: Accent) => setAccentState(next), [])
  const toggleTheme = useCallback(() => setThemeState((prev) => (prev === 'light' ? 'dark' : 'light')), [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, accent, setTheme, setAccent, toggleTheme }),
    [theme, accent, setTheme, setAccent, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
