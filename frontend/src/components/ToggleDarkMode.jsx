/**
 * Dark mode toggle component.  Displays a switch in the top‑right
 * corner and relies on the parent component to persist the setting in
 * localStorage.  This component does not render anything on smaller
 * devices when embedded into the sidebar; instead, use it in your page
 * layout.
 */
export default function ToggleDarkMode({ darkMode, setDarkMode }) {
  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className="text-sm px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
    >
      {darkMode ? '☀️ Light' : '🌙 Dark'}
    </button>
  )
}