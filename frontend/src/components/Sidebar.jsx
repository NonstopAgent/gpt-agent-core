import { useState } from 'react'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  FolderIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

const DEFAULT_BRANDS = [
  { key: 'remote100k', name: 'Remote100K' },
  { key: 'tradeview_ai', name: 'Tradeview AI' },
  { key: 'app_304', name: '304 App' },
]
// Items shown under each project folder
const PROJECT_ITEMS = ['Slides', 'Captions', 'Files', 'Tasks', 'Comments']

/**
 * Sidebar component containing project folders.  Supports
 * accordion‑style collapsing and adding new projects.  Accepts
 * callbacks for when a brand or item is selected.
 */
export default function Sidebar({
  brands = DEFAULT_BRANDS,
  onSelect,
  onAddProject,
  sidebarOpen,
  setSidebarOpen,
}) {
  const [openKey, setOpenKey] = useState('')
  const [newProjectName, setNewProjectName] = useState('')

  function toggleBrand(key) {
    setOpenKey(prev => (prev === key ? '' : key))
  }

  function handleAdd() {
    if (!newProjectName.trim()) return
    const key = newProjectName.toLowerCase().replace(/\s+/g, '_')
    onAddProject({ key, name: newProjectName.trim() })
    setNewProjectName('')
  }

  return (
    <aside
      className={
        `fixed top-0 left-0 z-20 w-64 h-screen bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100 p-4 ` +
        `border-r border-gray-200 dark:border-gray-800 overflow-y-auto transform ` +
        `${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ` +
        `transition-transform duration-200 ease-in-out`
      }
    >
      <div className="mb-4 text-lg font-semibold">Projects</div>
      {brands.map(b => (
        <div key={b.key} className="mb-1">
          <button
            onClick={() => toggleBrand(b.key)}
            className="flex items-center justify-between w-full px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800"
          >
            <span className="flex items-center gap-2">
              <FolderIcon className="w-5 h-5" />
              {b.name}
            </span>
            {openKey === b.key ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
          </button>
          <ul
            className={
              `overflow-hidden transition-[max-height] ` +
              `${openKey === b.key ? 'max-h-80' : 'max-h-0'}` +
              ` ml-6`
            }
          >
            {PROJECT_ITEMS.map(item => (
              <li key={item}>
                <button
                  onClick={() => {
                    onSelect(b.key, item)
                    setSidebarOpen(false)
                  }}
                  className="flex items-center gap-2 w-full px-2 py-1 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-800"
                >
                  <DocumentTextIcon className="w-4 h-4" /> {item}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="mt-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            placeholder="New project"
            className="flex-1 px-2 py-1 rounded bg-gray-200 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
          />
          <button
            onClick={handleAdd}
            className="p-2 rounded bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}