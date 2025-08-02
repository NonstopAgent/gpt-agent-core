import { useState } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import ChatBox from '../components/ChatBox.jsx'
import LiveWebView from '../components/LiveWebView.jsx'
import ToggleDarkMode from '../components/ToggleDarkMode.jsx'

/**
 * Main page that composes the sidebar, chat panel and live webview.
 * Handles project selection and dark mode.
 */
export default function IndexPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [brands, setBrands] = useState([
    { key: 'remote100k', name: 'Remote100K' },
    { key: 'tradeview_ai', name: 'Tradeview AI' },
    { key: 'app_304', name: '304 App' },
  ])
  const [current, setCurrent] = useState({ project: '', item: '' })
  const [conversations, setConversations] = useState({})
  const [task, setTask] = useState({ text: 'Waiting for input…', running: false })

  const currentKey = `${current.project}/${current.item}`

  function updateMessages(updater) {
    setConversations(prev => {
      const list = prev[currentKey] || []
      const updated = typeof updater === 'function' ? updater(list) : updater
      return { ...prev, [currentKey]: updated }
    })
  }

  async function sendMessage(text) {
    const lower = text.toLowerCase()
    let status
    if (lower.includes('tiktok')) status = 'Ajax is scanning TikTok comments…'
    else if (lower.includes('slideshow')) status = 'Generating slideshow…'
    else status = 'Ajax is thinking…'

    setTask({ text: status, running: true })

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    })
    const data = await res.json()
    setTask({ text: 'Waiting for input…', running: false })
    return data
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Sidebar
        brands={brands}
        onSelect={(project, item) => setCurrent({ project, item })}
        onAddProject={p => setBrands(b => [...b, p])}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="flex flex-col md:ml-60 h-screen">
        <header className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800 md:border-b-0">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden">☰</button>
          <div className="font-semibold truncate">
            {current.project && current.item
              ? `${brands.find(b => b.key === current.project)?.name || ''} / ${current.item}`
              : 'Select a folder'}
          </div>
          <ToggleDarkMode />
        </header>
        <main className="flex-1 flex flex-col md:flex-row">
          <section className="flex-1 flex flex-col">
            <ChatBox
              messages={conversations[currentKey] || []}
              setMessages={updateMessages}
              sendMessage={sendMessage}
            />
          </section>
          <LiveWebView status={task.text} running={task.running} />
        </main>
      </div>
    </div>
  )
}