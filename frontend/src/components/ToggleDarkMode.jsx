import { useEffect, useState } from 'react'

/**
 * Dark mode toggle component.  Displays a switch in the top‑right
 * corner and persists the user’s choice in localStorage.  This
 * component does not render anything on smaller devices when
 * embedded into the sidebar; instead, use it in your page layout.
 */
export default function ToggleDarkMode() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggle() {
    setTheme(t => (t === 'light' ? 'dark' : 'light'))
  }

  return (
    <button
      onClick={toggle}
      className="text-sm px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
    >
      {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
    </button>
  )
}