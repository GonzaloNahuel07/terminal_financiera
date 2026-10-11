/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg'],
      manifest: {
        name: 'Terminal Financiera • Gotham & Spider Web HUD',
        short_name: 'Finanzas HUD',
        description: 'PWA táctica para administración de liquidez, ingresos diarios, deudas y reservas en ARS',
        theme_color: '#08090c',
        background_color: '#08090c',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: '/icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: '+ Registrar Cobro',
            short_name: 'Cobro',
            url: '/?action=daily-income',
            icons: [{ src: '/icon.svg', sizes: '192x192' }]
          },
          {
            name: 'Centro de Reservas',
            short_name: 'Reservas',
            url: '/?tab=reserves',
            icons: [{ src: '/icon.svg', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/index.html'
      }
    })
  ],
  server: {
    host: true,
    port: 5173
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts'
  }
})
