import { defineStore } from 'pinia';

export const useAppSettingsStore = defineStore('appSettings', {
  state: () => {
    const saved = localStorage.getItem('useMockData');
    const isDev = window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1' ||
                  window.location.hostname.endsWith('.local') ||
                  !!import.meta.env.DEV ||
                  window.location.search.includes('mock=true');
    return {
      useMockData: saved !== null ? saved === 'true' : isDev,
    };
  },
  actions: {
    setMockData(value) {
      this.useMockData = !!value;
      localStorage.setItem('useMockData', String(this.useMockData));
    },
    toggleMockData() {
      this.setMockData(!this.useMockData);
    }
  }
});

