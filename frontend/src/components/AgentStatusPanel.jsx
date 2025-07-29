import { useEffect, useState } from 'react'

/**
 * AgentStatusPanel polls the backend for the current status and
 * displays a command log.  It also shows connected service icons and
 * allows pausing/resuming responses.
 */
export default function AgentStatusPanel() {
  const [status, setStatus] = useState(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    let id
    async function fetchStatus() {
      try {
        const res = await fetch('/api/status')
        if (res.ok) setStatus(await res.json())
      } catch {
        // ignore
      }
    }
    fetchStatus()
    id = setInterval(fetchStatus, 3000)
    return () => clearInterval(id)
  }, [])

  function togglePause() {
    setPaused(p => !p)
  }

  if (!status) return null

  return (
    <aside className="hidden lg:block w-64 border-l border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900">
      <div className="font-semibold mb-2">🧠 Agent Status</div>
      <div className="text-sm mb-1"><span className="font-medium">Mode:</span> {status.mode}</div>
      <div className="text-sm mb-1"><span className="font-medium">Current task:</span> {status.current_task || '—'}</div>
      <div className="text-sm mb-1"><span className="font-medium">Live status:</span> {status.live_status}</div>
      <div className="text-sm mb-2"><span className="font-medium">Connected:</span> 📹 🎵 💳 📚 📄</div>
      <button
        onClick={togglePause}
        className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-800 text-sm mb-3"
      >
        {paused ? 'Resume' : 'Pause'}
      </button>
      {status.history && status.history.length > 0 && (
        <div className="text-sm">
          <div className="font-medium mb-1">History</div>
          <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
            {status.history.map((h, i) => (
              <li key={i} className="truncate">{h}</li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}