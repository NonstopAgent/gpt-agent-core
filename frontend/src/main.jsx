import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Import the new index page instead of the old App
import IndexPage from './pages/index.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <IndexPage />
  </StrictMode>,
)
