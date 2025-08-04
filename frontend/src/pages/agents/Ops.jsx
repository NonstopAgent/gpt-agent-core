import { useState } from 'react'
import Sidebar from '../../components/Sidebar.jsx'
import ChatBox from '../../components/ChatBox.jsx'
import ActionPanel from '../../components/ActionPanel.jsx'

export default function OpsAgentPage() {
  const [messages, setMessages] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function sendMessage(text) {
    const res = await fetch('/api/agent/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent: 'ops', action: 'chat', input: text })
    })
    return res.json()
  }

  async function runAction(action) {
    const res = await fetch('/api/agent/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent: 'ops', action })
    })
    const data = await res.json()
    setMessages(m => [...m, { role: 'assistant', content: data.response, timestamp: data.timestamp }])
  }

  const actions = [
    { label: 'Queue Task', action: 'queue_task' },
    { label: 'Show Stats', action: 'stats' },
    { label: 'Send Notification', action: 'notify' }
  ]

  return (
    <div className="flex h-screen">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <main className="flex-1 flex flex-col">
        <header className="p-4 border-b">Welcome to Ops Agent</header>
        <div className="flex-1 flex flex-col p-4">
          <ActionPanel actions={actions} onRun={runAction} />
          <ChatBox messages={messages} setMessages={setMessages} sendMessage={sendMessage} />
        </div>
      </main>
    </div>
  )
}
