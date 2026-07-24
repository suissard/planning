import { defineStore } from 'pinia';
import api from '../../services/api';
import { useGlobalStore } from '../global';

export const useFacilitatorStore = defineStore('adminFacilitator', {
  state: () => ({
    facilitators: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchFacilitators() {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get('/facilitators?populate=*&pagination[pageSize]=5000');
        this.facilitators = response.data.data || [];
      } catch (err) {
        console.error('Error fetching facilitators:', err);
        this.error = err.response?.data?.error?.message || err.message || 'Error fetching facilitators';
        useGlobalStore().addError(this.error);
      } finally {
        this.loading = false;
      }
    },
    async createFacilitator(facilitatorData) {
      this.loading = true;
      try {
        const payload = { data: facilitatorData };
        const response = await api.post('/facilitators', payload);
        await this.fetchFacilitators();
        useGlobalStore().addSuccess('Facilitator created successfully');
        return response.data.data;
      } catch (err) {
        console.error('Error creating facilitator:', err);
        const errorMsg = err.response?.data?.error?.message || err.message || 'Error creating facilitator';
        useGlobalStore().addError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        this.loading = false;
      }
    },
    async updateFacilitator(documentId, facilitatorData) {
      this.loading = true;
      try {
        const payload = { data: facilitatorData };
        const response = await api.put(`/facilitators/${documentId}`, payload);
        await this.fetchFacilitators();
        useGlobalStore().addSuccess('Facilitator updated successfully');
        return response.data.data;
      } catch (err) {
        console.error('Error updating facilitator:', err);
        const errorMsg = err.response?.data?.error?.message || err.message || 'Error updating facilitator';
        useGlobalStore().addError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        this.loading = false;
      }
    },
    async deleteFacilitator(documentId) {
        this.loading = true;
        try {
          await api.delete(`/facilitators/${documentId}`);
          await this.fetchFacilitators();
          useGlobalStore().addSuccess('Facilitator deleted successfully');
        } catch (err) {
          console.error('Error deleting facilitator:', err);
          const errorMsg = err.response?.data?.error?.message || err.message || 'Error deleting facilitator';
          useGlobalStore().addError(errorMsg);
          throw new Error(errorMsg);
        } finally {
          this.loading = false;
        }
    }
  }
});
