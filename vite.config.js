import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Atualiza o app automaticamente quando houver nova versão
      includeAssets: ['favicon.svg', 'icons.svg'], // Arquivos da sua pasta public
      manifest: {
        name: 'Peritagem Digital',
        short_name: 'Peritagem',
        description: 'Aplicativo de Peritagem Digital',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', // Faz o app abrir em tela cheia, sem a barra do navegador
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})