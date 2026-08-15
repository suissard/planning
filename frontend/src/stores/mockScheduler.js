import { defineStore } from 'pinia';
import { useGlobalStore } from './global';
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
    isConnected: false,
    initialized: false
  }),
  actions: {
    async fetchData(force = false) {
      if (this.initialized && !force) {
        return;
      }
      this.loading = true;
      this.error = null;
      try {
        await new Promise(resolve => setTimeout(resolve, 300));

        const deepCopy = (data) => JSON.parse(JSON.stringify(data));

        this.locations = deepCopy(locationsData).map((l, i) => ({ ...l, documentId: `loc_${i}` }));
        this.activities = deepCopy(activitiesData).map((a, i) => ({ ...a, documentId: `act_${i}` }));
        this.facilitators = deepCopy(facilitatorsData)
          .map((f, i) => ({ ...f, documentId: `fac_${i}` }))
          .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '', 'fr', { sensitivity: 'base' }) || (a.firstName || '').localeCompare(b.firstName || '', 'fr', { sensitivity: 'base' }));
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
        this.initialized = true;
      } catch (err) {
        console.error(err);
        this.isConnected = false;
        this.error = 'Erreur locale';
        useGlobalStore().addError('Erreur lors du chargement des données locales.', 'Erreur Mock');
      } finally {
        this.loading = false;
      }
    },

    // SLOTS
    async createSlot(form) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const newSlot = {
        documentId: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        location: this.locations.find(l => l.documentId === form.location) || form.location,
        activityTemplate: this.activities.find(a => a.documentId === form.activityTemplate) || form.activityTemplate,
        facilitators: (form.facilitators || []).map(id => this.facilitators.find(f => f.documentId === id) || id),
        participants: (form.participants || []).map(id => this.participants.find(p => p.documentId === id) || id)
      };

      this.timeslots.push(newSlot);
      this.timeslots.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      useGlobalStore().addSuccess('Créneau horaire planifié avec succès !', 'Créneau planifié');
      return newSlot;
    },

    async updateSlot(documentId, form) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const idx = this.timeslots.findIndex(t => t.documentId === documentId || t.id === documentId);
      if (idx !== -1) {
        const loc = form.location ? (this.locations.find(l => l.documentId === form.location || l.id === form.location) || form.location) : this.timeslots[idx].location;
        const act = form.activityTemplate ? (this.activities.find(a => a.documentId === form.activityTemplate || a.id === form.activityTemplate) || form.activityTemplate) : this.timeslots[idx].activityTemplate;
        const facs = form.facilitators ? form.facilitators.map(id => this.facilitators.find(f => f.documentId === id || f.id === id) || id) : this.timeslots[idx].facilitators;
        const parts = form.participants ? form.participants.map(id => this.participants.find(p => p.documentId === id || p.id === id) || id) : this.timeslots[idx].participants;

        this.timeslots[idx] = {
          ...this.timeslots[idx],
          startDate: form.startDate ? new Date(form.startDate).toISOString() : this.timeslots[idx].startDate,
          endDate: form.endDate ? new Date(form.endDate).toISOString() : this.timeslots[idx].endDate,
          location: loc,
          activityTemplate: act,
          facilitators: facs,
          participants: parts
        };
        this.timeslots.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        useGlobalStore().addSuccess('Créneau horaire modifié avec succès !', 'Créneau modifié');
        return this.timeslots[idx];
      }
      throw new Error('Créneau introuvable');
    },

    async deleteSlot(documentId) {
      await new Promise(resolve => setTimeout(resolve, 200));
      this.timeslots = this.timeslots.filter(t => t.documentId !== documentId && t.id !== documentId);
      useGlobalStore().addSuccess('Créneau horaire supprimé avec succès !', 'Créneau supprimé');
    },

    // ACTIVITIES
    async createActivity(activityData) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const authedFacs = (activityData.authorizedFacilitators || []).map(id => 
        this.facilitators.find(f => f.documentId === id || f.id === id) || { documentId: id }
      );
      const newActivity = {
        documentId: `act_${Date.now()}`,
        name: activityData.name,
        standardDuration: parseInt(activityData.standardDuration) || 60,
        minParticipants: parseInt(activityData.minParticipants) || 0,
        maxParticipants: parseInt(activityData.maxParticipants) || 10,
        authorizedFacilitators: authedFacs,
        tags: Array.isArray(activityData.tags) ? [...activityData.tags] : []
      };
      this.activities.unshift(newActivity);
      useGlobalStore().addSuccess(`Activité "${newActivity.name}" créée avec succès !`, 'Activité créée');
      return newActivity;
    },

    async updateActivity(documentId, activityData) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const index = this.activities.findIndex(a => a.documentId === documentId);
      if (index !== -1) {
        const authedFacs = (activityData.authorizedFacilitators || []).map(id => 
          this.facilitators.find(f => f.documentId === id || f.id === id) || { documentId: id }
        );
        this.activities[index] = {
          ...this.activities[index],
          name: activityData.name,
          standardDuration: parseInt(activityData.standardDuration) || 60,
          minParticipants: parseInt(activityData.minParticipants) || 0,
          maxParticipants: parseInt(activityData.maxParticipants) || 10,
          authorizedFacilitators: authedFacs,
          tags: Array.isArray(activityData.tags) ? [...activityData.tags] : []
        };
        useGlobalStore().addSuccess(`Activité "${this.activities[index].name}" mise à jour avec succès !`, 'Activité modifiée');
        return this.activities[index];
      }
      useGlobalStore().addError('Activité introuvable pour la modification.', 'Erreur', 404);
      throw new Error('Activité introuvable');
    },

    async deleteActivity(documentId) {
      await new Promise(resolve => setTimeout(resolve, 200));
      this.activities = this.activities.filter(a => a.documentId !== documentId);
      useGlobalStore().addSuccess('Activité supprimée avec succès !', 'Activité supprimée');
    },

    // FACILITATORS
    async createFacilitator(facilitatorData) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const newFac = {
        documentId: `fac_${Date.now()}`,
        firstName: facilitatorData.firstName,
        lastName: facilitatorData.lastName,
        email: facilitatorData.email,
        skills: facilitatorData.skills || '',
        weeklyAvailabilities: facilitatorData.weeklyAvailabilities || {},
        specificUnavailabilities: facilitatorData.specificUnavailabilities || []
      };
      this.facilitators.push(newFac);
      this.facilitators.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '', 'fr', { sensitivity: 'base' }) || (a.firstName || '').localeCompare(b.firstName || '', 'fr', { sensitivity: 'base' }));
      useGlobalStore().addSuccess(`Animateur ${newFac.firstName} ${newFac.lastName} créé avec succès !`, 'Animateur créé');
      return newFac;
    },

    async updateFacilitator(documentId, facilitatorData) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const index = this.facilitators.findIndex(f => f.documentId === documentId);
      if (index !== -1) {
        this.facilitators[index] = {
          ...this.facilitators[index],
          firstName: facilitatorData.firstName,
          lastName: facilitatorData.lastName,
          email: facilitatorData.email,
          skills: facilitatorData.skills || '',
          weeklyAvailabilities: facilitatorData.weeklyAvailabilities || {},
          specificUnavailabilities: facilitatorData.specificUnavailabilities || []
        };
        this.facilitators.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '', 'fr', { sensitivity: 'base' }) || (a.firstName || '').localeCompare(b.firstName || '', 'fr', { sensitivity: 'base' }));
        useGlobalStore().addSuccess(`Animateur ${this.facilitators[index].firstName} ${this.facilitators[index].lastName} mis à jour avec succès !`, 'Animateur modifié');
        return this.facilitators[index];
      }
      useGlobalStore().addError('Animateur introuvable pour la modification.', 'Erreur', 404);
      throw new Error('Animateur introuvable');
    },

    async deleteFacilitator(documentId) {
      await new Promise(resolve => setTimeout(resolve, 200));
      this.facilitators = this.facilitators.filter(f => f.documentId !== documentId);
      useGlobalStore().addSuccess('Animateur supprimé avec succès !', 'Animateur supprimé');
    },

    // PARTICIPANTS
    async createParticipant(participantData) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const newPart = {
        documentId: `part_${Date.now()}`,
        firstName: participantData.firstName,
        lastName: participantData.lastName,
        email: participantData.email,
        weeklyAvailabilities: participantData.weeklyAvailabilities || {},
        specificUnavailabilities: participantData.specificUnavailabilities || []
      };
      this.participants.unshift(newPart);
      useGlobalStore().addSuccess(`Participant ${newPart.firstName} ${newPart.lastName} créé avec succès !`, 'Participant créé');
      return newPart;
    },

    async updateParticipant(documentId, participantData) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const index = this.participants.findIndex(p => p.documentId === documentId);
      if (index !== -1) {
        this.participants[index] = {
          ...this.participants[index],
          firstName: participantData.firstName,
          lastName: participantData.lastName,
          email: participantData.email,
          weeklyAvailabilities: participantData.weeklyAvailabilities || {},
          specificUnavailabilities: participantData.specificUnavailabilities || []
        };
        useGlobalStore().addSuccess(`Participant ${this.participants[index].firstName} ${this.participants[index].lastName} mis à jour avec succès !`, 'Participant modifié');
        return this.participants[index];
      }
      useGlobalStore().addError('Participant introuvable pour la modification.', 'Erreur', 404);
      throw new Error('Participant introuvable');
    },

    async deleteParticipant(documentId) {
      await new Promise(resolve => setTimeout(resolve, 200));
      this.participants = this.participants.filter(p => p.documentId !== documentId);
      useGlobalStore().addSuccess('Participant supprimé avec succès !', 'Participant supprimé');
    },

    // LOCATIONS
    async createLocation(locationData) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const newLoc = {
        documentId: `loc_${Date.now()}`,
        name: locationData.name,
        address: locationData.address || '',
        capacity: locationData.capacity || 1,
        globalOpeningStart: locationData.globalOpeningStart || '08:00:00.000',
        globalOpeningEnd: locationData.globalOpeningEnd || '18:00:00.000',
        weeklyClosures: locationData.weeklyClosures || [],
        specificClosures: locationData.specificClosures || []
      };
      this.locations.unshift(newLoc);
      useGlobalStore().addSuccess(`Lieu "${newLoc.name}" créé avec succès !`, 'Lieu créé');
      return newLoc;
    },

    async updateLocation(documentId, locationData) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const index = this.locations.findIndex(l => l.documentId === documentId);
      if (index !== -1) {
        this.locations[index] = {
          ...this.locations[index],
          name: locationData.name,
          address: locationData.address || '',
          capacity: locationData.capacity || 1,
          globalOpeningStart: locationData.globalOpeningStart || '08:00:00.000',
          globalOpeningEnd: locationData.globalOpeningEnd || '18:00:00.000',
          weeklyClosures: locationData.weeklyClosures || [],
          specificClosures: locationData.specificClosures || []
        };
        useGlobalStore().addSuccess(`Lieu "${this.locations[index].name}" mis à jour avec succès !`, 'Lieu modifié');
        return this.locations[index];
      }
      useGlobalStore().addError('Lieu introuvable pour la modification.', 'Erreur', 404);
      throw new Error('Lieu introuvable');
    },

    async deleteLocation(documentId) {
      await new Promise(resolve => setTimeout(resolve, 200));
      this.locations = this.locations.filter(l => l.documentId !== documentId);
      useGlobalStore().addSuccess('Lieu supprimé avec succès !', 'Lieu supprimé');
    }
  }
});

