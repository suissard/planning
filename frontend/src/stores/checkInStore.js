import { defineStore } from 'pinia';
import api from '../services/api';
import { useAppSettingsStore } from './appSettings';
import { useGlobalStore } from './global';

function getLocalDateStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const useCheckInStore = defineStore('checkIn', {
  state: () => ({
    checkIns: [],
    mockCheckIns: [],
    loading: false,
    savingKey: null,
    error: null,
    selectedDate: getLocalDateStr(),
    selectedSlotId: null,
    searchQuery: '',
    statusFilter: 'all', // 'all' | 'present' | 'on_site' | 'departed' | 'absent' | 'unmarked'
    initialized: false
  }),

  getters: {
    // Get all check-in records (passages) for a specific slot & participant
    getParticipantPassages: (state) => (slotId, participantId) => {
      if (!slotId || !participantId) return [];
      const list = (state.checkIns || []).filter(item => {
        const sId = item.timeSlot?.documentId || item.timeSlot?.id || item.timeSlot;
        const pId = item.participant?.documentId || item.participant?.id || item.participant;
        return String(sId) === String(slotId) && String(pId) === String(participantId);
      });
      return list.sort((a, b) => new Date(a.checkInTime || a.createdAt || 0) - new Date(b.checkInTime || b.createdAt || 0));
    },

    // Overall status of a participant on a slot
    getParticipantStatus: (state) => (slotId, participantId) => {
      if (!slotId || !participantId) return 'unmarked';
      const passages = (state.checkIns || []).filter(item => {
        const sId = item.timeSlot?.documentId || item.timeSlot?.id || item.timeSlot;
        const pId = item.participant?.documentId || item.participant?.id || item.participant;
        return String(sId) === String(slotId) && String(pId) === String(participantId);
      });

      if (passages.length === 0) return 'unmarked';

      const hasActiveOnSite = passages.some(p => p.isPresent && !p.checkOutTime);
      if (hasActiveOnSite) return 'present'; // Currently present on site

      const allAbsent = passages.every(p => !p.isPresent);
      if (allAbsent) return 'absent';

      // Has passages that are completed with checkOutTime
      const hasDeparted = passages.some(p => p.isPresent && p.checkOutTime);
      if (hasDeparted) return 'departed';

      return 'present';
    },

    // Statistics for a given slot
    getSlotStats: (state) => (slot) => {
      if (!slot) return { total: 0, present: 0, currentlyOnSite: 0, departed: 0, absent: 0, unmarked: 0, rate: 0, passagesCount: 0, commentsCount: 0 };
      const slotId = slot.documentId || slot.id;
      const participants = slot.participants || [];
      const total = participants.length;

      let presentCount = 0;
      let currentlyOnSite = 0;
      let departedCount = 0;
      let absentCount = 0;
      let unmarkedCount = 0;
      let passagesCount = 0;
      let commentsCount = 0;

      for (const p of participants) {
        const pId = p.documentId || p.id;
        const passages = (state.checkIns || []).filter(item => {
          const sId = item.timeSlot?.documentId || item.timeSlot?.id || item.timeSlot;
          const participantKey = item.participant?.documentId || item.participant?.id || item.participant;
          return String(sId) === String(slotId) && String(participantKey) === String(pId);
        });

        passagesCount += passages.length;

        if (passages.length === 0) {
          unmarkedCount++;
        } else {
          const hasPresent = passages.some(pass => pass.isPresent);
          const hasOnSite = passages.some(pass => pass.isPresent && !pass.checkOutTime);
          const hasCheckedOut = passages.some(pass => pass.isPresent && pass.checkOutTime);

          if (hasOnSite) {
            currentlyOnSite++;
            presentCount++;
          } else if (hasCheckedOut) {
            departedCount++;
            presentCount++;
          } else if (hasPresent) {
            presentCount++;
          } else {
            absentCount++;
          }

          for (const pass of passages) {
            if (pass.comment && pass.comment.trim()) {
              commentsCount++;
            }
          }
        }
      }

      const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0;
      return {
        total,
        present: presentCount,
        currentlyOnSite,
        departed: departedCount,
        absent: absentCount,
        unmarked: unmarkedCount,
        rate,
        passagesCount,
        commentsCount
      };
    }
  },

  actions: {
    initMockData() {
      const stored = localStorage.getItem('mock_checkins_data');
      if (stored) {
        try {
          this.mockCheckIns = JSON.parse(stored);
          this.checkIns = [...this.mockCheckIns];
          this.initialized = true;
          return;
        } catch (e) {
          console.warn('Failed to parse stored mock check-ins', e);
        }
      }
      this.mockCheckIns = [];
      this.checkIns = [];
      this.initialized = true;
    },

    saveMockDataToStorage() {
      try {
        localStorage.setItem('mock_checkins_data', JSON.stringify(this.mockCheckIns));
      } catch (e) {
        console.warn('Failed to save mock check-ins to localStorage', e);
      }
    },

    async fetchCheckIns(force = false) {
      const appSettings = useAppSettingsStore();
      if (appSettings.useMockData) {
        if (!this.initialized || force) {
          this.initMockData();
        }
        this.checkIns = [...this.mockCheckIns];
        return this.checkIns;
      }

      this.loading = true;
      this.error = null;
      try {
        const res = await api.get('/check-ins', {
          params: {
            'populate[0]': 'timeSlot',
            'populate[1]': 'participant',
            'pagination[pageSize]': 5000,
            sort: 'createdAt:asc'
          },
          skipGlobalNotification: true
        });
        this.checkIns = res.data.data || [];
        this.initialized = true;
        return this.checkIns;
      } catch (err) {
        console.error('Error fetching check-ins:', err);
        this.error = err.response?.data?.error?.message || err.message || 'Erreur lors du chargement des pointages';
      } finally {
        this.loading = false;
      }
    },

    // Create a new Check-In passage
    async addCheckInPassage({ timeSlot, participant, isPresent = true, checkInTime, checkOutTime = null, comment = '' }) {
      const appSettings = useAppSettingsStore();
      const slotId = timeSlot?.documentId || timeSlot?.id || timeSlot;
      const participantId = participant?.documentId || participant?.id || participant;

      if (!slotId || !participantId) return;

      const key = `${slotId}_${participantId}`;
      this.savingKey = key;
      const now = new Date().toISOString();
      const resolvedCheckInTime = checkInTime || now;

      if (appSettings.useMockData) {
        await new Promise(r => setTimeout(r, 80));
        const newDoc = {
          id: `chk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          documentId: `chk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          isPresent,
          checkInTime: resolvedCheckInTime,
          checkOutTime: checkOutTime || null,
          comment: comment || '',
          timeSlot: typeof timeSlot === 'object' ? timeSlot : { documentId: slotId, id: slotId },
          participant: typeof participant === 'object' ? participant : { documentId: participantId, id: participantId }
        };
        this.mockCheckIns.push(newDoc);
        this.checkIns.push(newDoc);
        this.saveMockDataToStorage();
        this.savingKey = null;
        return newDoc;
      }

      try {
        const payload = {
          data: {
            isPresent,
            checkInTime: resolvedCheckInTime,
            checkOutTime: checkOutTime || null,
            comment: comment || '',
            timeSlot: slotId,
            participant: participantId
          }
        };
        const res = await api.post('/check-ins', payload, { skipGlobalNotification: true });
        const created = res.data.data;
        const enriched = {
          ...created,
          timeSlot: typeof timeSlot === 'object' ? timeSlot : { documentId: slotId, id: slotId },
          participant: typeof participant === 'object' ? participant : { documentId: participantId, id: participantId }
        };
        this.checkIns.push(enriched);
        return enriched;
      } catch (err) {
        console.error('Error adding check-in passage:', err);
        const errMsg = err.response?.data?.error?.message || err.message || 'Erreur lors de la création du pointage';
        useGlobalStore().addError(errMsg, 'Erreur Pointage');
        throw new Error(errMsg);
      } finally {
        this.savingKey = null;
      }
    },

    // Update an existing check-in passage
    async updatePassage(checkInId, updateData) {
      const appSettings = useAppSettingsStore();
      if (!checkInId) return;

      this.savingKey = String(checkInId);

      if (appSettings.useMockData) {
        await new Promise(r => setTimeout(r, 60));
        const idx = this.mockCheckIns.findIndex(c => (c.documentId || c.id) === checkInId);
        if (idx !== -1) {
          this.mockCheckIns[idx] = {
            ...this.mockCheckIns[idx],
            ...updateData
          };
          this.checkIns = [...this.mockCheckIns];
          this.saveMockDataToStorage();
        }
        this.savingKey = null;
        return;
      }

      try {
        const payload = { data: updateData };
        const res = await api.put(`/check-ins/${checkInId}`, payload, { skipGlobalNotification: true });
        const updated = res.data.data;
        const idx = this.checkIns.findIndex(c => (c.documentId || c.id) === checkInId);
        if (idx !== -1) {
          this.checkIns[idx] = {
            ...this.checkIns[idx],
            ...updated,
            timeSlot: this.checkIns[idx].timeSlot,
            participant: this.checkIns[idx].participant
          };
        }
        return updated;
      } catch (err) {
        console.error('Error updating passage:', err);
        const errMsg = err.response?.data?.error?.message || err.message || 'Erreur lors de la mise à jour';
        useGlobalStore().addError(errMsg, 'Erreur Pointage');
        throw new Error(errMsg);
      } finally {
        this.savingKey = null;
      }
    },

    // Record departure / check-out time for a passage
    async recordCheckOut(checkInId, checkOutTime = null) {
      const resolvedDeparture = checkOutTime || new Date().toISOString();
      await this.updatePassage(checkInId, { checkOutTime: resolvedDeparture });
    },

    // Delete a specific check-in passage
    async deletePassage(checkInId) {
      const appSettings = useAppSettingsStore();
      if (!checkInId) return;

      if (appSettings.useMockData) {
        this.mockCheckIns = this.mockCheckIns.filter(c => (c.documentId || c.id) !== checkInId);
        this.checkIns = [...this.mockCheckIns];
        this.saveMockDataToStorage();
        return;
      }

      try {
        await api.delete(`/check-ins/${checkInId}`, { skipGlobalNotification: true });
        this.checkIns = this.checkIns.filter(c => (c.documentId || c.id) !== checkInId);
      } catch (err) {
        console.error('Error deleting passage:', err);
        useGlobalStore().addError('Erreur lors de la suppression du passage.', 'Erreur Pointage');
      }
    },

    // Mark all participants of a slot as present
    async markAllForSlot({ timeSlot, participants, isPresent = true }) {
      if (!timeSlot || !participants || participants.length === 0) return;
      const slotId = timeSlot?.documentId || timeSlot?.id || timeSlot;
      const now = new Date().toISOString();

      const promises = participants.map(async (p) => {
        const pId = p.documentId || p.id;
        const passages = this.getParticipantPassages(slotId, pId);

        if (passages.length === 0) {
          return this.addCheckInPassage({
            timeSlot,
            participant: p,
            isPresent,
            checkInTime: now
          });
        } else {
          // If passages already exist, update first passage
          const first = passages[0];
          return this.updatePassage(first.documentId || first.id, {
            isPresent
          });
        }
      });

      await Promise.all(promises);
      const label = isPresent ? 'tous présents' : 'tous absents';
      useGlobalStore().addSuccess(`Pointage mis à jour : ${label} pour cette animation.`, 'Pointage groupé');
    },

    // Reset all check-ins for a slot
    async resetSlotCheckIns({ timeSlot, participants }) {
      const slotId = timeSlot?.documentId || timeSlot?.id || timeSlot;
      if (!slotId || !participants) return;

      const appSettings = useAppSettingsStore();
      if (appSettings.useMockData) {
        this.mockCheckIns = this.mockCheckIns.filter(item => {
          const sId = item.timeSlot?.documentId || item.timeSlot?.id || item.timeSlot;
          return String(sId) !== String(slotId);
        });
        this.checkIns = [...this.mockCheckIns];
        this.saveMockDataToStorage();
        useGlobalStore().addSuccess('Pointages réinitialisés.', 'Pointage');
        return;
      }

      const toDelete = (this.checkIns || []).filter(item => {
        const sId = item.timeSlot?.documentId || item.timeSlot?.id || item.timeSlot;
        return String(sId) === String(slotId);
      });

      try {
        await Promise.all(toDelete.map(item => {
          const docId = item.documentId || item.id;
          return api.delete(`/check-ins/${docId}`, { skipGlobalNotification: true });
        }));
        this.checkIns = this.checkIns.filter(item => {
          const sId = item.timeSlot?.documentId || item.timeSlot?.id || item.timeSlot;
          return String(sId) !== String(slotId);
        });
        useGlobalStore().addSuccess('Pointages réinitialisés pour cette animation.', 'Pointage');
      } catch (err) {
        console.error('Error resetting check-ins:', err);
        useGlobalStore().addError('Erreur lors de la réinitialisation.', 'Erreur Pointage');
      }
    }
  }
});
