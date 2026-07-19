import { defineStore } from 'pinia';
import api from '../services/api';
import { useActiveSchedulerStore } from './activeScheduler';

export const useActivityStore = defineStore('activity', {
  actions: {
    async createActivity(activityData) {
      try {
        const payload = {
          data: {
            name: activityData.name,
            standardDuration: parseInt(activityData.standardDuration),
            minParticipants: parseInt(activityData.minParticipants),
            maxParticipants: parseInt(activityData.maxParticipants),
            authorizedFacilitators: activityData.authorizedFacilitators
          }
        };
        const res = await api.post('/activity-templates', payload);

        // Refresh the global data to update the lists
        const schedulerStore = useActiveSchedulerStore();
        await schedulerStore.fetchData();

        return res.data?.data;
      } catch (err) {
        console.error(err);
        const errMsg = err.response?.data?.error?.message || err.message || 'Erreur lors de la création de l\'activité.';
        throw new Error(errMsg);
      }
    },

    async updateActivity(documentId, activityData) {
      try {
        const payload = {
          data: {
            name: activityData.name,
            standardDuration: parseInt(activityData.standardDuration),
            minParticipants: parseInt(activityData.minParticipants),
            maxParticipants: parseInt(activityData.maxParticipants),
            authorizedFacilitators: activityData.authorizedFacilitators
          }
        };
        const res = await api.put(`/activity-templates/${documentId}`, payload);

        // Refresh the global data
        const schedulerStore = useActiveSchedulerStore();
        await schedulerStore.fetchData();

        return res.data?.data;
      } catch (err) {
        console.error(err);
        const errMsg = err.response?.data?.error?.message || err.message || 'Erreur lors de la modification de l\'activité.';
        throw new Error(errMsg);
      }
    },

    async deleteActivity(documentId) {
      try {
        await api.delete(`/activity-templates/${documentId}`);

        // Refresh the global data
        const schedulerStore = useActiveSchedulerStore();
        await schedulerStore.fetchData();
      } catch (err) {
        console.error(err);
        const errMsg = err.response?.data?.error?.message || err.message || 'Erreur lors de la suppression de l\'activité.';
        throw new Error(errMsg);
      }
    }
  }
});
