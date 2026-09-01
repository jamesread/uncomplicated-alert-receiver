import { createApp } from 'vue'

// Light Femtocrank tokens only. Do not import femtocrank/dark.css — that file
// applies dark variables with prefers-color-scheme and ignores data-theme.
import 'femtocrank/style.css'
import 'picocrank/styles/picocrank-extensions.css'
import 'picocrank/styles/dark-theme.css'
import 'picocrank/vue/composables/useTheme.js'
import { initCustomTheme, SUPPLEMENTAL_THEME_NAMES } from 'picocrank/vue/composables/useCustomTheme.js'
import './style.css'
import App from './App.vue'
import router from './router.js'

const { discoverThemes } = initCustomTheme({
  storageKey: 'uar-custom-theme',
  includeSupplementalThemes: true,
  supplementalThemeNames: [...SUPPLEMENTAL_THEME_NAMES],
  availableThemes: [...SUPPLEMENTAL_THEME_NAMES]
})
void discoverThemes()

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  })
}

createApp(App).use(router).mount('#app')
