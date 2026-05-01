import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../providers/ThemeProvider'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${next} theme`}
      className="inline-flex items-center justify-center w-8 h-8 rounded-sm border border-border text-muted-foreground hover:text-foreground"
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
