import { useState } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import ChatBox from '../components/ChatBox.jsx'
import UploadPanel from '../components/UploadPanel.jsx'
import AgentStatusPanel from '../components/AgentStatusPanel.jsx'
import ToggleDarkMode from '../components/ToggleDarkMode.jsx'

/**
 * Main page that composes the sidebar, chat, upload panel and
 * status panel.  Handles project selection and file uploads.
 */
export default function IndexPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [brands, setBrands] = useState([
    { key: 'remote100k', name: 'Remote100K' },
    { key: 'tradeview_ai', name: 'Tradeview AI' },
    { key: 'app_304', name: '304 App' },
  ])
  const [current, setCurrent] = useState({ project: '', item: '' })

  async function sendMessage(text) {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    })
    return res.json()
  }

  async function uploadFiles(files) {
    const form = new FormData()
    form.append('project', current.project || 'general')
    for (const f of files) form.append('file', f)
    await fetch('/api/upload', {
      method: 'POST',
      body: form,
    })
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Mobile header */}
      <header className="flex items-center justify-between p-3 lg:hidden bg-gray-900 text-gray-100">
        <button onClick={() => setSidebarOpen(o => !o)} className="text-xl">☰</button>
        <ToggleDarkMode />
      </header>
      <Sidebar
        brands={brands}
        onSelect={(project, item) => setCurrent({ project, item })}
        onAddProject={p => setBrands(b => [...b, p])}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      {/* Main content area */}
      <main className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-3rem)] lg:h-screen">
        <section className="flex-1 flex flex-col">
          {/* Top bar for desktop */}
          <div className="hidden lg:flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-900 text-gray-100">
            <div className="text-xl font-semibold">Welcome Logan 👋</div>
            <ToggleDarkMode />
          </div>
          <ChatBox sendMessage={sendMessage} />
          <UploadPanel onUpload={uploadFiles} />
        </section>
        <AgentStatusPanel />
      </main>
    </div>
  )
}