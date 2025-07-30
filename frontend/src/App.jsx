import { useEffect, useRef, useState } from 'react'
import { Bars3Icon } from '@heroicons/react/24/outline'
import { PaperAirplaneIcon, PlusIcon } from '@heroicons/react/24/solid'
import Sidebar from './Sidebar.jsx'
import AgentStatus from './AgentStatus.jsx'
import PersonalAssistant from './PersonalAssistant.jsx'
import './App.css'
import './index.css'

// Brand list is now loaded dynamically from the backend.  Projects
// correspond to subdirectories in the server’s memory folder.  The
// array holds objects with `key` and `name` properties.  It starts
// empty and is populated on mount via /api/projects.
const DEFAULT_BRANDS = []

const GREETINGS = [
  "What's up, Logan?",
  'Welcome Logan!',
  'Hello Logan!'
]

function App() {
  // Projects (brands) loaded from the backend.  Each entry has
  // structure { key: string, name: string }.  Initially empty until
  // fetched on mount.  The list is kept in sync when new projects are
  // created via the addProject function.
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
  const authHeader = useRef('')
  const greetingRef = useRef(GREETINGS[Math.floor(Math.random() * GREETINGS.length)])
  const [linkedAccounts, setLinkedAccounts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('linkedAccounts') || '[]')
    } catch {
      return []
    }
  })
  const pendingIndex = useRef(null)
  const [imagePrompt, setImagePrompt] = useState('')

  // Track whether Logan is currently present.  When this state
  // changes the toggle sends a slash command to the backend to update
  // the agent’s presence.  Default to true (assistant mode).
  const [isPresent, setIsPresent] = useState(() => true)

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

  // Create a new project.  Prompt the user for a friendly name,
  // derive a key by lowercasing and replacing whitespace, then POST
  // to /api/projects.  On success, append the returned metadata to
  // the local brands list.  If the backend rejects the request, an
  // alert is displayed.
  async function addProject() {
    const name = prompt('Project name?')
    if (!name) return
    const key = name.toLowerCase().replace(/\s+/g, '_')
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (authHeader.current) headers.Authorization = authHeader.current
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: name.trim(), key }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to create project')
        return
      }
      setBrands(b => [...b, { key: data.key, name: data.name }])
    } catch (e) {
      alert('Failed to create project')
    }
  }

  useEffect(() => { loadData() }, [])

  // Fetch the list of existing projects on first render.  The
  // response from /api/projects is an array of keys.  Convert each
  // key into a display name by replacing underscores with spaces and
  // capitalising each word.
  useEffect(() => {
    async function fetchProjects() {
      try {
        const headers = authHeader.current ? { Authorization: authHeader.current } : {}
        const res = await fetch('/api/projects', { headers })
        if (!res.ok) return
        const keys = await res.json()
        const list = keys.map(k => {
          const words = k.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1))
          return { key: k, name: words.join(' ') }
        })
        setBrands(list)
        // default selected brand: first project if available
        if (list.length > 0) setBrand(list[0].key)
      } catch {
        // ignore errors
      }
    }
    fetchProjects()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text) return
    setMessages(m => [...m, { role: 'user', content: text, timestamp: new Date().toISOString() }])
    setInput('')

    const isImage = text.toLowerCase().includes('image')
    // Show a loading indicator under the user message.  Use a
    // descriptive message while Ajax is working.
    const placeholder = {
      role: 'assistant',
      content: isImage ? 'Generating image…' : 'Ajax is working…',
      pending: true,
    }
    setMessages(m => {
      const arr = [...m, placeholder]
      pendingIndex.current = arr.length - 1
      return arr
    })

    try {
      const headers = { 'Content-Type': 'application/json' }
      if (authHeader.current) headers.Authorization = authHeader.current
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text })
      })
      const data = await res.json()
      setMessages(m => {
        const arr = [...m]
        const idx = pendingIndex.current
        if (idx !== null && arr[idx] && arr[idx].pending) {
          arr[idx] = { role: 'assistant', content: data.response, timestamp: data.timestamp }
        } else {
          arr.push({ role: 'assistant', content: data.response, timestamp: data.timestamp })
        }
        pendingIndex.current = null
        return arr
      })
      loadData()
    } catch {
      setMessages(m => {
        const arr = [...m]
        const idx = pendingIndex.current
        if (idx !== null && arr[idx] && arr[idx].pending) {
          arr[idx] = { role: 'assistant', content: 'Error contacting server.' }
        } else {
          arr.push({ role: 'assistant', content: 'Error contacting server.' })
        }
        pendingIndex.current = null
        return arr
      })
    }
  }

  async function generateImage() {
    const text = imagePrompt.trim()
    if (!text) return
    setImagePrompt('')
    setMessages(m => [...m, { role: 'user', content: `Generate image: ${text}`, timestamp: new Date().toISOString() }])
    setMessages(m => {
      const arr = [...m, { role: 'assistant', content: 'Generating image...', pending: true }]
      pendingIndex.current = arr.length - 1
      return arr
    })
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (authHeader.current) headers.Authorization = authHeader.current
      const res = await fetch('/api/image', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt: text })
      })
      const data = await res.json()
      setMessages(m => {
        const arr = [...m]
        const idx = pendingIndex.current
        if (idx !== null && arr[idx] && arr[idx].pending) {
          arr[idx] = { role: 'assistant', content: data.url, timestamp: new Date().toISOString() }
        } else {
          arr.push({ role: 'assistant', content: data.url, timestamp: new Date().toISOString() })
        }
        pendingIndex.current = null
        return arr
      })
    } catch {
      setMessages(m => {
        const arr = [...m]
        const idx = pendingIndex.current
        if (idx !== null && arr[idx] && arr[idx].pending) {
          arr[idx] = { role: 'assistant', content: 'Error generating image.' }
        } else {
          arr.push({ role: 'assistant', content: 'Error generating image.' })
        }
        pendingIndex.current = null
        return arr
      })
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

  // Toggle Logan presence.  When toggled, send a slash command to
  // the backend to update the agent mode.  The UI state mirrors
  // whether Logan is present.  This does not append a message to the
  // chat but updates the server state silently.
  async function togglePresence() {
    const newState = !isPresent
    setIsPresent(newState)
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (authHeader.current) headers.Authorization = authHeader.current
      const endpoint = newState ? '/api/loganin' : '/api/loganout'
      await fetch(endpoint, { method: 'POST', headers })
    } catch (e) {
      console.error('Failed to toggle presence', e)
    }
  }

  // On mount, synchronise presence state with the backend.  This
  // ensures the toggle reflects the current agent mode if the page is
  // reloaded or multiple clients are open.
  useEffect(() => {
    async function syncPresence() {
      try {
        const res = await fetch('/api/status')
        if (res.ok) {
          const data = await res.json()
          setIsPresent(data.mode === 'ajax')
        }
      } catch {
        // ignore
      }
    }
    syncPresence()
  }, [])

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
        isPresent={isPresent}
        togglePresence={togglePresence}
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
                {messages.map((m, i) => {
                  const match =
                    m.role === 'assistant' &&
                    typeof m.content === 'string' &&
                    m.content.match(/https?:\/\/\S+\.(?:png|jpg|jpeg)/i)
                  return (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`${m.role === 'user' ? 'bg-user text-gray-900 dark:text-white' : 'bg-assistant text-gray-900 dark:text-white'} px-4 py-2 rounded-lg max-w-[75%] space-y-1 whitespace-pre-wrap`}
                      >
                        <div className="chat-message-content">
                          {m.pending ? <span className="animate-pulse">{m.content}</span> : m.content}
                        </div>
                        {match && (
                          <img src={match[0]} alt="preview" className="mt-2 max-w-full rounded-lg" />
                        )}
                        {m.timestamp && (
                          <div className="text-[10px] text-gray-500 text-right">
                            {new Date(m.timestamp).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-2 bg-white dark:bg-gray-900 sticky bottom-0 flex gap-2">
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
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 space-y-2">
              <h2 className="font-semibold mb-1">🎨 Generate Image</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imagePrompt}
                  onChange={e => setImagePrompt(e.target.value)}
                  placeholder="Image prompt"
                  className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1 text-sm bg-transparent"
                />
                <button onClick={generateImage} className="bg-blue-500 text-white px-3 py-1 rounded">
                  Go
                </button>
              </div>
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
      {/* Sticky sidebar toggle for mobile: remain accessible regardless of scroll position. */}
      <button
        onClick={() => setSidebarOpen(s => !s)}
        className="fixed bottom-4 left-4 bg-gray-800 text-white p-3 rounded-full shadow-lg sm:hidden"
        aria-label="Toggle sidebar"
      >
        <Bars3Icon className="w-5 h-5" />
      </button>
    </div>
  )
}

export default App
