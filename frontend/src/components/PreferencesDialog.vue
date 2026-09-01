<script setup>
import { inject, ref } from 'vue'
import FormField from 'picocrank/vue/components/FormField.vue'
import FormLayout from 'picocrank/vue/components/FormLayout.vue'
import RadioGroup from 'picocrank/vue/components/RadioGroup.vue'
import ThemeSwitcher from 'picocrank/vue/components/ThemeSwitcher.vue'
import { useTheme } from 'picocrank/vue/composables/useTheme.js'

const board = inject('board')
const dialog = ref(null)
const { theme } = useTheme()

const boolOptions = [
  { label: 'On', value: true },
  { label: 'Off', value: false }
]

const colorSchemeOptions = [
  { label: 'Auto (system)', value: 'auto' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' }
]

function open () {
  dialog.value?.showModal()
}

function close () {
  dialog.value?.close()
}

defineExpose({ open, close })
</script>

<template>
  <dialog ref="dialog" class="dialog">
    <h2>Preferences</h2>

    <FormLayout @submit.prevent>
      <FormField
        label="Color scheme"
        component-has-label
        description="Choose light, dark, or match your operating system. Saved in this browser."
      >
        <RadioGroup
          v-model="theme"
          name="color-scheme"
          variant="list"
          aria-label="Color scheme"
          :options="colorSchemeOptions"
        />
      </FormField>

      <FormField
        label="Theme"
        for="preferences-theme"
        component-has-label
        description="Named color palette. Saved in this browser."
      >
        <ThemeSwitcher
          label=""
          select-id="preferences-theme"
          :include-supplemental-themes="true"
          storage-key="uar-custom-theme"
        />
      </FormField>

      <FormField
        label="Show labels"
        component-has-label
        description="Display Prometheus label key/value pairs on each alert card."
      >
        <RadioGroup
          name="draw-labels"
          variant="boolean"
          aria-label="Show labels"
          :options="boolOptions"
          :model-value="board.drawLabels"
          @update:model-value="board.setDrawLabelsPreference"
        />
      </FormField>

      <template #actions>
        <button type="button" class="neutral" @click="close">Close</button>
      </template>
    </FormLayout>
  </dialog>
</template>
