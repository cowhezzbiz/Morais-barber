import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import AdminPage from './AdminPage.tsx'
import Acompanhamento from './Acompanhamento.tsx'

// Remove a tela de carregamento assim que o React monta
const bootEl = document.getElementById('fallback-boot')
if (bootEl) bootEl.remove()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin.morais" element={<AdminPage />} />
        <Route path="/admin-morais" element={<AdminPage />} />
        <Route path="/agendamento" element={<Acompanhamento />} />
        <Route path="/preview" element={<App />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
)
