import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Uncomplicated Alert Receiver',
        short_name: 'UAR',
        description: 'View and manage alerts from Alertmanager',
        theme_color: '#444',
        background_color: '#444',
        display: 'window-controls-overlay',
        display_override: ['window-controls-overlay', 'minimal-ui', 'standalone', 'browser'],
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/images/icons/logo.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/images/icons/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: []
      }
    })
  ],
  server: {
    proxy: {
      '/webUiSettings.json': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      }
    },
  },
})
