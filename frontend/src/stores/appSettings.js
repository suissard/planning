import { defineStore } from 'pinia';

export const useAppSettingsStore = defineStore('appSettings', {
  state: () => {
    const saved = localStorage.getItem('useMockData');
    const isDev = window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1' ||
                  window.location.hostname.endsWith('.local') ||
                  !!import.meta.env.DEV ||
                  window.location.search.includes('mock=true');
    const savedAdmin = localStorage.getItem('isAdminMode');
    return {
      useMockData: saved !== null ? saved === 'true' : isDev,
      isAdminMode: savedAdmin !== null ? savedAdmin === 'true' : true,
    };
  },
  actions: {
    setMockData(value) {
      this.useMockData = !!value;
      localStorage.setItem('useMockData', String(this.useMockData));
    },
    toggleMockData() {
      this.setMockData(!this.useMockData);
    },
    setAdminMode(value) {
      this.isAdminMode = !!value;
      localStorage.setItem('isAdminMode', String(this.isAdminMode));
    },
    toggleAdminMode() {
      this.setAdminMode(!this.isAdminMode);
    }
  }
});


