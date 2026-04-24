import { useEffect, useState } from 'react'
import { FaSun, FaMoon } from 'react-icons/fa'

const THEME_KEY = 'bx-hive-theme'

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const theme = isDark ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [isDark])

  return (
    <label className="swap swap-rotate btn btn-ghost btn-circle btn-sm mr-1">
      <input type="checkbox" checked={isDark} onChange={(e) => setIsDark(e.target.checked)} />
      <FaMoon className="swap-off h-5 w-5" />
      <FaSun className="swap-on h-5 w-5" />
    </label>
  )
}
