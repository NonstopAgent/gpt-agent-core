import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import IndexPage from './pages/index.jsx'
import GrowthAgentPage from './pages/agents/Growth.jsx'
import DevAgentPage from './pages/agents/Dev.jsx'
import SupportAgentPage from './pages/agents/Support.jsx'
import OpsAgentPage from './pages/agents/Ops.jsx'
import CRMPage from './pages/CRM.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/agents/growth" element={<GrowthAgentPage />} />
        <Route path="/agents/dev" element={<DevAgentPage />} />
        <Route path="/agents/support" element={<SupportAgentPage />} />
        <Route path="/agents/ops" element={<OpsAgentPage />} />
        <Route path="/crm/:brand" element={<CRMPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
