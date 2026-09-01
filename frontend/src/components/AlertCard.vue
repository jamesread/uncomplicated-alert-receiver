<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import { Copy01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { copyText, formatAlertForLlm } from '../lib/alertClipboard.js'
import { formatStartsAtAge } from '../lib/formatAge.js'

const props = defineProps({
  href: {
    type: String,
    default: '#'
  },
  summary: {
    type: String,
    default: ''
  },
  startsAt: {
    type: String,
    default: ''
  },
  labels: {
    type: Array,
    default: () => []
  },
  allLabels: {
    type: Object,
    default: () => ({})
  },
  annotations: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['filter'])

const copied = ref(false)
let copiedTimer

const severityLabel = computed(() => props.labels.find(label => label.key === 'severity') || null)
const otherLabels = computed(() => props.labels.filter(label => label.key !== 'severity'))
const ageText = computed(() => formatStartsAtAge(props.startsAt))
const ageTitle = computed(() => {
  if (!ageText.value) {
    return ''
  }
  return 'Firing since ' + new Date(props.startsAt).toLocaleString()
})

const copyPayload = computed(() => formatAlertForLlm({
  summary: props.summary,
  labels: props.allLabels,
  annotations: props.annotations,
  alertmanagerUrl: props.href
}))

async function copyAlert (event) {
  event.preventDefault()
  event.stopPropagation()
  try {
    await copyText(copyPayload.value)
    copied.value = true
    window.clearTimeout(copiedTimer)
    copiedTimer = window.setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch (err) {
    console.error('Could not copy alert:', err)
  }
}

onUnmounted(() => {
  window.clearTimeout(copiedTimer)
})
</script>

<template>
  <div class="alert">
    <button
      type="button"
      class="alert-copy neutral"
      :title="copied ? 'Copied' : 'Copy alert for an LLM'"
      :aria-label="copied ? 'Copied' : 'Copy alert for an LLM'"
      @click="copyAlert"
    >
      <HugeiconsIcon
        :icon="copied ? Tick02Icon : Copy01Icon"
        width="16"
        height="16"
        aria-hidden="true"
      />
    </button>
    <a :href="href" target="_blank" rel="noopener noreferrer">{{ summary }}</a>
    <time
      v-if="ageText"
      class="alert-age"
      :datetime="startsAt"
      :title="ageTitle"
    >{{ ageText }}</time>
    <button
      v-if="severityLabel"
      type="button"
      class="tag clickable"
      :class="severityLabel.karmaClass"
      :title="'severity=' + severityLabel.value + ' — Filter by this label'"
      @click="emit('filter', severityLabel)"
    >
      {{ severityLabel.value }}
    </button>
    <button
      v-for="label in otherLabels"
      :key="label.key + '=' + label.value"
      type="button"
      class="annotation clickable"
      :class="label.karmaClass"
      :title="label.key + '=' + label.value + ' — Filter by this label'"
      @click="emit('filter', label)"
    >
      <span class="annotation-key">{{ label.key }}</span>
      <span class="annotation-val">{{ label.value }}</span>
    </button>
  </div>
</template>
