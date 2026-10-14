import { defineStore } from 'pinia';
import api from '../services/api';
import { useAppSettingsStore } from './appSettings';
import { useMockSchedulerStore } from './mockScheduler';
import { useActiveSchedulerStore } from './activeScheduler';
import { useRoomSessionStore } from './roomSessionStore';
import { useGlobalStore } from './global';

/**
 * Store dédié au parcours "Animatrice" :
 * - chargement des salles ouvertes (room-sessions) sur une période, sans écraser l'état partagé du roomSessionStore
 * - création / modification / suppression des animations (scheduled-activities) placées dans un créneau de salle (time-slot)
 * - création automatique d'un créneau de salle lorsque l'animation est placée dans une salle ouverte sans créneau existant
 *
 * Toutes les actions fonctionnent en mode API Strapi ET en mode "Fausses données" (mock).
 */

const idOf = (x) => (x && typeof x === 'object' ? (x.documentId || x.id) : x);

export const useFacilitatorWorkspaceStore = defineStore('facilitatorWorkspace', {
  state: () => ({
    saving: false,
    sessionsLoading: false
  }),

  actions: {
    /**
     * Charge les ouvertures de salles (room-sessions) entre deux dates (YYYY-MM-DD, inclusives).
     * Retourne un tableau local (n'altère pas roomSessionStore.sessions utilisé par la vue admin).
     */
    async fetchOpenRooms(startDate, endDate) {
      const appSettings = useAppSettingsStore();
      this.sessionsLoading = true;
      try {
        if (appSettings.useMockData) {
          const roomStore = useRoomSessionStore();
          const mock = useMockSchedulerStore();
          if (!mock.initialized) await mock.fetchData();
          roomStore.initMockSessions();
          return roomStore.mockSessions.filter(s => s.date >= startDate && s.date <= endDate);
        }
        const res = await api.get('/room-sessions', {
          params: {
            'filters[date][$gte]': startDate,
            'filters[date][$lte]': endDate,
            'populate[0]': 'location',
            'populate[1]': 'manager',
            'populate[2]': 'participants',
            'populate[3]': 'timeSlots',
            'pagination[pageSize]': 5000
          }
        });
        return res.data?.data || [];
      } catch (err) {
        console.error('Erreur chargement salles ouvertes:', err);
        return [];
      } finally {
        this.sessionsLoading = false;
      }
    },

    /**
     * Recherche la date (YYYY-MM-DD) de la prochaine salle ouverte à partir de `fromDate`.
     * Si aucune n'existe dans le futur, renvoie la plus récente dans le passé (utile en mode démo).
     */
    async findNearestOpenRoomDate(fromDate) {
      const appSettings = useAppSettingsStore();
      try {
        if (appSettings.useMockData) {
          const roomStore = useRoomSessionStore();
          const mock = useMockSchedulerStore();
          if (!mock.initialized) await mock.fetchData();
          roomStore.initMockSessions();
          const dates = roomStore.mockSessions.map(s => s.date).sort();
          return dates.find(d => d >= fromDate) || dates[dates.length - 1] || null;
        }
        const next = await api.get('/room-sessions', {
          params: { 'filters[date][$gte]': fromDate, sort: 'date:asc', 'pagination[pageSize]': 1, fields: ['date'] }
        });
        const nextDate = next.data?.data?.[0]?.date;
        if (nextDate) return nextDate;
        const prev = await api.get('/room-sessions', {
          params: { 'filters[date][$lt]': fromDate, sort: 'date:desc', 'pagination[pageSize]': 1, fields: ['date'] }
        });
        return prev.data?.data?.[0]?.date || null;
      } catch (err) {
        console.error(err);
        return null;
      }
    },

    /**
     * Relie le compte utilisateur connecté à une fiche animateur.
     */
    async linkUserToFacilitator(facilitatorId, userId) {
      const appSettings = useAppSettingsStore();
      localStorage.setItem('fwIdentityFacId', facilitatorId);
      if (appSettings.useMockData || !userId) return;
      try {
        await api.put(`/facilitators/${facilitatorId}`, { data: { user: userId } }, { skipGlobalNotification: true });
      } catch (err) {
        // Le lien local (localStorage) reste actif même si le serveur refuse
        console.warn('Impossible de relier le compte côté serveur:', err);
      }
    },

    /**
     * Crée ou met à jour une animation placée dans une salle ouverte.
     *
     * @param {Object} payload
     * @param {string} payload.name
     * @param {string} payload.description
     * @param {string} payload.startDate ISO
     * @param {string} payload.endDate ISO
     * @param {string|null} payload.activityTemplate documentId du modèle
     * @param {string[]} payload.facilitators documentIds des animateurs
     * @param {string} payload.location documentId de la salle
     * @param {string[]} payload.tags
     * @param {string|null} payload.timeSlotId créneau de salle existant couvrant l'animation (sinon création)
     * @param {Object|null} payload.newSlot { location, startDate, endDate, roomSession, participants[], facilitators[] }
     * @param {string|null} existingId documentId de l'animation si modification
     */
    async saveAnimation(payload, existingId = null) {
      const appSettings = useAppSettingsStore();
      this.saving = true;
      try {
        if (appSettings.useMockData) {
          return await this._saveAnimationMock(payload, existingId);
        }
        return await this._saveAnimationApi(payload, existingId);
      } finally {
        this.saving = false;
      }
    },

    async _saveAnimationApi(payload, existingId) {
      let timeSlotId = payload.timeSlotId;
      try {
        if (!timeSlotId && payload.newSlot) {
          const slotData = {
            startDate: payload.newSlot.startDate,
            endDate: payload.newSlot.endDate,
            location: payload.newSlot.location,
            participants: payload.newSlot.participants || [],
            facilitators: payload.newSlot.facilitators || []
          };
          if (payload.newSlot.roomSession) slotData.roomSession = payload.newSlot.roomSession;
          const slotRes = await api.post('/time-slots', { data: slotData }, { skipGlobalNotification: true });
          timeSlotId = slotRes.data?.data?.documentId || slotRes.data?.data?.id;
        }

        const data = {
          name: payload.name,
          description: payload.description || '',
          startDate: payload.startDate,
          endDate: payload.endDate,
          timeSlot: timeSlotId,
          activityTemplate: payload.activityTemplate || null,
          facilitators: payload.facilitators || [],
          location: payload.location || null,
          tags: payload.tags || []
        };

        let result;
        if (existingId) {
          result = await api.put(`/scheduled-activities/${existingId}`, { data }, { skipGlobalNotification: true });
          useGlobalStore().addSuccess(`« ${payload.name} » a été mise à jour.`, 'Animation modifiée');
        } else {
          result = await api.post('/scheduled-activities', { data }, { skipGlobalNotification: true });
          useGlobalStore().addSuccess(`« ${payload.name} » est placée dans la salle.`, 'Animation programmée');
        }

        await useActiveSchedulerStore().fetchData();
        return result.data?.data;
      } catch (err) {
        console.error(err);
        throw new Error(err.response?.data?.error?.message || err.message || 'Erreur lors de l\'enregistrement de l\'animation.');
      }
    },

    async _saveAnimationMock(payload, existingId) {
      const mock = useMockSchedulerStore();
      await new Promise(r => setTimeout(r, 150));

      let slot = payload.timeSlotId
        ? mock.timeslots.find(t => t.documentId === payload.timeSlotId || t.id === payload.timeSlotId)
        : null;

      if (!slot && payload.newSlot) {
        slot = await mock.createSlot({
          startDate: payload.newSlot.startDate,
          endDate: payload.newSlot.endDate,
          location: payload.newSlot.location,
          participants: payload.newSlot.participants || [],
          facilitators: payload.newSlot.facilitators || [],
          scheduledActivities: []
        }, true);
        slot = mock.timeslots.find(t => t.documentId === slot.documentId) || slot;
        slot.roomSession = payload.newSlot.roomSession ? { documentId: payload.newSlot.roomSession } : null;
        slot._createdForAnimation = true;
      }
      if (!slot) throw new Error('Créneau de salle introuvable.');

      const act = payload.activityTemplate ? mock.activities.find(a => a.documentId === payload.activityTemplate) || null : null;
      const loc = mock.locations.find(l => l.documentId === payload.location) || slot.location || null;
      const facs = (payload.facilitators || []).map(id => mock.facilitators.find(f => f.documentId === id)).filter(Boolean);

      const record = {
        documentId: existingId || `sch_act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        id: existingId || `sch_act_${Date.now()}`,
        name: payload.name,
        description: payload.description || '',
        startDate: payload.startDate,
        endDate: payload.endDate,
        activityTemplate: act,
        facilitators: facs,
        location: loc,
        tags: payload.tags || []
      };

      // Retire l'animation de son ancien créneau si elle change de créneau
      if (existingId) {
        mock.timeslots.forEach(t => {
          if ((t.scheduledActivities || []).some(s => s.documentId === existingId) && t.documentId !== slot.documentId) {
            t.scheduledActivities = t.scheduledActivities.filter(s => s.documentId !== existingId);
            if (t._createdForAnimation && t.scheduledActivities.length === 0) {
              mock.timeslots = mock.timeslots.filter(x => x.documentId !== t.documentId);
            }
          }
        });
      }

      const list = [...(slot.scheduledActivities || [])];
      const idx = list.findIndex(s => s.documentId === existingId);
      if (idx !== -1) list[idx] = record; else list.push(record);
      slot.scheduledActivities = list;
      if (!slot.activityTemplate && act) slot.activityTemplate = act;

      useGlobalStore().addSuccess(
        existingId ? `« ${payload.name} » a été mise à jour.` : `« ${payload.name} » est placée dans la salle.`,
        existingId ? 'Animation modifiée' : 'Animation programmée'
      );
      return record;
    },

    /**
     * Supprime une animation. Si le créneau de salle avait été créé uniquement pour elle
     * (même horaire, aucune autre animation, aucun pointage), le créneau est aussi supprimé.
     */
    async deleteAnimation(animation, parentSlot) {
      const appSettings = useAppSettingsStore();
      const animId = idOf(animation);
      this.saving = true;
      try {
        if (appSettings.useMockData) {
          const mock = useMockSchedulerStore();
          await new Promise(r => setTimeout(r, 120));
          const slot = mock.timeslots.find(t => t.documentId === idOf(parentSlot));
          if (slot) {
            slot.scheduledActivities = (slot.scheduledActivities || []).filter(s => s.documentId !== animId);
            if (slot._createdForAnimation && slot.scheduledActivities.length === 0) {
              mock.timeslots = mock.timeslots.filter(t => t.documentId !== slot.documentId);
            }
          }
          useGlobalStore().addSuccess(`« ${animation.name} » a été retirée du planning.`, 'Animation supprimée');
          return;
        }

        await api.delete(`/scheduled-activities/${animId}`, { skipGlobalNotification: true });

        if (parentSlot) {
          const others = (parentSlot.scheduledActivities || []).filter(s => idOf(s) !== animId);
          const sameRange = new Date(parentSlot.startDate).getTime() === new Date(animation.startDate).getTime()
            && new Date(parentSlot.endDate).getTime() === new Date(animation.endDate).getTime();
          const hasCheckIns = (parentSlot.checkIns || []).length > 0;
          if (others.length === 0 && sameRange && !hasCheckIns) {
            try {
              await api.delete(`/time-slots/${idOf(parentSlot)}`, { skipGlobalNotification: true });
            } catch (e) {
              console.warn('Créneau conservé :', e);
            }
          }
        }
        useGlobalStore().addSuccess(`« ${animation.name} » a été retirée du planning.`, 'Animation supprimée');
        await useActiveSchedulerStore().fetchData();
      } catch (err) {
        console.error(err);
        throw new Error(err.response?.data?.error?.message || err.message || 'Erreur lors de la suppression.');
      } finally {
        this.saving = false;
      }
    }
  }
});
