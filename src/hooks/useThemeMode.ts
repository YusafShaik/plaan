import { useEffect, useState } from 'react'

export function useThemeMode() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )

  useEffect(() => {
    const sync = () => setIsDark(document.documentElement.classList.contains('dark'))
    window.addEventListener('plaan_theme_change', sync)
    return () => window.removeEventListener('plaan_theme_change', sync)
  }, [])

  const toggle = () => {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('plaan_theme', next ? 'dark' : 'light')
    setIsDark(next)
    window.dispatchEvent(new Event('plaan_theme_change'))
  }

  return { isDark, toggle }
}
