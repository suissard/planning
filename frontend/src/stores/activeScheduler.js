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

  async function updateSlot(documentId, form) {
    return await activeStore.value.updateSlot(documentId, form);
  }

  async function deleteSlot(documentId) {
    return await activeStore.value.deleteSlot(documentId);
  }

  async function addParticipantToSlot(slotId, participantId) {
    return await activeStore.value.addParticipantToSlot(slotId, participantId);
  }

  async function removeParticipantFromSlot(slotId, participantId) {
    return await activeStore.value.removeParticipantFromSlot(slotId, participantId);
  }

  async function moveParticipantBetweenSlots(fromSlotId, toSlotId, participantId) {
    return await activeStore.value.moveParticipantBetweenSlots(fromSlotId, toSlotId, participantId);
  }

  async function addFacilitatorToSlot(slotId, facilitatorId) {
    return await activeStore.value.addFacilitatorToSlot(slotId, facilitatorId);
  }

  async function removeFacilitatorFromSlot(slotId, facilitatorId) {
    return await activeStore.value.removeFacilitatorFromSlot(slotId, facilitatorId);
  }

  async function setLocationForSlot(slotId, locationId) {
    return await activeStore.value.setLocationForSlot(slotId, locationId);
  }

  async function createSlotForDate(activityId, dateStr, options) {
    return await activeStore.value.createSlotForDate(activityId, dateStr, options);
  }

  async function duplicateDaySlots(sourceDateStr, targetDateStrings, options) {
    return await activeStore.value.duplicateDaySlots(sourceDateStr, targetDateStrings, options);
  }

  async function batchDeleteSlots(slotIds) {
    return await activeStore.value.batchDeleteSlots(slotIds);
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
    updateSlot,
    deleteSlot,
    addParticipantToSlot,
    removeParticipantFromSlot,
    moveParticipantBetweenSlots,
    addFacilitatorToSlot,
    removeFacilitatorFromSlot,
    setLocationForSlot,
    createSlotForDate,
    duplicateDaySlots,
    batchDeleteSlots,
    activeStore
  };
});
