import { defineStore } from 'pinia';
import locationsData from '../../../data/locations.json';
import activitiesData from '../../../data/activity-templates.json';
import facilitatorsData from '../../../data/facilitators.json';
import participantsData from '../../../data/participants.json';
import timeSlotsData from '../../../data/time-slots.json';

export const useMockSchedulerStore = defineStore('mockScheduler', {
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
        await new Promise(resolve => setTimeout(resolve, 500));

        const deepCopy = (data) => JSON.parse(JSON.stringify(data));

        this.locations = deepCopy(locationsData).map((l, i) => ({ ...l, documentId: `loc_${i}` }));
        this.activities = deepCopy(activitiesData).map((a, i) => ({ ...a, documentId: `act_${i}` }));
        this.facilitators = deepCopy(facilitatorsData).map((f, i) => ({ ...f, documentId: `fac_${i}` }));
        this.participants = deepCopy(participantsData).map((p, i) => ({ ...p, documentId: `part_${i}` }));

        const slots = deepCopy(timeSlotsData).map((t, i) => {
            const loc = this.locations.find(l => l.name === t._location) || null;
            const act = this.activities.find(a => a.name === t._activity) || null;
            const facs = (t._facilitators || []).map(email => this.facilitators.find(f => f.email === email)).filter(Boolean);
            const parts = (t._participants || []).map(email => this.participants.find(p => p.email === email)).filter(Boolean);

            return {
                documentId: `slot_${i}`,
                startDate: t.startDate,
                endDate: t.endDate,
                location: loc,
                activityTemplate: act,
                facilitators: facs,
                participants: parts
            };
        });

        this.timeslots = slots.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        this.isConnected = true;
      } catch (err) {
        console.error(err);
        this.isConnected = false;
        this.error = 'Erreur locale';
      } finally {
        this.loading = false;
      }
    },

    async createSlot(form) {
      await new Promise(resolve => setTimeout(resolve, 300));

      const newSlot = {
        documentId: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        location: this.locations.find(l => l.documentId === form.location) || form.location,
        activityTemplate: this.activities.find(a => a.documentId === form.activityTemplate) || form.activityTemplate,
        facilitators: (form.facilitators || []).map(id => this.facilitators.find(f => f.documentId === id) || id),
        participants: (form.participants || []).map(id => this.participants.find(p => p.documentId === id) || id)
      };

      this.timeslots.push(newSlot);
      this.timeslots.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

      return newSlot;
    },

    async deleteSlot(documentId) {
      await new Promise(resolve => setTimeout(resolve, 300));
      this.timeslots = this.timeslots.filter(t => t.documentId !== documentId);
    }
  }
});
