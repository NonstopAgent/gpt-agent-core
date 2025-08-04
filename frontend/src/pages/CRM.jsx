import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'

export default function CRMPage() {
  const { brand } = useParams()
  const [records, setRecords] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!brand) return
    async function load() {
      const res = await fetch(`/api/crm/${brand}`)
      const data = await res.json()
      const list = Object.values(data)[0] || []
      setRecords(Array.isArray(list) ? list : [])
    }
    load()
  }, [brand])

  return (
    <div className="flex h-screen">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <main className="flex-1 flex flex-col">
        <header className="p-4 border-b">{brand ? `CRM for ${brand}` : 'CRM'}</header>
        <div className="p-4 space-y-2 text-sm">
          {records.map((r, i) => (
            <pre key={i} className="bg-gray-100 dark:bg-gray-800 p-2 rounded">{JSON.stringify(r, null, 2)}</pre>
          ))}
          {records.length === 0 && <div>No records.</div>}
        </div>
      </main>
    </div>
  )
}
