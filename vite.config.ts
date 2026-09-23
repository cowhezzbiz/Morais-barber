import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Suporte a navegadores antigos (Chrome <87, Edge antigo, etc):
    // gera um bundle extra compatível e carrega o que o navegador entender
    legacy({
      targets: ['defaults', 'not IE 11'],
      renderLegacyChunks: true,
    }),
  ],
})
