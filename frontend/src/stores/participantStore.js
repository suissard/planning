import { defineStore } from 'pinia';
import api from '../services/api';
import { useAppSettingsStore } from './appSettings';
import { useMockSchedulerStore } from './mockScheduler';
import { useActiveSchedulerStore } from './activeScheduler';

export const useParticipantStore = defineStore('participant', {
  state: () => ({
    participants: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchParticipants() {
      const appSettings = useAppSettingsStore();
      if (appSettings.useMockData) {
        const mockStore = useMockSchedulerStore();
        await mockStore.fetchData();
        this.participants = mockStore.participants;
        return this.participants;
      }

      this.loading = true;
      this.error = null;
      try {
        const response = await api.get('/participants?populate=*&pagination[pageSize]=5000');
        this.participants = response.data.data || [];
        return this.participants;
      } catch (err) {
        console.error('Error fetching participants:', err);
        this.error = err.response?.data?.error?.message || err.message || 'Erreur lors du chargement des participants';
      } finally {
        this.loading = false;
      }
    },

    async createParticipant(participantData) {
      const appSettings = useAppSettingsStore();
      if (appSettings.useMockData) {
        const mockStore = useMockSchedulerStore();
        const created = await mockStore.createParticipant(participantData);
        this.participants = mockStore.participants;
        return created;
      }

      this.loading = true;
      try {
        const payload = {
          data: {
            firstName: participantData.firstName,
            lastName: participantData.lastName,
            email: participantData.email,
            weeklyAvailabilities: participantData.weeklyAvailabilities || {},
            specificUnavailabilities: participantData.specificUnavailabilities || []
          }
        };
        const response = await api.post('/participants', payload);
        
        // Refresh active scheduler data
        const schedulerStore = useActiveSchedulerStore();
        await schedulerStore.fetchData();

        return response.data.data;
      } catch (err) {
        console.error('Error creating participant:', err);
        const errorMsg = err.response?.data?.error?.message || err.message || 'Erreur lors de la création du participant';
        throw new Error(errorMsg);
      } finally {
        this.loading = false;
      }
    },

    async updateParticipant(documentId, participantData) {
      const appSettings = useAppSettingsStore();
      if (appSettings.useMockData) {
        const mockStore = useMockSchedulerStore();
        const updated = await mockStore.updateParticipant(documentId, participantData);
        this.participants = mockStore.participants;
        return updated;
      }

      this.loading = true;
      try {
        const payload = {
          data: {
            firstName: participantData.firstName,
            lastName: participantData.lastName,
            email: participantData.email,
            weeklyAvailabilities: participantData.weeklyAvailabilities || {},
            specificUnavailabilities: participantData.specificUnavailabilities || []
          }
        };
        const response = await api.put(`/participants/${documentId}`, payload);
        
        // Refresh active scheduler data
        const schedulerStore = useActiveSchedulerStore();
        await schedulerStore.fetchData();

        return response.data.data;
      } catch (err) {
        console.error('Error updating participant:', err);
        const errorMsg = err.response?.data?.error?.message || err.message || 'Erreur lors de la mise à jour du participant';
        throw new Error(errorMsg);
      } finally {
        this.loading = false;
      }
    },

    async deleteParticipant(documentId) {
      const appSettings = useAppSettingsStore();
      if (appSettings.useMockData) {
        const mockStore = useMockSchedulerStore();
        await mockStore.deleteParticipant(documentId);
        this.participants = mockStore.participants;
        return;
      }

      this.loading = true;
      try {
        await api.delete(`/participants/${documentId}`);
        
        // Refresh active scheduler data
        const schedulerStore = useActiveSchedulerStore();
        await schedulerStore.fetchData();
      } catch (err) {
        console.error('Error deleting participant:', err);
        const errorMsg = err.response?.data?.error?.message || err.message || 'Erreur lors de la suppression du participant';
        throw new Error(errorMsg);
      } finally {
        this.loading = false;
      }
    }
  }
});
