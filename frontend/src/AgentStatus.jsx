import { useEffect, useState } from 'react'

export default function AgentStatus() {
  const [status, setStatus] = useState({ status: 'idle' })

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/task/status')
        if (res.ok) setStatus(await res.json())
      } catch {
        // ignore
      }
    }
    fetchStatus()
    const id = setInterval(fetchStatus, 4000)
    return () => clearInterval(id)
  }, [])

  if (!status || status.status === 'idle') {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-lg p-3 text-sm w-64 transition-all">
      <div className="font-semibold mb-1">🧠 Agent Working Now</div>
      <div className="text-xs">{status.task}</div>
      <div className="text-xs">Status: {status.status}</div>
      <div className="text-xs">{status.timestamp}</div>
    </div>
  )
}
