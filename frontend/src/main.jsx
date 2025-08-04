import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import IndexPage from './pages/index.jsx'
import Dev from './pages/agents/Dev.jsx'
import Growth from './pages/agents/Growth.jsx'
import Support from './pages/agents/Support.jsx'
import Ops from './pages/agents/Ops.jsx'
import CRM from './pages/CRM.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/agents/dev" element={<Dev />} />
        <Route path="/agents/growth" element={<Growth />} />
        <Route path="/agents/support" element={<Support />} />
        <Route path="/agents/ops" element={<Ops />} />
        <Route path="/crm" element={<CRM />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
