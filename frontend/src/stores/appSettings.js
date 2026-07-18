import { defineStore } from 'pinia';

export const useAppSettingsStore = defineStore('appSettings', {
  state: () => ({
    useMockData: window.location.hostname.includes('localhost'),
  }),
  actions: {
    toggleMockData() {
      this.useMockData = !this.useMockData;
    }
  }
});
