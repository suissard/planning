import { defineStore } from 'pinia';
import api from '../services/api';
import { useAppSettingsStore } from './appSettings';
import { useMockSchedulerStore } from './mockScheduler';
import { useGlobalStore } from './global';
import { useRoomSessionTemplateStore } from './roomSessionTemplateStore';
import roomSessionsData from '../../../data/room-sessions.json';

export const useRoomSessionStore = defineStore('roomSession', {
  state: () => ({
    sessions: [],
    mockSessions: [],
    mockInitialized: false,
    loading: false,
    error: null,
    selectedDate: new Date().toISOString().slice(0, 10),
    currentViewMode: 'day', // 'day' | 'week' | 'month'
    viewRange: {
      startDate: null,
      endDate: null
    }
  }),

  getters: {
    // Sessions grouped by date
    sessionsByDate: (state) => {
      const map = {};
      state.sessions.forEach(s => {
        if (!s.date) return;
        if (!map[s.date]) map[s.date] = [];
        map[s.date].push(s);
      });
      return map;
    },

    // Get sessions for a specific date from cache
    getSessionsForDate: (state) => (dateStr) => {
      return state.sessions.filter(s => s.date === dateStr);
    }
  },

  actions: {
    initMockSessions() {
      if (this.mockInitialized) return;
      const mockScheduler = useMockSchedulerStore();
      
      const deepCopy = (d) => JSON.parse(JSON.stringify(d));
      this.mockSessions = deepCopy(roomSessionsData).map((s, i) => {
        const loc = mockScheduler.locations.find(l => l.name === s._location) || null;
        const mgr = mockScheduler.facilitators.find(f => f.email === s._manager) || null;
        const parts = (s._participants || []).map(email => mockScheduler.participants.find(p => p.email === email)).filter(Boolean);

        return {
          documentId: `room_sess_${i}`,
          id: `room_sess_${i}`,
          date: s.date,
          location: loc,
          manager: mgr,
          participants: parts,
          timeSlots: []
        };
      });
      this.mockInitialized = true;
    },

    async fetchSessions(date) {
      this.loading = true;
      this.error = null;
      const queryDate = date || this.selectedDate;
      this.selectedDate = queryDate;

      const appSettings = useAppSettingsStore();
      if (appSettings.useMockData) {
        this.initMockSessions();
        this.sessions = this.mockSessions.filter(s => s.date === queryDate);
        this.loading = false;
        return;
      }

      try {
        const res = await api.get('/room-sessions', {
          params: {
            'filters[date][$eq]': queryDate,
            'populate[0]': 'location',
            'populate[1]': 'manager',
            'populate[2]': 'participants',
            'populate[3]': 'timeSlots',
            'pagination[pageSize]': 1000
          }
        });
        this.sessions = res.data.data || [];
      } catch (err) {
        this.error = err.message || 'Erreur lors du chargement des sessions de salle';
        console.error(err);
      } finally {
        this.loading = false;
      }
    },

    async fetchSessionsForRange(startDate, endDate) {
      this.loading = true;
      this.error = null;
      this.viewRange = { startDate, endDate };

      const appSettings = useAppSettingsStore();
      if (appSettings.useMockData) {
        this.initMockSessions();
        this.sessions = this.mockSessions.filter(s => s.date >= startDate && s.date <= endDate);
        this.loading = false;
        return;
      }

      try {
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
        this.sessions = res.data.data || [];
      } catch (err) {
        this.error = err.message || 'Erreur lors du chargement des sessions de salle pour la période';
        console.error(err);
      } finally {
        this.loading = false;
      }
    },

    async fetchAllSessions() {
      this.loading = true;
      this.error = null;

      const appSettings = useAppSettingsStore();
      if (appSettings.useMockData) {
        this.initMockSessions();
        this.sessions = [...this.mockSessions];
        this.loading = false;
        return;
      }

      try {
        const res = await api.get('/room-sessions', {
          params: {
            'populate[0]': 'location',
            'populate[1]': 'manager',
            'populate[2]': 'participants',
            'populate[3]': 'timeSlots',
            'pagination[pageSize]': 5000
          }
        });
        this.sessions = res.data.data || [];
      } catch (err) {
        this.error = err.message || 'Erreur lors du chargement des sessions de salle';
        console.error(err);
      } finally {
        this.loading = false;
      }
    },

    async createSession(sessionData, silent = false) {
      const appSettings = useAppSettingsStore();
      if (appSettings.useMockData) {
        this.initMockSessions();
        const mockScheduler = useMockSchedulerStore();
        const loc = mockScheduler.locations.find(l => (l.documentId === sessionData.location || l.id === sessionData.location)) || null;
        const mgr = mockScheduler.facilitators.find(f => (f.documentId === sessionData.manager || f.id === sessionData.manager)) || null;
        const parts = (sessionData.participants || []).map(pid => mockScheduler.participants.find(p => p.documentId === pid || p.id === pid)).filter(Boolean);

        const newSession = {
          documentId: `room_sess_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          id: `room_sess_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          date: sessionData.date,
          location: loc,
          manager: mgr,
          participants: parts,
          timeSlots: []
        };

        this.mockSessions.push(newSession);
        this.refreshCurrentView();
        if (!silent) useGlobalStore().addSuccess('Session de salle créée avec succès !', 'Ouverture créée');
        return { data: newSession };
      }

      try {
        const payload = {
          date: sessionData.date,
          participants: (sessionData.participants || []).filter(Boolean)
        };
        if (sessionData.location) payload.location = sessionData.location;
        if (sessionData.manager) payload.manager = sessionData.manager;

        const res = await api.post('/room-sessions', { data: payload });
        this.refreshCurrentView();
        if (!silent) useGlobalStore().addSuccess('Session de salle créée avec succès !', 'Ouverture créée');
        return res.data;
      } catch (err) {
        throw new Error(err.response?.data?.error?.message || err.message);
      }
    },

    async updateSession(documentId, sessionData, silent = false) {
      const appSettings = useAppSettingsStore();
      if (appSettings.useMockData) {
        this.initMockSessions();
        const mockScheduler = useMockSchedulerStore();
        const idx = this.mockSessions.findIndex(s => s.documentId === documentId || s.id === documentId);
        if (idx !== -1) {
          const loc = sessionData.location ? (mockScheduler.locations.find(l => l.documentId === sessionData.location || l.id === sessionData.location) || this.mockSessions[idx].location) : this.mockSessions[idx].location;
          const mgr = sessionData.manager ? (mockScheduler.facilitators.find(f => f.documentId === sessionData.manager || f.id === sessionData.manager) || this.mockSessions[idx].manager) : this.mockSessions[idx].manager;
          const parts = sessionData.participants ? (sessionData.participants.map(pid => mockScheduler.participants.find(p => p.documentId === pid || p.id === pid)).filter(Boolean)) : this.mockSessions[idx].participants;

          this.mockSessions[idx] = {
            ...this.mockSessions[idx],
            date: sessionData.date || this.mockSessions[idx].date,
            location: loc,
            manager: mgr,
            participants: parts
          };
        }
        this.refreshCurrentView();
        if (!silent) useGlobalStore().addSuccess('Session de salle mise à jour avec succès !', 'Session modifiée');
        return { data: this.mockSessions[idx] };
      }

      try {
        const payload = {};
        if (sessionData.date) payload.date = sessionData.date;
        if (sessionData.participants !== undefined) payload.participants = sessionData.participants.filter(Boolean);
        if (sessionData.location) payload.location = sessionData.location;
        if (sessionData.manager) payload.manager = sessionData.manager;

        const res = await api.put(`/room-sessions/${documentId}`, { data: payload });
        this.refreshCurrentView();
        if (!silent) useGlobalStore().addSuccess('Session de salle mise à jour avec succès !', 'Session modifiée');
        return res.data;
      } catch (err) {
        throw new Error(err.response?.data?.error?.message || err.message);
      }
    },

    async deleteSession(documentId, silent = false) {
      const appSettings = useAppSettingsStore();
      if (appSettings.useMockData) {
        this.initMockSessions();
        this.mockSessions = this.mockSessions.filter(s => s.documentId !== documentId && s.id !== documentId);
        this.refreshCurrentView();
        if (!silent) useGlobalStore().addSuccess('Salle fermée et session supprimée avec succès !', 'Session supprimée');
        return;
      }

      try {
        await api.delete(`/room-sessions/${documentId}`);
        this.refreshCurrentView();
        if (!silent) useGlobalStore().addSuccess('Salle fermée et session supprimée avec succès !', 'Session supprimée');
      } catch (err) {
        throw new Error(err.response?.data?.error?.message || err.message);
      }
    },

    async assignManager(sessionId, managerId, silent = false) {
      return await this.updateSession(sessionId, { manager: managerId }, silent);
    },

    async unassignManager(sessionId, silent = false) {
      return await this.updateSession(sessionId, { manager: null }, silent);
    },

    async addParticipantToSession(sessionId, participantId, silent = false) {
      const session = this.sessions.find(s => (s.documentId === sessionId || s.id === sessionId));
      const existingIds = session ? (session.participants || []).map(p => p.documentId || p.id) : [];
      if (!existingIds.includes(participantId)) {
        existingIds.push(participantId);
      }
      return await this.updateSession(sessionId, { participants: existingIds }, silent);
    },

    async removeParticipantFromSession(sessionId, participantId, silent = false) {
      const session = this.sessions.find(s => (s.documentId === sessionId || s.id === sessionId));
      const updatedIds = session 
        ? (session.participants || []).filter(p => (p.documentId || p.id) !== participantId).map(p => p.documentId || p.id)
        : [];
      return await this.updateSession(sessionId, { participants: updatedIds }, silent);
    },

    async moveParticipantBetweenSessions(fromSessionId, toSessionId, participantId, silent = false) {
      if (fromSessionId === toSessionId) return;
      await this.removeParticipantFromSession(fromSessionId, participantId, true);
      await this.addParticipantToSession(toSessionId, participantId, true);
      await this.refreshCurrentView();
      if (!silent) {
        useGlobalStore().addSuccess('Bénéficiaire déplacé vers la nouvelle salle avec succès !', 'Déplacement réussi');
      }
    },

    async openRoomForDate(locationId, dateStr, managerId = null, participantIds = [], silent = false) {
      const existing = this.sessions.find(s => 
        s.date === dateStr && (s.location?.documentId === locationId || s.location?.id === locationId)
      );
      if (existing) {
        if (!silent) {
          useGlobalStore().addWarning('Cette salle est déjà ouverte pour ce jour.', 'Salle déjà ouverte');
        }
        return existing;
      }
      return await this.createSession({
        date: dateStr,
        location: locationId,
        manager: managerId,
        participants: participantIds
      }, silent);
    },

    async batchCreateSessions(sessionsList) {
      if (!sessionsList || sessionsList.length === 0) return [];
      this.loading = true;
      try {
        const results = [];
        for (const s of sessionsList) {
          const res = await this.createSession(s, true);
          results.push(res);
        }
        useGlobalStore().addSuccess(`${sessionsList.length} ouverture(s) de salle créée(s) avec succès !`, 'Remplissage réussi');
        return results;
      } finally {
        await this.refreshCurrentView();
        this.loading = false;
      }
    },

    async batchDeleteSessions(sessionIds) {
      if (!sessionIds || sessionIds.length === 0) return;
      this.loading = true;
      try {
        for (const id of sessionIds) {
          await this.deleteSession(id, true);
        }
        useGlobalStore().addSuccess(`${sessionIds.length} session(s) de salle fermée(s).`, 'Fermeture par lot');
      } finally {
        await this.refreshCurrentView();
        this.loading = false;
      }
    },

    async duplicateDay(sourceDate, targetDates, options = {}) {
      const { copyManager = true, copyParticipants = true, overwrite = false } = options;
      this.loading = true;

      try {
        const appSettings = useAppSettingsStore();
        let sourceSessions = [];

        if (appSettings.useMockData) {
          this.initMockSessions();
          sourceSessions = this.mockSessions.filter(s => s.date === sourceDate);
        } else {
          const res = await api.get('/room-sessions', {
            params: {
              'filters[date][$eq]': sourceDate,
              'populate[0]': 'location',
              'populate[1]': 'manager',
              'populate[2]': 'participants'
            }
          });
          sourceSessions = res.data.data || [];
        }

        if (sourceSessions.length === 0) {
          throw new Error(`Aucune ouverture de salle trouvée à la date source (${sourceDate}).`);
        }

        let createdCount = 0;

        for (const targetDate of targetDates) {
          if (targetDate === sourceDate) continue;

          // Check if target date has existing sessions
          let existingOnTarget = [];
          if (appSettings.useMockData) {
            existingOnTarget = this.mockSessions.filter(s => s.date === targetDate);
          } else {
            const checkRes = await api.get('/room-sessions', {
              params: { 'filters[date][$eq]': targetDate, 'populate[0]': 'location' }
            });
            existingOnTarget = checkRes.data.data || [];
          }

          for (const src of sourceSessions) {
            const locId = src.location?.documentId || src.location?.id;
            const existing = existingOnTarget.find(e => (e.location?.documentId || e.location?.id) === locId);

            if (existing && !overwrite) {
              // Skip if exists and overwrite is false
              continue;
            }

            const sessionPayload = {
              date: targetDate,
              location: locId,
              manager: copyManager ? (src.manager?.documentId || src.manager?.id) : null,
              participants: copyParticipants ? (src.participants || []).map(p => p.documentId || p.id) : []
            };

            if (existing && overwrite) {
              await this.updateSession(existing.documentId || existing.id, sessionPayload, true);
              createdCount++;
            } else {
              await this.createSession(sessionPayload, true);
              createdCount++;
            }
          }
        }

        useGlobalStore().addSuccess(`Duplication réussie : ${createdCount} session(s) créée(s) / mise(s) à jour sur ${targetDates.length} date(s).`, 'Duplication terminée');
      } catch (err) {
        this.error = err.message;
        useGlobalStore().addError(err.message, 'Erreur Duplication');
        throw err;
      } finally {
        await this.refreshCurrentView();
        this.loading = false;
      }
    },

    async applyTemplate(targetDates, templatesConfig = null, options = {}) {
      const { overwrite = false, allowedDays = [1, 2, 3, 4, 5, 6, 7] } = options;
      this.loading = true;

      try {
        let appliedCount = 0;
        const appSettings = useAppSettingsStore();

        // Get template store if not explicitly passed
        let allTemplates = templatesConfig;
        if (!allTemplates || !allTemplates.length) {
          const tmplStore = useRoomSessionTemplateStore();
          if (!tmplStore.templates.length) {
            await tmplStore.fetchTemplates();
          }
          allTemplates = tmplStore.templates;
        }

        for (const targetDate of targetDates) {
          const d = new Date(targetDate + 'T00:00:00');
          const jsDay = d.getDay(); // 0 is Sun, 1 is Mon...
          const dayOfWeek = jsDay === 0 ? 7 : jsDay;

          // Check if day of week is enabled
          if (!allowedDays.includes(dayOfWeek)) continue;

          // Get active template items for this day of week
          const dayTemplates = allTemplates.filter(t => 
            Number(t.dayOfWeek) === Number(dayOfWeek) && (t.isActive !== false && t.selected !== false)
          );

          if (!dayTemplates.length) continue;

          let existingOnTarget = [];
          if (appSettings.useMockData) {
            this.initMockSessions();
            existingOnTarget = this.mockSessions.filter(s => s.date === targetDate);
          } else {
            const checkRes = await api.get('/room-sessions', {
              params: { 'filters[date][$eq]': targetDate, 'populate[0]': 'location' }
            });
            existingOnTarget = checkRes.data.data || [];
          }

          for (const item of dayTemplates) {
            const locId = item.location?.documentId || item.location?.id || item.locationId || item.location;
            const mgrId = item.manager?.documentId || item.manager?.id || item.managerId || item.manager || null;
            const partIds = (item.participants || item.participantIds || []).map(p => p.documentId || p.id || p);

            if (!locId) continue;

            const existing = existingOnTarget.find(e => (e.location?.documentId || e.location?.id) === locId);

            if (existing && !overwrite) continue;

            const sessionPayload = {
              date: targetDate,
              location: locId,
              manager: mgrId,
              participants: partIds
            };

            if (existing && overwrite) {
              await this.updateSession(existing.documentId || existing.id, sessionPayload, true);
              appliedCount++;
            } else {
              await this.createSession(sessionPayload, true);
              appliedCount++;
            }
          }
        }

        useGlobalStore().addSuccess(
          `Semaine type appliquée avec succès : ${appliedCount} ouverture(s) générée(s) sur ${targetDates.length} date(s).`,
          'Semaine Type Appliquée'
        );
        return appliedCount;
      } catch (err) {
        this.error = err.message;
        useGlobalStore().addError(err.message, 'Erreur Semaine Type');
        throw err;
      } finally {
        await this.refreshCurrentView();
        this.loading = false;
      }
    },

    async refreshCurrentView() {
      if (this.currentViewMode === 'day') {
        await this.fetchSessions(this.selectedDate);
      } else if (this.viewRange.startDate && this.viewRange.endDate) {
        await this.fetchSessionsForRange(this.viewRange.startDate, this.viewRange.endDate);
      } else {
        await this.fetchAllSessions();
      }
    }
  }
});
