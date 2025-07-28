import { useState } from 'react'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  FolderIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

const SOCIALS = ['TikTok', 'Instagram', 'YouTube', 'Gmail']
const PROJECT_ITEMS = ['Slides', 'Captions', 'Chat Logs', 'Media Uploads']

export default function Sidebar({
  brands,
  openBrand,
  setOpenBrand,
  setBrand,
  addProject,
  setView,
  theme,
  setTheme,
  linkedAccounts,
  linkAccount,
  sidebarOpen,
}) {
  const [showLinks, setShowLinks] = useState(false)
  const [active, setActive] = useState({ project: '', item: '' })
  return (
    <aside className={`fixed sm:relative z-20 inset-y-0 left-0 w-64 bg-gray-800 text-white flex flex-col p-4 space-y-4 transition-all duration-300 ease-in-out overflow-y-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}`}>\
      <div>
        <h1 className="text-xl font-bold">Welcome Logan \uD83D\uDC4B</h1>
      </div>
      <nav className="flex-1 space-y-2 text-sm overflow-y-auto">
        {brands.map(b => (
          <div key={b.key} className="space-y-1">
            <button
              onClick={() => setOpenBrand(o => (o === b.key ? '' : b.key))}
              className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-gray-700 transition"
            >
              <span
                className="flex items-center gap-2"
                onClick={() => setBrand(b.key)}
              >
                <FolderIcon className="w-5 h-5" />
                {b.name}
              </span>
              {openBrand === b.key ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
            </button>
            <ul
              className={`${openBrand === b.key ? 'max-h-60' : 'max-h-0'} overflow-hidden transition-all ml-7 space-y-1`}
            >
              {PROJECT_ITEMS.map(item => (
                <li key={item}>
                  <button
                    onClick={() => {
                      setBrand(b.key)
                      setActive({ project: b.key, item })
                    }}
                    className={`flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-gray-700 ${
                      active.project === b.key && active.item === item
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-300'
                    }`}
                  >
                    <DocumentTextIcon className="w-4 h-4" />
                    <span>{item}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <button
          onClick={addProject}
          className="w-full flex items-center gap-1 font-semibold hover:bg-gray-700 rounded px-2 py-1 transition-all"
        >
          <PlusIcon className="w-4 h-4" /> Add Project
        </button>
        <div className="space-y-1">
          <button
            onClick={() => setShowLinks(s => !s)}
            className="w-full flex items-center justify-between font-semibold hover:bg-gray-700 rounded px-2 py-1 transition-all"
          >
            <span>Link Accounts</span>
            <PlusIcon className="w-4 h-4" />
          </button>
          <ul className={`${showLinks ? 'max-h-40' : 'max-h-0'} overflow-hidden transition-all ml-4 text-xs space-y-1`}>
            {SOCIALS.map(s => (
              <li key={s}>
                {linkedAccounts.includes(s) ? (
                  <span>\u2705 {s}</span>
                ) : (
                  <button onClick={() => linkAccount(s)} className="hover:underline">{s}</button>
                )}
              </li>
            ))}
          </ul>
        </div>
        <button onClick={() => setView('assistant')} className="text-left w-full">Personal Assistant Mode</button>
      </nav>
      <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="text-sm mt-auto hidden sm:block">Toggle {theme === 'light' ? 'Dark' : 'Light'} Mode</button>
    </aside>
  )
}
