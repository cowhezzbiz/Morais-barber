import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// Nota: NÃO usar @vitejs/plugin-legacy — ele injeta scripts inline no HTML,
// que o CSP estrito (script-src 'self') bloqueia. Navegadores muito antigos
// recebem aviso claro do /boot.js (externo) pedindo pra atualizar o navegador.
export default defineConfig({
  plugins: [react()],
})
