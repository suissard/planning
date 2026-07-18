import { defineStore } from 'pinia';
import { useSchedulerStore } from './scheduler';
import { useMockSchedulerStore } from './mockScheduler';
import { useAppSettingsStore } from './appSettings';
import { computed } from 'vue';

export const useActiveSchedulerStore = defineStore('activeScheduler', () => {
  const appSettings = useAppSettingsStore();

  const activeStore = computed(() => {
    return appSettings.useMockData ? useMockSchedulerStore() : useSchedulerStore();
  });

  const locations = computed(() => activeStore.value.locations);
  const activities = computed(() => activeStore.value.activities);
  const facilitators = computed(() => activeStore.value.facilitators);
  const participants = computed(() => activeStore.value.participants);
  const timeslots = computed(() => activeStore.value.timeslots);
  const loading = computed(() => activeStore.value.loading);
  const error = computed(() => activeStore.value.error);
  const isConnected = computed(() => activeStore.value.isConnected);

  async function fetchData() {
    return await activeStore.value.fetchData();
  }

  async function createSlot(form) {
    return await activeStore.value.createSlot(form);
  }

  async function deleteSlot(documentId) {
    return await activeStore.value.deleteSlot(documentId);
  }

  return {
    locations,
    activities,
    facilitators,
    participants,
    timeslots,
    loading,
    error,
    isConnected,
    fetchData,
    createSlot,
    deleteSlot,
    activeStore
  };
});
