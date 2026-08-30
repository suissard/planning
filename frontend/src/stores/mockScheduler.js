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

            const schActs = [
              {
                documentId: `sch_act_${i}_0`,
                id: `sch_act_${i}_0`,
                name: act ? act.name : "Animation & Convivialité",
                startDate: t.startDate,
                endDate: t.endDate,
                description: act?.description || "Atelier d'animation en salle",
                activityTemplate: act,
                facilitators: facs,
                location: loc
              }
            ];

            return {
                documentId: `slot_${i}`,
                id: `slot_${i}`,
                startDate: t.startDate,
                endDate: t.endDate,
                location: loc,
                activityTemplate: act, // legacy fallback if referenced
                scheduledActivities: schActs,
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
      const act = this.activities.find(a => a.documentId === form.activityTemplate) || form.activityTemplate;
      const loc = this.locations.find(l => l.documentId === form.location) || form.location;
      const facs = (form.facilitators || []).map(id => this.facilitators.find(f => f.documentId === id) || id);

      const schActs = form.scheduledActivities || [
        {
          documentId: `sch_act_${Date.now()}_0`,
          id: `sch_act_${Date.now()}_0`,
          name: act?.name || 'Animation en salle',
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
          description: act?.description || '',
          activityTemplate: act,
          facilitators: facs,
          location: loc
        }
      ];

      const newSlot = {
        documentId: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        id: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        location: loc,
        activityTemplate: act,
        scheduledActivities: schActs,
        facilitators: facs,
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

        const sDate = form.startDate ? new Date(form.startDate).toISOString() : this.timeslots[idx].startDate;
        const eDate = form.endDate ? new Date(form.endDate).toISOString() : this.timeslots[idx].endDate;

        let schActs = this.timeslots[idx].scheduledActivities || [];
        if (schActs.length > 0) {
          schActs = schActs.map(sa => ({
            ...sa,
            name: act ? act.name : sa.name,
            startDate: sDate,
            endDate: eDate,
            activityTemplate: act || sa.activityTemplate,
            facilitators: facs,
            location: loc
          }));
        } else if (act) {
          schActs = [{
            documentId: `sch_act_${Date.now()}_0`,
            id: `sch_act_${Date.now()}_0`,
            name: act.name,
            startDate: sDate,
            endDate: eDate,
            description: act.description || '',
            activityTemplate: act,
            facilitators: facs,
            location: loc
          }];
        }

        this.timeslots[idx] = {
          ...this.timeslots[idx],
          startDate: sDate,
          endDate: eDate,
          location: loc,
          activityTemplate: act,
          scheduledActivities: schActs,
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

    // SLOTS DRAG & DROP & PLANNING HELPERS
    async addParticipantToSlot(slotId, participantId) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const slot = this.timeslots.find(t => t.documentId === slotId || t.id === slotId);
      if (!slot) throw new Error('Créneau introuvable');
      const participant = this.participants.find(p => p.documentId === participantId || p.id === participantId);
      if (!participant) throw new Error('Participant introuvable');

      if (!slot.participants) slot.participants = [];
      const alreadyIn = slot.participants.some(p => (p.documentId || p.id) === (participant.documentId || participant.id));
      if (!alreadyIn) {
        slot.participants.push(participant);
        useGlobalStore().addSuccess(`${participant.firstName} ${participant.lastName} inscrit à l'animation !`, 'Inscription');
      }
      return slot;
    },

    async removeParticipantFromSlot(slotId, participantId) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const slot = this.timeslots.find(t => t.documentId === slotId || t.id === slotId);
      if (!slot) throw new Error('Créneau introuvable');
      if (slot.participants) {
        slot.participants = slot.participants.filter(p => (p.documentId || p.id) !== participantId);
        useGlobalStore().addSuccess('Participant désinscrit.', 'Désinscription');
      }
      return slot;
    },

    async moveParticipantBetweenSlots(fromSlotId, toSlotId, participantId) {
      await new Promise(resolve => setTimeout(resolve, 100));
      await this.removeParticipantFromSlot(fromSlotId, participantId);
      return await this.addParticipantToSlot(toSlotId, participantId);
    },

    async addFacilitatorToSlot(slotId, facilitatorId) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const slot = this.timeslots.find(t => t.documentId === slotId || t.id === slotId);
      if (!slot) throw new Error('Créneau introuvable');
      const facilitator = this.facilitators.find(f => f.documentId === facilitatorId || f.id === facilitatorId);
      if (!facilitator) throw new Error('Animateur introuvable');

      if (!slot.facilitators) slot.facilitators = [];
      const alreadyIn = slot.facilitators.some(f => (f.documentId || f.id) === (facilitator.documentId || facilitator.id));
      if (!alreadyIn) {
        slot.facilitators.push(facilitator);
        useGlobalStore().addSuccess(`${facilitator.firstName} ${facilitator.lastName} assigné à l'animation !`, 'Animateur assigné');
      }
      return slot;
    },

    async removeFacilitatorFromSlot(slotId, facilitatorId) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const slot = this.timeslots.find(t => t.documentId === slotId || t.id === slotId);
      if (!slot) throw new Error('Créneau introuvable');
      if (slot.facilitators) {
        slot.facilitators = slot.facilitators.filter(f => (f.documentId || f.id) !== facilitatorId);
        useGlobalStore().addSuccess('Animateur retiré.', 'Désaffectation');
      }
      return slot;
    },

    async setLocationForSlot(slotId, locationId) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const slot = this.timeslots.find(t => t.documentId === slotId || t.id === slotId);
      if (!slot) throw new Error('Créneau introuvable');
      if (!locationId) {
        slot.location = null;
        useGlobalStore().addSuccess('Salle retirée de l\'animation.', 'Lieu');
      } else {
        const loc = this.locations.find(l => l.documentId === locationId || l.id === locationId);
        slot.location = loc || null;
        if (loc) {
          useGlobalStore().addSuccess(`Salle ${loc.name} assignée !`, 'Lieu');
        }
      }
      return slot;
    },

    async createSlotForDate(activityId, dateStr, options = {}) {
      await new Promise(resolve => setTimeout(resolve, 150));
      const activity = this.activities.find(a => a.documentId === activityId || a.id === activityId);
      if (!activity) throw new Error('Activité introuvable');

      const durationMinutes = options.durationMinutes || activity.standardDuration || 60;
      const startTimeStr = options.startTime || '10:00';
      const [sh, sm] = startTimeStr.split(':').map(Number);
      
      const parts = dateStr.slice(0, 10).split('-');
      const start = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), sh, sm, 0);
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

      let loc = null;
      if (options.locationId) {
        loc = this.locations.find(l => l.documentId === options.locationId || l.id === options.locationId) || null;
      }
      
      let facs = [];
      if (Array.isArray(options.facilitatorIds) && options.facilitatorIds.length > 0) {
        facs = options.facilitatorIds.map(id => this.facilitators.find(f => f.documentId === id || f.id === id)).filter(Boolean);
      } else if (activity.authorizedFacilitators && activity.authorizedFacilitators.length > 0) {
        // Option to prefill first authorized facilitator if available
        const firstAuth = activity.authorizedFacilitators[0];
        const foundFac = this.facilitators.find(f => (f.documentId || f.id) === (firstAuth.documentId || firstAuth.id || firstAuth));
        if (foundFac) facs = [foundFac];
      }

      let partsList = [];
      if (Array.isArray(options.participantIds)) {
        partsList = options.participantIds.map(id => this.participants.find(p => p.documentId === id || p.id === id)).filter(Boolean);
      }

      const newSlot = {
        documentId: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        location: loc,
        activityTemplate: activity,
        facilitators: facs,
        participants: partsList
      };

      this.timeslots.push(newSlot);
      this.timeslots.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      useGlobalStore().addSuccess(`Animation "${activity.name}" ajoutée le ${parts[2]}/${parts[1]} !`, 'Animation créée');
      return newSlot;
    },

    async duplicateDaySlots(sourceDateStr, targetDateStrings = [], options = {}) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const sourceDate = sourceDateStr.slice(0, 10);
      const sourceSlots = this.timeslots.filter(t => t.startDate && t.startDate.slice(0, 10) === sourceDate);
      if (sourceSlots.length === 0) {
        useGlobalStore().addWarning('Aucune animation trouvée sur le jour source.', 'Duplication');
        return [];
      }

      const created = [];
      for (const targetDateStr of targetDateStrings) {
        const targetDate = targetDateStr.slice(0, 10);
        const [ty, tm, td] = targetDate.split('-').map(Number);

        for (const slot of sourceSlots) {
          const origStart = new Date(slot.startDate);
          const origEnd = new Date(slot.endDate);
          const duration = origEnd.getTime() - origStart.getTime();

          const newStart = new Date(ty, tm - 1, td, origStart.getHours(), origStart.getMinutes(), 0);
          const newEnd = new Date(newStart.getTime() + duration);

          const newSlot = {
            documentId: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            startDate: newStart.toISOString(),
            endDate: newEnd.toISOString(),
            location: slot.location ? { ...slot.location } : null,
            activityTemplate: slot.activityTemplate ? { ...slot.activityTemplate } : null,
            facilitators: options.includeFacilitators !== false && Array.isArray(slot.facilitators) ? [...slot.facilitators] : [],
            participants: options.includeParticipants !== false && Array.isArray(slot.participants) ? [...slot.participants] : []
          };
          this.timeslots.push(newSlot);
          created.push(newSlot);
        }
      }

      this.timeslots.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      useGlobalStore().addSuccess(`${created.length} animation(s) dupliquée(s) avec succès !`, 'Duplication réussie');
      return created;
    },

    async batchDeleteSlots(slotIds) {
      await new Promise(resolve => setTimeout(resolve, 150));
      const idsSet = new Set(slotIds);
      const count = this.timeslots.filter(t => idsSet.has(t.documentId) || idsSet.has(t.id)).length;
      this.timeslots = this.timeslots.filter(t => !idsSet.has(t.documentId) && !idsSet.has(t.id));
      useGlobalStore().addSuccess(`${count} animation(s) supprimée(s).`, 'Suppression');
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

