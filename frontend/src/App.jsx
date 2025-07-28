import { useEffect, useState } from 'react'
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
  const quotes = ["Let's get to work", 'Ready when you are', 'What next?']

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  async function loadData() {
    try {
      const [qRes, hRes] = await Promise.all([
        fetch('/api/queue'),
        fetch('/api/logs')
      ])
      setQueue(await qRes.json())
      setHistory(await hRes.json())
    } catch (err) {
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
    } catch (err) {
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
    <div className="h-full flex bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <aside className="w-64 bg-gray-800 text-white flex flex-col p-4 space-y-4">
        <div>
          <h1 className="text-xl font-bold">Welcome Logan 👋</h1>
          <p className="text-sm text-gray-300">{quotes[new Date().getSeconds() % quotes.length]}</p>
        </div>
        <nav className="flex-1 space-y-2 text-sm">
          {BRANDS.map(b => (
            <div key={b.key} className="space-y-1">
              <button className="font-semibold" onClick={() => setBrand(b.key)}>{b.name}</button>
              <ul className="ml-3 text-xs list-disc">
                <li>Slides</li>
                <li>Captions</li>
                <li>Saved Prompts</li>
                <li>Uploads</li>
              </ul>
            </div>
          ))}
        </nav>
        <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="text-sm mt-auto">Toggle {theme === 'light' ? 'Dark' : 'Light'} Mode</button>
      </aside>
      <main className="flex-1 p-4 flex flex-col space-y-4 overflow-hidden">
        <div className="flex-1 border rounded p-2 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-2 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'assistant' ? 'text-right' : 'text-left'}>
                <div>{m.content}</div>
                <div className="text-xs text-gray-500">{new Date(m.timestamp).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && send()} placeholder="Ask me anything or give a command..." className="flex-1 border rounded px-2 py-1 text-gray-900" />
            <button onClick={send} className="ml-2 bg-blue-500 text-white px-4 py-1 rounded">Send</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
          <section className="border rounded p-2 max-h-40 overflow-y-auto">
            <h2 className="font-semibold mb-1">\u270D\uFE0F Task Queue</h2>
            <ul className="text-xs space-y-1">
              {queue.map((q,i)=>(<li key={i}>{q.timestamp} – {q.task}</li>))}
            </ul>
          </section>
          <section className="border rounded p-2 max-h-40 overflow-y-auto">
            <h2 className="font-semibold mb-1">\u2705 Task History</h2>
            <ul className="text-xs space-y-1">
              {history.slice().reverse().map((h,i)=>(<li key={i}>{h.timestamp} – {h.task}</li>))}
            </ul>
          </section>
        </div>
        <section className="border rounded p-2">
          <h2 className="font-semibold mb-1">Upload Panel</h2>
          <input type="file" multiple onChange={upload} className="text-sm" />
        </section>
      </main>
    </div>
  )
}

export default App
