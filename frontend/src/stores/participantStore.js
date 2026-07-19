import { defineStore } from 'pinia';
import api from '../services/api';
import { useActiveSchedulerStore } from './activeScheduler';

export const useParticipantStore = defineStore('participant', {
  state: () => ({
    loading: false,
    error: null
  }),
  actions: {
    async createParticipant(data) {
      this.loading = true;
      this.error = null;
      try {
        const payload = { data };
        const res = await api.post('/participants', payload);
        const schedulerStore = useActiveSchedulerStore();
        if (schedulerStore.isConnected) {
            await schedulerStore.fetchData();
        }
        return res.data?.data;
      } catch (err) {
        console.error(err);
        this.error = err.response?.data?.error?.message || err.message || 'Erreur lors de la création.';
        throw new Error(this.error);
      } finally {
        this.loading = false;
      }
    },

    async updateParticipant(documentId, data) {
      this.loading = true;
      this.error = null;
      try {
        const payload = { data };
        const res = await api.put(`/participants/${documentId}`, payload);
        const schedulerStore = useActiveSchedulerStore();
        if (schedulerStore.isConnected) {
            await schedulerStore.fetchData();
        }
        return res.data?.data;
      } catch (err) {
        console.error(err);
        this.error = err.response?.data?.error?.message || err.message || 'Erreur lors de la mise à jour.';
        throw new Error(this.error);
      } finally {
        this.loading = false;
      }
    },

    async deleteParticipant(documentId) {
      this.loading = true;
      this.error = null;
      try {
        await api.delete(`/participants/${documentId}`);
        const schedulerStore = useActiveSchedulerStore();
        if (schedulerStore.isConnected) {
            await schedulerStore.fetchData();
        }
      } catch (err) {
        console.error(err);
        this.error = err.response?.data?.error?.message || err.message || 'Erreur lors de la suppression.';
        throw new Error(this.error);
      } finally {
        this.loading = false;
      }
    }
  }
});
