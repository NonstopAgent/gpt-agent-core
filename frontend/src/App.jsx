import { useEffect, useRef, useState } from 'react'
import {
  Bars3Icon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { PaperAirplaneIcon, PlusIcon } from '@heroicons/react/24/solid'
import AgentStatus from './AgentStatus.jsx'
import PersonalAssistant from './PersonalAssistant.jsx'
import './App.css'
import './index.css'

const DEFAULT_BRANDS = [
  { key: 'remote100k', name: 'Remote100K' },
  { key: 'tradeview_ai', name: 'Tradeview AI' },
  { key: 'app_304', name: '304 App' },
]

function App() {
  const [brands, setBrands] = useState(DEFAULT_BRANDS)
  const [brand, setBrand] = useState('remote100k')
  const [messages, setMessages] = useState([])
  const messagesEndRef = useRef(null)
  const [input, setInput] = useState('')
  const [queue, setQueue] = useState([])
  const [history, setHistory] = useState([])
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  const [openBrand, setOpenBrand] = useState(() => localStorage.getItem('openBrand') || '')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [view, setView] = useState('dashboard')
  const quotes = ["Let's get to work", 'Ready when you are', 'What next?']

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    if (openBrand) {
      localStorage.setItem('openBrand', openBrand)
    } else {
      localStorage.removeItem('openBrand')
    }
  }, [openBrand])

  async function loadData() {
    try {
      const [qRes, hRes] = await Promise.all([
        fetch('/api/queue'),
        fetch('/api/logs')
      ])
      setQueue(await qRes.json())
      setHistory(await hRes.json())
    } catch {
      console.error('Failed loading queue/history')
    }
  }

  function addProject() {
    const name = prompt('Project name?')
    if (!name) return
    const key = name.toLowerCase().replace(/\s+/g, '_')
    setBrands(b => [...b, { key, name }])
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text) return
    setMessages(m => [...m, { role: 'user', content: text, timestamp: new Date().toISOString() }])
    setInput('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.response, timestamp: data.timestamp }])
      loadData()
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Error contacting server.' }])
    }
  }

  async function upload(e) {
    const files = e.target.files
    if (!files || files.length === 0) return
    const form = new FormData()
    form.append('project', brand)
    for (const f of files) form.append('file', f)
    await fetch('/api/upload', { method: 'POST', body: form })
    e.target.value = ''
  }

  return (
    <div className="min-h-screen flex flex-col sm:flex-row bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <header className="flex items-center justify-between p-4 shadow sm:hidden">
        <button onClick={() => setSidebarOpen(!sidebarOpen)}><Bars3Icon className="w-6 h-6" /></button>
        <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="text-sm">Toggle {theme === 'light' ? 'Dark' : 'Light'} Mode</button>
      </header>
      <aside className={`fixed sm:relative z-20 inset-y-0 left-0 w-64 bg-gray-800 text-white flex flex-col p-4 space-y-4 transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}`}>
        <div>
          <h1 className="text-xl font-bold">Welcome Logan 👋</h1>
          <p className="text-sm text-gray-300">{quotes[new Date().getSeconds() % quotes.length]}</p>
        </div>
        <nav className="flex-1 space-y-2 text-sm">
          {brands.map(b => (
            <div key={b.key} className="space-y-1">
              <button
                className="w-full flex items-center justify-between font-semibold hover:bg-gray-700 rounded px-2 py-1 transition-all"
                onClick={() => setOpenBrand(o => (o === b.key ? '' : b.key))}
              >
                <span onClick={() => setBrand(b.key)}>{b.name}</span>
                {openBrand === b.key ? (
                  <ChevronDownIcon className="w-4 h-4" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4" />
                )}
              </button>
              <ul
                className={`${openBrand === b.key ? 'max-h-40' : 'max-h-0'} overflow-hidden transition-all ml-4 text-xs space-y-1`}
              >
                <li>Slides</li>
                <li>Captions</li>
                <li>Saved Prompts</li>
                <li>Uploads</li>
              </ul>
            </div>
          ))}
          <button
            onClick={addProject}
            className="w-full flex items-center gap-1 font-semibold hover:bg-gray-700 rounded px-2 py-1 transition-all"
          >
            <PlusIcon className="w-4 h-4" /> Add Project
          </button>
          <button onClick={() => setView('assistant')} className="text-left w-full">Personal Assistant Mode</button>
        </nav>
        <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="text-sm mt-auto hidden sm:block">Toggle {theme === 'light' ? 'Dark' : 'Light'} Mode</button>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 sm:hidden" onClick={() => setSidebarOpen(false)}></div>}
      <main className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
        {view === 'assistant' ? (
          <PersonalAssistant />
        ) : (
          <>
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-sm px-3 py-2 rounded-xl shadow-sm ${m.role === 'user' ? 'bg-blue-100 text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'}`}>
                      {m.content}
                      <div className="mt-1 text-[10px] text-gray-500">{new Date(m.timestamp).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-2 bg-white dark:bg-gray-900 sticky bottom-0 flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send()}
                  placeholder="Ask me anything or give a command..."
                  className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none"
                />
                <button onClick={send} className="bg-blue-500 text-white p-2 rounded-lg shadow-sm">
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
              <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 max-h-40 overflow-y-auto">
                <h2 className="font-semibold mb-1">✍️ Task Queue</h2>
                <ul className="text-xs space-y-1">
                  {queue.map((q,i)=>(<li key={i}>{q.timestamp} – {q.task}</li>))}
                </ul>
              </section>
              <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 max-h-40 overflow-y-auto">
                <h2 className="font-semibold mb-1">✅ Task History</h2>
                <ul className="text-xs space-y-1">
                  {history.slice().reverse().map((h,i)=>(<li key={i}>{h.timestamp} – {h.task}</li>))}
                </ul>
              </section>
            </div>
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <h2 className="font-semibold mb-1">Upload Panel</h2>
              <input type="file" multiple onChange={upload} className="text-sm" />
            </section>
          </>
        )}
      </main>
      <AgentStatus />
      <button
        onClick={addProject}
        className="fixed bottom-4 right-4 bg-blue-500 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg sm:hidden z-20"
      >
        <PlusIcon className="w-6 h-6" />
      </button>
    </div>
  )
}

export default App
