import { useState } from 'react'

const NEW_UI_KEY = 'bx-hive-ui'

/**
 * Resolves the ?ui= query param once and persists to localStorage so the choice
 * carries across navigation. ?ui=new opts in, ?ui=old opts out, otherwise the
 * stored preference (if any) wins.
 */
function readNewUI(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  const param = params.get('ui')
  if (param === 'new') {
    window.localStorage.setItem(NEW_UI_KEY, 'new')
    return true
  }
  if (param === 'old') {
    window.localStorage.removeItem(NEW_UI_KEY)
    return false
  }
  return window.localStorage.getItem(NEW_UI_KEY) === 'new'
}

export function useNewUI(): boolean {
  const [enabled] = useState(readNewUI)
  return enabled
}
