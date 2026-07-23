import { defineStore } from 'pinia';
import api from '../services/api';
import { useAppSettingsStore } from './appSettings';
import { useMockSchedulerStore } from './mockScheduler';
import roomSessionsData from '../../../data/room-sessions.json';

export const useRoomSessionStore = defineStore('roomSession', {
  state: () => ({
    sessions: [],
    mockSessions: [],
    mockInitialized: false,
    loading: false,
    error: null,
    selectedDate: new Date().toISOString().slice(0, 10)
  }),

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
            'populate[3]': 'timeSlots'
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
            'pagination[pageSize]': 100
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

    async createSession(sessionData) {
      const appSettings = useAppSettingsStore();
      if (appSettings.useMockData) {
        this.initMockSessions();
        const mockScheduler = useMockSchedulerStore();
        const loc = mockScheduler.locations.find(l => l.documentId === sessionData.location || l.id === sessionData.location) || null;
        const mgr = mockScheduler.facilitators.find(f => f.documentId === sessionData.manager || f.id === sessionData.manager) || null;
        const parts = (sessionData.participants || []).map(pid => mockScheduler.participants.find(p => p.documentId === pid || p.id === pid)).filter(Boolean);

        const newSession = {
          documentId: `room_sess_${Date.now()}`,
          id: `room_sess_${Date.now()}`,
          date: sessionData.date,
          location: loc,
          manager: mgr,
          participants: parts,
          timeSlots: []
        };

        this.mockSessions.push(newSession);
        await this.fetchSessions(sessionData.date || this.selectedDate);
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
        await this.fetchSessions(sessionData.date || this.selectedDate);
        return res.data;
      } catch (err) {
        throw new Error(err.response?.data?.error?.message || err.message);
      }
    },

    async updateSession(documentId, sessionData) {
      const appSettings = useAppSettingsStore();
      if (appSettings.useMockData) {
        this.initMockSessions();
        const mockScheduler = useMockSchedulerStore();
        const idx = this.mockSessions.findIndex(s => s.documentId === documentId || s.id === documentId);
        if (idx !== -1) {
          const loc = mockScheduler.locations.find(l => l.documentId === sessionData.location || l.id === sessionData.location) || null;
          const mgr = mockScheduler.facilitators.find(f => f.documentId === sessionData.manager || f.id === sessionData.manager) || null;
          const parts = (sessionData.participants || []).map(pid => mockScheduler.participants.find(p => p.documentId === pid || p.id === pid)).filter(Boolean);

          this.mockSessions[idx] = {
            ...this.mockSessions[idx],
            date: sessionData.date,
            location: loc,
            manager: mgr,
            participants: parts
          };
        }
        await this.fetchSessions(this.selectedDate);
        return { data: this.mockSessions[idx] };
      }

      try {
        const payload = {
          date: sessionData.date,
          participants: (sessionData.participants || []).filter(Boolean)
        };
        if (sessionData.location) payload.location = sessionData.location;
        if (sessionData.manager) payload.manager = sessionData.manager;

        const res = await api.put(`/room-sessions/${documentId}`, { data: payload });
        await this.fetchSessions(this.selectedDate);
        return res.data;
      } catch (err) {
        throw new Error(err.response?.data?.error?.message || err.message);
      }
    },

    async deleteSession(documentId) {
      const appSettings = useAppSettingsStore();
      if (appSettings.useMockData) {
        this.initMockSessions();
        this.mockSessions = this.mockSessions.filter(s => s.documentId !== documentId && s.id !== documentId);
        await this.fetchSessions(this.selectedDate);
        return;
      }

      try {
        await api.delete(`/room-sessions/${documentId}`);
        await this.fetchSessions(this.selectedDate);
      } catch (err) {
        throw new Error(err.response?.data?.error?.message || err.message);
      }
    }
  }
});
