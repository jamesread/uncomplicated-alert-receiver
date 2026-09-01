<script setup>
import { computed, onMounted, provide, ref } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import { FullScreenIcon, GithubIcon, Settings01Icon } from '@hugeicons/core-free-icons'
import Header from 'picocrank/vue/components/Header.vue'
import PreferencesDialog from './components/PreferencesDialog.vue'
import { useBoard } from './composables/useBoard.js'

const board = useBoard()
provide('board', board)

const isFullscreen = ref(false)
const preferencesDialog = ref(null)

const fullscreenTitle = computed(() => isFullscreen.value ? 'Exit fullscreen' : 'Fullscreen')

function toggleFullscreen () {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.error('Error attempting to enable fullscreen:', err)
    })
    return
  }
  document.exitFullscreen().catch(err => {
    console.error('Error attempting to exit fullscreen:', err)
  })
}

function applyPwaHeaderClasses () {
  const header = document.querySelector('header')
  if (!header) return

  const displayModeQueries = [
    window.matchMedia('(display-mode: standalone)'),
    window.matchMedia('(display-mode: fullscreen)'),
    window.matchMedia('(display-mode: minimal-ui)'),
    window.matchMedia('(display-mode: window-controls-overlay)')
  ]
  const wcoQuery = displayModeQueries[3]

  function updateHeaderClasses () {
    header.classList.toggle('pwa', displayModeQueries.some(q => q.matches))
    header.classList.toggle('wco', wcoQuery.matches)
    document.body.classList.toggle('wco', wcoQuery.matches)
  }

  updateHeaderClasses()
  displayModeQueries.forEach(q => q.addEventListener('change', updateHeaderClasses))
}

onMounted(() => {
  applyPwaHeaderClasses()
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement
  })
})
</script>

<template>
  <Header
    title="UAR"
    logo-url="/images/icons/logo.png"
    :sidebar-enabled="false"
    :theme-toggle-enabled="false"
  >
    <template #toolbar>
      <div class="header-status">
        <p class="subtle">Next page refresh:</p>
        <progress
          :value="board.refreshProgress"
          :max="board.refreshMax"
          title="Time until next update"
        />
      </div>
      <div class="header-status">
        <p class="subtle">Last result:</p>
        <p :class="board.lastUpdatedStatus.tone" :title="board.lastUpdatedStatus.title">
          {{ board.lastUpdatedStatus.text }}
        </p>
      </div>
      <button
        type="button"
        class="neutral"
        title="Preferences"
        aria-label="Preferences"
        @click="preferencesDialog?.open()"
      >
        <HugeiconsIcon :icon="Settings01Icon" width="1em" height="1em" aria-hidden="true" />
        <span>Preferences</span>
      </button>
      <button
        type="button"
        class="neutral"
        :title="fullscreenTitle"
        @click="toggleFullscreen"
      >
        <HugeiconsIcon :icon="FullScreenIcon" width="1em" height="1em" aria-hidden="true" />
        <span>{{ fullscreenTitle }}</span>
      </button>
    </template>
  </Header>

  <PreferencesDialog ref="preferencesDialog" />

  <div id="layout">
    <div id="content">
      <router-view />

      <footer>
        <span>
          <a href="https://github.com/jamesread/uncomplicated-alert-receiver">
            <HugeiconsIcon :icon="GithubIcon" width="1em" height="1em" aria-hidden="true" />
            UAR on GitHub
          </a>
        </span>
        <span><a href="https://jamesread.github.io/uncomplicated-alert-receiver/">Docs</a></span>
        <span v-if="board.versionText">{{ board.versionText }}</span>
      </footer>
    </div>
  </div>
</template>
