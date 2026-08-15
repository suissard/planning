import { defineStore } from 'pinia';
import api from '../services/api';
import { useAppSettingsStore } from './appSettings';
import { useMockSchedulerStore } from './mockScheduler';
import { useActiveSchedulerStore } from './activeScheduler';

export const useLocationStore = defineStore('location', {
  state: () => ({
    locations: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchLocations() {
      const appSettings = useAppSettingsStore();
      if (appSettings.useMockData) {
        const mockStore = useMockSchedulerStore();
        await mockStore.fetchData();
        this.locations = mockStore.locations;
        return this.locations;
      }

      this.loading = true;
      try {
        const response = await api.get('/locations?populate=*');
        this.locations = response.data.data;
        return this.locations;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },

    async addLocation(locationData) {
      const appSettings = useAppSettingsStore();
      if (appSettings.useMockData) {
        const mockStore = useMockSchedulerStore();
        const created = await mockStore.createLocation(locationData);
        this.locations = mockStore.locations;
        return created;
      }

      try {
        const response = await api.post('/locations', { data: locationData });
        this.locations.push(response.data.data);
        const schedulerStore = useActiveSchedulerStore();
        await schedulerStore.fetchData();
        return response.data.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async updateLocation(id, locationData) {
      const appSettings = useAppSettingsStore();
      if (appSettings.useMockData) {
        const mockStore = useMockSchedulerStore();
        const updated = await mockStore.updateLocation(id, locationData);
        this.locations = mockStore.locations;
        return updated;
      }

      try {
        const response = await api.put(`/locations/${id}`, { data: locationData });
        const index = this.locations.findIndex(l => l.documentId === id);
        if (index !== -1) {
          this.locations[index] = response.data.data;
        }
        const schedulerStore = useActiveSchedulerStore();
        await schedulerStore.fetchData();
        return response.data.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async deleteLocation(id) {
      const appSettings = useAppSettingsStore();
      if (appSettings.useMockData) {
        const mockStore = useMockSchedulerStore();
        await mockStore.deleteLocation(id);
        this.locations = mockStore.locations;
        return;
      }

      try {
        await api.delete(`/locations/${id}`);
        this.locations = this.locations.filter(l => l.documentId !== id);
        const schedulerStore = useActiveSchedulerStore();
        await schedulerStore.fetchData();
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    }
  }
});
