<script setup>
import { inject } from 'vue'
import AlertCard from '../components/AlertCard.vue'
import FilterBar from '../components/FilterBar.vue'

const board = inject('board')
</script>

<template>
  <FilterBar
    :filters="board.labelFilters"
    :edit-mode="board.filterEditMode"
    @clear="board.clearLabelFilters"
    @remove="board.removeLabelFilter($event.key, $event.value)"
    @submit="board.submitFilterEdit"
    @toggle-edit="board.filterEditMode = !board.filterEditMode"
  />

  <main>
    <div
      v-if="board.offline"
      class="notification warning"
      aria-live="polite"
    >
      <span class="notification-key">Offline</span>
      <span class="notification-body">
        You appear to be offline or the alert receiver is unreachable. Alerts will appear here once the connection is restored.
      </span>
    </div>

    <div v-else id="alert-list">
      <AlertCard
        v-for="alert in board.alerts"
        :key="alert.key"
        :href="alert.href"
        :summary="alert.summary"
        :starts-at="alert.startsAt"
        :all-labels="alert.allLabels"
        :annotations="alert.annotations"
        :labels="alert.labels"
        @filter="board.addLabelFilter($event.key, $event.value)"
      />
    </div>
  </main>
</template>
