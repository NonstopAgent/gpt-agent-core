import { useEffect, useState } from 'react'

export default function AgentStatus() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/status')
        if (res.ok) setStatus(await res.json())
      } catch {
        // ignore network errors
      }
    }
    fetchStatus()
    const id = setInterval(fetchStatus, 4000)
    return () => clearInterval(id)
  }, [])

  if (!status) {
    return null
  }

  return (
    <div className="fixed right-4 top-1/3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-lg p-3 text-sm w-64 max-h-80 overflow-y-auto">
      <div className="font-semibold mb-1">🧠 Agent Status</div>
      <div className="text-xs"><span className="font-medium">Mode:</span> {status.mode}</div>
      <div className="text-xs"><span className="font-medium">Last command:</span> {status.last_command || '–'}</div>
      <div className="text-xs"><span className="font-medium">Delegating:</span> {status.delegating || 'None'}</div>
      <div className="text-xs"><span className="font-medium">Progress:</span> {status.task_progress}</div>
      {status.history && status.history.length > 0 && (
        <div className="mt-2">
          <div className="text-xs font-medium mb-1">Recent Replies:</div>
          <ul className="text-[10px] list-disc pl-4 space-y-0.5">
            {status.history.map((h, i) => (
              <li key={i} className="whitespace-pre-wrap">{h}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
