import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import AdminPage from './AdminPage.tsx'
import Acompanhamento from './Acompanhamento.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/barber-morais-admin" element={<AdminPage />} />
        <Route path="/agendamento" element={<Acompanhamento />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
)
