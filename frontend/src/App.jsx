import { useEffect, useState } from 'react'
import { Bars3Icon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import AgentStatus from './AgentStatus.jsx'
import PersonalAssistant from './PersonalAssistant.jsx'
import './App.css'
import './index.css'

const BRANDS = [
  { key: 'remote100k', name: 'Remote100K' },
  { key: 'tradeview_ai', name: 'Tradeview AI' },
  { key: 'app_304', name: '304 App' }
]

function App() {
  const [brand, setBrand] = useState('remote100k')
  const [messages, setMessages] = useState([])
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

  useEffect(() => { loadData() }, [])

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
    <div className="h-full flex flex-col sm:flex-row bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="flex items-center justify-between p-2 sm:hidden">
        <button onClick={() => setSidebarOpen(!sidebarOpen)}><Bars3Icon className="w-6 h-6" /></button>
        <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="text-sm">Toggle {theme === 'light' ? 'Dark' : 'Light'} Mode</button>
      </header>
      <aside className={`fixed sm:relative z-20 inset-y-0 left-0 transform bg-gray-800 text-white w-64 flex flex-col p-4 space-y-4 transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} sm:translate-x-0`}>
        <div>
          <h1 className="text-xl font-bold">Welcome Logan 👋</h1>
          <p className="text-sm text-gray-300">{quotes[new Date().getSeconds() % quotes.length]}</p>
        </div>
        <nav className="flex-1 space-y-2 text-sm">
          {BRANDS.map(b => (
            <div key={b.key} className="space-y-1">
              <button className="w-full flex items-center justify-between font-semibold" onClick={() => setOpenBrand(o => o === b.key ? '' : b.key)}>
                <span onClick={() => setBrand(b.key)}>{b.name}</span>
                {openBrand === b.key ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
              </button>
              <ul className={`${openBrand === b.key ? 'max-h-40' : 'max-h-0'} overflow-hidden transition-all ml-4 text-xs space-y-1`}>
                <li>Slides</li>
                <li>Captions</li>
                <li>Saved Prompts</li>
                <li>Uploads</li>
              </ul>
            </div>
          ))}
          <button onClick={() => setView('assistant')} className="text-left w-full">Personal Assistant Mode</button>
        </nav>
        <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="text-sm mt-auto hidden sm:block">Toggle {theme === 'light' ? 'Dark' : 'Light'} Mode</button>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 sm:hidden" onClick={() => setSidebarOpen(false)}></div>}
      <main className="flex-1 p-4 flex flex-col space-y-4 overflow-hidden">
        {view === 'assistant' ? (
          <PersonalAssistant />
        ) : (
          <>
            <div className="flex-1 border rounded p-2 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-2 text-sm">
                {messages.map((m, i) => (
                  <div key={i} className={m.role === 'assistant' ? 'text-right' : 'text-left'}>
                    <div>{m.content}</div>
                    <div className="text-xs text-gray-500">{new Date(m.timestamp).toLocaleTimeString()}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex sticky bottom-0 bg-gray-100 dark:bg-gray-900 pt-2">
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && send()} placeholder="Ask me anything or give a command..." className="flex-1 border rounded px-2 py-1 text-gray-900" />
                <button onClick={send} className="ml-2 bg-blue-500 text-white px-4 py-1 rounded">Send</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
              <section className="border rounded p-2 max-h-40 overflow-y-auto">
                <h2 className="font-semibold mb-1">✍️ Task Queue</h2>
                <ul className="text-xs space-y-1">
                  {queue.map((q,i)=>(<li key={i}>{q.timestamp} – {q.task}</li>))}
                </ul>
              </section>
              <section className="border rounded p-2 max-h-40 overflow-y-auto">
                <h2 className="font-semibold mb-1">✅ Task History</h2>
                <ul className="text-xs space-y-1">
                  {history.slice().reverse().map((h,i)=>(<li key={i}>{h.timestamp} – {h.task}</li>))}
                </ul>
              </section>
            </div>
            <section className="border rounded p-2">
              <h2 className="font-semibold mb-1">Upload Panel</h2>
              <input type="file" multiple onChange={upload} className="text-sm" />
            </section>
          </>
        )}
      </main>
      <AgentStatus />
    </div>
  )
}

export default App
