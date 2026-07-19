import { defineStore } from 'pinia';
import api from '../services/api';

export const useLocationStore = defineStore('location', {
  state: () => ({
    locations: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchLocations() {
      this.loading = true;
      try {
        const response = await api.get('/locations?populate=*');
        this.locations = response.data.data;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
    async addLocation(locationData) {
      try {
        const response = await api.post('/locations', { data: locationData });
        this.locations.push(response.data.data);
        return response.data.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },
    async updateLocation(id, locationData) {
      try {
        const response = await api.put(`/locations/${id}`, { data: locationData });
        const index = this.locations.findIndex(l => l.documentId === id);
        if (index !== -1) {
          this.locations[index] = response.data.data;
        }
        return response.data.data;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },
    async deleteLocation(id) {
      try {
        await api.delete(`/locations/${id}`);
        this.locations = this.locations.filter(l => l.documentId !== id);
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    }
  }
});
