<script setup>
import { nextTick, ref, watch } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { filtersToText } from '../lib/filters.js'

const props = defineProps({
  filters: {
    type: Array,
    default: () => []
  },
  editMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['clear', 'remove', 'submit', 'toggle-edit'])

const editInput = ref(null)
const editText = ref('')

watch(() => props.editMode, async (enabled) => {
  if (!enabled) return
  editText.value = filtersToText(props.filters)
  await nextTick()
  editInput.value?.focus()
  editInput.value?.select()
})

function onSubmit () {
  emit('submit', editText.value)
}
</script>

<template>
  <div v-if="filters.length || editMode" class="filter-bar">
    <span class="filter-bar__label subtle">Filters:</span>
    <div v-if="!editMode" class="filter-bar__chips" aria-live="polite">
      <div v-for="filter in filters" :key="filter.key + '=' + filter.value" class="filter-bar__chip">
        <span class="annotation">
          <span class="annotation-key">{{ filter.key }}</span>
          <span class="annotation-val">{{ filter.value }}</span>
        </span>
        <button
          type="button"
          class="neutral"
          :aria-label="'Remove filter ' + filter.key + '=' + filter.value"
          title="Remove filter"
          @click="emit('remove', filter)"
        >
          <HugeiconsIcon :icon="Cancel01Icon" width="14" height="14" aria-hidden="true" />
        </button>
      </div>
    </div>
    <form v-else class="filter-bar__edit-form" @submit.prevent="onSubmit">
      <input
        ref="editInput"
        v-model="editText"
        type="text"
        placeholder="key=value key2=value2"
        aria-label="Edit filters"
        autocomplete="off"
        spellcheck="false"
      >
    </form>
    <button type="button" class="neutral" @click="editMode ? onSubmit() : emit('toggle-edit')">
      {{ editMode ? 'Done' : 'Edit' }}
    </button>
    <button type="button" class="neutral" @click="emit('clear')">Clear</button>
  </div>
</template>
