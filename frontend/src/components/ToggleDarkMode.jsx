/**
 * Dark mode toggle component. Displays a switch in the top-right corner.
 * Persists dark mode preference to localStorage and toggles 'dark' class on document.documentElement.
 */
i
export default function ToggleDarkMode({ darkMode, setDarkMode }) {
  // Initialize dark mode from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('darkMode');
    if (stored === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, [setDarkMode]);

  const handleToggle = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', newMode);
  };

  return (
    <button
      onClick={handleToggle}
      className="text-sm px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
    >
      {darkMode ? '☀️ Light' : '🌙 Dark'}
    </button>
  )


  
