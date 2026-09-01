import { createRouter, createWebHistory } from 'vue-router'
import Alerts from './views/Alerts.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Alerts }
  ]
})
