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
          api.get('/facilitators?sort=lastName:asc,firstName:asc&populate=*&pagination[pageSize]=5000'),
          api.get('/participants?populate=*&pagination[pageSize]=5000'),
          api.get('/time-slots?populate[location]=true&populate[scheduledActivities][populate]=*&populate[facilitators]=true&populate[participants]=true&populate[checkIns]=true&pagination[pageSize]=5000')
        ]);

        this.locations = resLocations.data.data || [];
        this.activities = resActivities.data.data || [];
        this.facilitators = resFacilitators.data.data || [];
        this.participants = resParticipants.data.data || [];
        
        // Sort and normalize time slots chronologically
        const rawSlots = resTimeSlots.data.data || [];
        this.timeslots = rawSlots
          .map(slot => {
            const firstSchAct = (slot.scheduledActivities || [])[0];
            const fallbackTemplate = firstSchAct?.activityTemplate 
              || (firstSchAct ? { name: firstSchAct.name, tags: firstSchAct.tags, description: firstSchAct.description } : null) 
              || slot.activityTemplate 
              || null;

            return {
              ...slot,
              activityTemplate: fallbackTemplate
            };
          })
          .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

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
          facilitators: form.facilitators,
          participants: form.participants
        }
      };

      try {
        const res = await api.post('/time-slots', payload);
        const createdSlot = res.data?.data;

        // If activityTemplate is specified, create associated scheduled-activity
        if (createdSlot && form.activityTemplate) {
          const actTemplateId = typeof form.activityTemplate === 'object' 
            ? (form.activityTemplate.documentId || form.activityTemplate.id) 
            : form.activityTemplate;
          const actObj = this.activities.find(a => (a.documentId || a.id) === actTemplateId);
          const actName = actObj?.name || 'Animation programmée';

          try {
            await api.post('/scheduled-activities', {
              data: {
                name: actName,
                startDate: createdSlot.startDate,
                endDate: createdSlot.endDate,
                timeSlot: createdSlot.documentId || createdSlot.id,
                activityTemplate: actTemplateId || null,
                location: form.location || null,
                facilitators: form.facilitators || []
              }
            });
          } catch (actErr) {
            console.warn('Could not auto-create scheduled-activity:', actErr);
          }
        }

        await this.fetchData();
        return createdSlot;
      } catch (err) {
        console.error(err);
        const errMsg = err.response?.data?.error?.message || err.message || 'Erreur lors de la planification.';
        throw new Error(errMsg);
      }
    },

    async updateSlot(documentId, form) {
      const payload = {
        data: {}
      };
      if (form.startDate) payload.data.startDate = new Date(form.startDate).toISOString();
      if (form.endDate) payload.data.endDate = new Date(form.endDate).toISOString();
      if (form.location !== undefined) payload.data.location = form.location;
      if (form.facilitators !== undefined) payload.data.facilitators = form.facilitators;
      if (form.participants !== undefined) payload.data.participants = form.participants;

      const currentSlot = this.timeslots.find(t => t.documentId === documentId || t.id === documentId);

      try {
        const res = await api.put(`/time-slots/${documentId}`, payload);
        const updatedSlot = res.data?.data;

        // Synchronize or update scheduled activity
        if (form.activityTemplate !== undefined || payload.data.startDate || payload.data.endDate || payload.data.location !== undefined || payload.data.facilitators !== undefined) {
          const actTemplateId = form.activityTemplate !== undefined
            ? (typeof form.activityTemplate === 'object' ? (form.activityTemplate?.documentId || form.activityTemplate?.id) : form.activityTemplate)
            : (currentSlot?.scheduledActivities?.[0]?.activityTemplate?.documentId || currentSlot?.scheduledActivities?.[0]?.activityTemplate?.id);
          
          const actObj = actTemplateId ? this.activities.find(a => (a.documentId || a.id) === actTemplateId) : null;
          const actName = actObj?.name || currentSlot?.scheduledActivities?.[0]?.name || 'Animation programmée';

          const existingSchActs = currentSlot?.scheduledActivities || [];
          if (existingSchActs.length > 0) {
            const firstSchAct = existingSchActs[0];
            const schDocId = firstSchAct.documentId || firstSchAct.id;
            try {
              await api.put(`/scheduled-activities/${schDocId}`, {
                data: {
                  name: actName,
                  startDate: payload.data.startDate || currentSlot.startDate,
                  endDate: payload.data.endDate || currentSlot.endDate,
                  activityTemplate: actTemplateId || null,
                  location: payload.data.location !== undefined ? payload.data.location : (currentSlot.location?.documentId || currentSlot.location?.id || null),
                  facilitators: payload.data.facilitators !== undefined ? payload.data.facilitators : (currentSlot.facilitators || []).map(f => f.documentId || f.id)
                }
              });
            } catch (schErr) {
              console.warn('Could not update scheduled-activity:', schErr);
            }
          } else if (actTemplateId) {
            try {
              await api.post('/scheduled-activities', {
                data: {
                  name: actName,
                  startDate: payload.data.startDate || currentSlot?.startDate || new Date().toISOString(),
                  endDate: payload.data.endDate || currentSlot?.endDate || new Date().toISOString(),
                  timeSlot: documentId,
                  activityTemplate: actTemplateId,
                  location: payload.data.location !== undefined ? payload.data.location : (currentSlot?.location?.documentId || currentSlot?.location?.id || null),
                  facilitators: payload.data.facilitators !== undefined ? payload.data.facilitators : (currentSlot?.facilitators || []).map(f => f.documentId || f.id)
                }
              });
            } catch (schErr) {
              console.warn('Could not create scheduled-activity on updateSlot:', schErr);
            }
          }
        }

        await this.fetchData();
        return updatedSlot;
      } catch (err) {
        console.error(err);
        const errMsg = err.response?.data?.error?.message || err.message || 'Erreur lors de la modification.';
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
    },

    async addParticipantToSlot(slotId, participantId) {
      const slot = this.timeslots.find(t => t.documentId === slotId || t.id === slotId);
      if (!slot) throw new Error('Créneau introuvable');
      const currentPartIds = (slot.participants || []).map(p => p.documentId || p.id);
      if (!currentPartIds.includes(participantId)) {
        currentPartIds.push(participantId);
        return await this.updateSlot(slot.documentId || slot.id, { participants: currentPartIds });
      }
      return slot;
    },

    async removeParticipantFromSlot(slotId, participantId) {
      const slot = this.timeslots.find(t => t.documentId === slotId || t.id === slotId);
      if (!slot) throw new Error('Créneau introuvable');
      const currentPartIds = (slot.participants || [])
        .map(p => p.documentId || p.id)
        .filter(id => id !== participantId);
      return await this.updateSlot(slot.documentId || slot.id, { participants: currentPartIds });
    },

    async moveParticipantBetweenSlots(fromSlotId, toSlotId, participantId) {
      await this.removeParticipantFromSlot(fromSlotId, participantId);
      return await this.addParticipantToSlot(toSlotId, participantId);
    },

    async addFacilitatorToSlot(slotId, facilitatorId) {
      const slot = this.timeslots.find(t => t.documentId === slotId || t.id === slotId);
      if (!slot) throw new Error('Créneau introuvable');
      const currentFacIds = (slot.facilitators || []).map(f => f.documentId || f.id);
      if (!currentFacIds.includes(facilitatorId)) {
        currentFacIds.push(facilitatorId);
        return await this.updateSlot(slot.documentId || slot.id, { facilitators: currentFacIds });
      }
      return slot;
    },

    async removeFacilitatorFromSlot(slotId, facilitatorId) {
      const slot = this.timeslots.find(t => t.documentId === slotId || t.id === slotId);
      if (!slot) throw new Error('Créneau introuvable');
      const currentFacIds = (slot.facilitators || [])
        .map(f => f.documentId || f.id)
        .filter(id => id !== facilitatorId);
      return await this.updateSlot(slot.documentId || slot.id, { facilitators: currentFacIds });
    },

    async setLocationForSlot(slotId, locationId) {
      const slot = this.timeslots.find(t => t.documentId === slotId || t.id === slotId);
      if (!slot) throw new Error('Créneau introuvable');
      return await this.updateSlot(slot.documentId || slot.id, { location: locationId || null });
    },

    async createSlotForDate(activityId, dateStr, options = {}) {
      const activity = this.activities.find(a => a.documentId === activityId || a.id === activityId);
      if (!activity) throw new Error('Activité introuvable');

      const durationMinutes = options.durationMinutes || activity.standardDuration || 60;
      const startTimeStr = options.startTime || '10:00';
      const [sh, sm] = startTimeStr.split(':').map(Number);
      
      const parts = dateStr.slice(0, 10).split('-');
      const start = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), sh, sm, 0);
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

      let facs = options.facilitatorIds || [];
      if (facs.length === 0 && activity.authorizedFacilitators && activity.authorizedFacilitators.length > 0) {
        facs = [activity.authorizedFacilitators[0].documentId || activity.authorizedFacilitators[0].id || activity.authorizedFacilitators[0]];
      }

      return await this.createSlot({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        location: options.locationId || null,
        activityTemplate: activity.documentId || activity.id,
        facilitators: facs,
        participants: options.participantIds || []
      });
    },

    async duplicateDaySlots(sourceDateStr, targetDateStrings = [], options = {}) {
      const sourceDate = sourceDateStr.slice(0, 10);
      const sourceSlots = this.timeslots.filter(t => t.startDate && t.startDate.slice(0, 10) === sourceDate);
      if (sourceSlots.length === 0) return [];

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

          const res = await this.createSlot({
            startDate: newStart.toISOString(),
            endDate: newEnd.toISOString(),
            location: slot.location?.documentId || slot.location?.id || null,
            activityTemplate: slot.activityTemplate?.documentId || slot.activityTemplate?.id || null,
            facilitators: options.includeFacilitators !== false ? (slot.facilitators || []).map(f => f.documentId || f.id) : [],
            participants: options.includeParticipants !== false ? (slot.participants || []).map(p => p.documentId || p.id) : []
          });
          created.push(res);
        }
      }
      return created;
    },

    async batchDeleteSlots(slotIds) {
      for (const id of slotIds) {
        try {
          await api.delete(`/time-slots/${id}`);
        } catch (e) {
          console.error(e);
        }
      }
      await this.fetchData();
    }
  }
});
