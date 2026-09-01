import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { supplementalThemesPlugin } from './vite.supplementalThemes.js'

const backendPort = process.env.PORT || '8080'
const backendTarget = 'http://localhost:' + backendPort

export default defineConfig({
  plugins: [
    vue(),
    supplementalThemesPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['images/icons/logo.png'],
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}', 'supplemental-themes/**/*.css'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: []
      }
    })
  ],
  test: {
    environment: 'node'
  },
  optimizeDeps: {
    // ThemeSwitcher.vue imports this via a relative path; keep one singleton
    // so initCustomTheme() in main.js shares state with the selector.
    exclude: ['picocrank/vue/composables/useCustomTheme.js']
  },
  server: {
    proxy: {
      '/webUiSettings.json': {
        target: backendTarget,
        changeOrigin: true,
        secure: false
      },
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        secure: false
      }
    }
  }
})
