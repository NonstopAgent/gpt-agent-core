import { useEffect, useRef, useState } from 'react'
import { Bars3Icon } from '@heroicons/react/24/outline'
import { PaperAirplaneIcon, PlusIcon } from '@heroicons/react/24/solid'
import Sidebar from './Sidebar.jsx'
import AgentStatus from './AgentStatus.jsx'
import PersonalAssistant from './PersonalAssistant.jsx'
import './App.css'
import './index.css'

const DEFAULT_BRANDS = [
  { key: 'remote100k', name: 'Remote100K' },
  { key: 'tradeview_ai', name: 'Tradeview AI' },
  { key: 'app_304', name: '304 App' },
]

const GREETINGS = [
  "What's up, Logan?",
  'Welcome Logan!',
  'Hello Logan!'
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
  const [loggedIn, setLoggedIn] = useState(() => localStorage.getItem('loggedIn') === 'true')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [imagePrompt, setImagePrompt] = useState('')
  const authHeader = useRef('')
  const greetingRef = useRef(GREETINGS[Math.floor(Math.random() * GREETINGS.length)])
  const [linkedAccounts, setLinkedAccounts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('linkedAccounts') || '[]')
    } catch {
      return []
    }
  })

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
        fetch('/api/queue', { headers: authHeader.current ? { Authorization: authHeader.current } : {} }),
        fetch('/api/logs', { headers: authHeader.current ? { Authorization: authHeader.current } : {} })
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
      const headers = { 'Content-Type': 'application/json' }
      if (authHeader.current) headers.Authorization = authHeader.current
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text })
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.response, timestamp: data.timestamp }])
      loadData()
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Error contacting server.' }])
    }
  }

  async function sendImage() {
    const prompt = imagePrompt.trim()
    if (!prompt) return
    setImagePrompt('')
    setMessages(m => [...m, { role: 'user', content: prompt, timestamp: new Date().toISOString() }])
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (authHeader.current) headers.Authorization = authHeader.current
      const res = await fetch('/api/image', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt })
      })
      const data = await res.json()
      if (data.url) {
        setMessages(m => [...m, { role: 'assistant', content: "Here's your generated image.", imageUrl: data.url, timestamp: new Date().toISOString() }])
      } else {
        setMessages(m => [...m, { role: 'assistant', content: data.error || 'Error generating image.' }])
      }
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
    const headers = authHeader.current ? { Authorization: authHeader.current } : {}
    await fetch('/api/upload', { method: 'POST', body: form, headers })
    e.target.value = ''
  }

  function linkAccount(name) {
    setLinkedAccounts(acc => {
      if (acc.includes(name)) return acc
      const updated = [...acc, name]
      localStorage.setItem('linkedAccounts', JSON.stringify(updated))
      return updated
    })
  }

  function handleLogin(e) {
    e.preventDefault()
    if (username === 'logan' && password === 'AllDay21!!!') {
      setLoggedIn(true)
      localStorage.setItem('loggedIn', 'true')
      authHeader.current = 'Basic ' + btoa(`${username}:${password}`)
    } else {
      alert('Invalid credentials')
    }
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <form onSubmit={handleLogin} className="bg-white dark:bg-gray-800 p-6 rounded shadow space-y-4">
          <div className="text-lg font-semibold text-center">Log in</div>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className="w-full border p-2 rounded text-sm bg-transparent" />
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" className="w-full border p-2 rounded text-sm bg-transparent" />
          <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded">Login</button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col sm:flex-row bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <header className="flex items-center justify-between p-4 shadow sm:hidden">
        <button onClick={() => setSidebarOpen(!sidebarOpen)}><Bars3Icon className="w-6 h-6" /></button>
        <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="text-sm">Toggle {theme === 'light' ? 'Dark' : 'Light'} Mode</button>
      </header>
      <Sidebar
        brands={brands}
        openBrand={openBrand}
        setOpenBrand={setOpenBrand}
        setBrand={setBrand}
        addProject={addProject}
        setView={setView}
        theme={theme}
        setTheme={setTheme}
        linkedAccounts={linkedAccounts}
        linkAccount={linkAccount}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 sm:hidden" onClick={() => setSidebarOpen(false)}></div>}
      <main className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
        {view === 'assistant' ? (
          <PersonalAssistant />
        ) : (
          <>
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 py-10">{greetingRef.current}</div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`w-full ${m.role === 'user' ? 'bg-user' : 'bg-assistant'} py-3 px-4 text-sm`}>
                    <div className="max-w-2xl mx-auto space-y-1 whitespace-pre-wrap">
                  <div className="chat-message-content">{m.content}</div>
                  {m.imageUrl && (
                    <img src={m.imageUrl} alt="generated" className="mt-2 rounded" />
                  )}
                      <div className="text-[10px] text-gray-500 text-right">{new Date(m.timestamp).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-2 bg-white dark:bg-gray-900 sticky bottom-0">
                <div className="flex gap-2">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
                    placeholder="Send a message"
                    rows={1}
                    className="chat-input flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none"
                  />
                  <button onClick={send} className="bg-blue-500 text-white p-2 rounded-lg shadow-sm self-end">
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    value={imagePrompt}
                    onChange={e => setImagePrompt(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), sendImage())}
                    placeholder="Image prompt"
                    className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1 text-sm bg-transparent focus:outline-none"
                  />
                  <button onClick={sendImage} className="bg-green-600 text-white px-3 rounded-lg">Generate</button>
                </div>
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
        className="fixed bottom-20 right-4 bg-blue-500 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg sm:hidden z-50"
      >
        <PlusIcon className="w-6 h-6" />
      </button>
    </div>
  )
}

export default App
