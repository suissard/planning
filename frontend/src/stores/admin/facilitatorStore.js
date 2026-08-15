import { defineStore } from 'pinia';
import api from '../../services/api';
import { useAppSettingsStore } from '../appSettings';
import { useMockSchedulerStore } from '../mockScheduler';
import { useActiveSchedulerStore } from '../activeScheduler';

export const useFacilitatorStore = defineStore('adminFacilitator', {
  state: () => ({
    facilitators: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchFacilitators() {
      const appSettings = useAppSettingsStore();
      if (appSettings.useMockData) {
        const mockStore = useMockSchedulerStore();
        await mockStore.fetchData();
        this.facilitators = mockStore.facilitators;
        return this.facilitators;
      }

      this.loading = true;
      this.error = null;
      try {
        const response = await api.get('/facilitators?sort=lastName:asc,firstName:asc&populate=*&pagination[pageSize]=5000');
        this.facilitators = response.data.data || [];
        return this.facilitators;
      } catch (err) {
        console.error('Error fetching facilitators:', err);
        this.error = err.response?.data?.error?.message || err.message || 'Erreur lors du chargement des animateurs';
      } finally {
        this.loading = false;
      }
    },

    async createFacilitator(facilitatorData) {
      const appSettings = useAppSettingsStore();
      if (appSettings.useMockData) {
        const mockStore = useMockSchedulerStore();
        const created = await mockStore.createFacilitator(facilitatorData);
        this.facilitators = mockStore.facilitators;
        return created;
      }

      this.loading = true;
      try {
        const payload = { data: facilitatorData };
        const response = await api.post('/facilitators', payload);
        const schedulerStore = useActiveSchedulerStore();
        await schedulerStore.fetchData();
        return response.data.data;
      } catch (err) {
        console.error('Error creating facilitator:', err);
        const errorMsg = err.response?.data?.error?.message || err.message || 'Erreur lors de la création de l\'animateur';
        throw new Error(errorMsg);
      } finally {
        this.loading = false;
      }
    },

    async updateFacilitator(documentId, facilitatorData) {
      const appSettings = useAppSettingsStore();
      if (appSettings.useMockData) {
        const mockStore = useMockSchedulerStore();
        const updated = await mockStore.updateFacilitator(documentId, facilitatorData);
        this.facilitators = mockStore.facilitators;
        return updated;
      }

      this.loading = true;
      try {
        const payload = { data: facilitatorData };
        const response = await api.put(`/facilitators/${documentId}`, payload);
        const schedulerStore = useActiveSchedulerStore();
        await schedulerStore.fetchData();
        return response.data.data;
      } catch (err) {
        console.error('Error updating facilitator:', err);
        const errorMsg = err.response?.data?.error?.message || err.message || 'Erreur lors de la modification de l\'animateur';
        throw new Error(errorMsg);
      } finally {
        this.loading = false;
      }
    },

    async deleteFacilitator(documentId) {
      const appSettings = useAppSettingsStore();
      if (appSettings.useMockData) {
        const mockStore = useMockSchedulerStore();
        await mockStore.deleteFacilitator(documentId);
        this.facilitators = mockStore.facilitators;
        return;
      }

      this.loading = true;
      try {
        await api.delete(`/facilitators/${documentId}`);
        const schedulerStore = useActiveSchedulerStore();
        await schedulerStore.fetchData();
      } catch (err) {
        console.error('Error deleting facilitator:', err);
        const errorMsg = err.response?.data?.error?.message || err.message || 'Erreur lors de la suppression de l\'animateur';
        throw new Error(errorMsg);
      } finally {
        this.loading = false;
      }
    }
  }
});
