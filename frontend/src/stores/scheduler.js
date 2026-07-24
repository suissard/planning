import { defineStore } from 'pinia';
import api from '../services/api';

export const useSchedulerStore = defineStore('scheduler', {
  state: () => ({
    locations: [],
    activities: [],
    facilitators: [],
    participants: [],
    timeslots: [],
    loading: true,
    error: null,
    isConnected: false
  }),
  actions: {
    async fetchData() {
      this.loading = true;
      this.error = null;
      try {
        const [
          resLocations,
          resActivities,
          resFacilitators,
          resParticipants,
          resTimeSlots
        ] = await Promise.all([
          api.get('/locations?pagination[pageSize]=5000'),
          api.get('/activity-templates?populate=*&pagination[pageSize]=5000'),
          api.get('/facilitators?populate=*&pagination[pageSize]=5000'),
          api.get('/participants?populate=*&pagination[pageSize]=5000'),
          api.get('/time-slots?populate[location]=true&populate[activityTemplate]=true&populate[facilitators]=true&populate[participants]=true&pagination[pageSize]=5000')
        ]);

        this.locations = resLocations.data.data || [];
        this.activities = resActivities.data.data || [];
        this.facilitators = resFacilitators.data.data || [];
        this.participants = resParticipants.data.data || [];
        
        // Sort time slots chronologically
        const slots = resTimeSlots.data.data || [];
        this.timeslots = slots.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        this.isConnected = true;
      } catch (err) {
        console.error(err);
        this.isConnected = false;
        this.error = err.response?.data?.error?.message || err.message || 'Erreur réseau inconnue.';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async createSlot(form) {
      const payload = {
        data: {
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
          location: form.location,
          activityTemplate: form.activityTemplate,
          facilitators: form.facilitators,
          participants: form.participants
        }
      };

      try {
        const res = await api.post('/time-slots', payload);
        await this.fetchData();
        return res.data?.data;
      } catch (err) {
        console.error(err);
        const errMsg = err.response?.data?.error?.message || err.message || 'Erreur lors de la planification.';
        throw new Error(errMsg);
      }
    },

    async deleteSlot(documentId) {
      try {
        await api.delete(`/time-slots/${documentId}`);
        await this.fetchData();
      } catch (err) {
        console.error(err);
        const errMsg = err.response?.data?.error?.message || err.message || 'Erreur lors de la suppression.';
        throw new Error(errMsg);
      }
    }
  }
});
