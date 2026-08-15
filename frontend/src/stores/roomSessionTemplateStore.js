import { defineStore } from 'pinia';
import api from '../services/api';
import { useAppSettingsStore } from './appSettings';
import { useMockSchedulerStore } from './mockScheduler';
import { useGlobalStore } from './global';
import defaultTemplatesData from '../../../data/room-session-templates.json';

export const useRoomSessionTemplateStore = defineStore('roomSessionTemplate', {
  state: () => ({
    templates: [],
    mockTemplates: [],
    mockInitialized: false,
    loading: false,
    saving: false,
    error: null,
    isDirty: false
  }),

  getters: {
    // Group templates by day of week (1 = Lundi ... 7 = Dimanche)
    templatesByDay: (state) => {
      const map = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
      state.templates.forEach(t => {
        const d = Number(t.dayOfWeek);
        if (map[d]) {
          map[d].push(t);
        }
      });
      return map;
    },

    // Total number of active openings configured across the week
    activeTemplatesCount: (state) => {
      return state.templates.filter(t => t.isActive).length;
    },

    // Get active template items for a specific day of week (1 to 7)
    getActiveTemplatesForDay: (state) => (dayOfWeek) => {
      const d = Number(dayOfWeek);
      return state.templates.filter(t => Number(t.dayOfWeek) === d && t.isActive);
    }
  },

  actions: {
    initMockTemplates() {
      if (this.mockInitialized && this.mockTemplates.length > 0) return;
      const mockScheduler = useMockSchedulerStore();

      const deepCopy = (d) => JSON.parse(JSON.stringify(d));
      this.mockTemplates = deepCopy(defaultTemplatesData).map((t, i) => {
        const loc = mockScheduler.locations.find(l => l.name === t._location) || { name: t._location };
        const mgr = mockScheduler.facilitators.find(f => f.email === t._manager) || null;
        const parts = (t._participants || []).map(email => mockScheduler.participants.find(p => p.email === email)).filter(Boolean);

        return {
          documentId: `tmpl_${i}`,
          id: `tmpl_${i}`,
          dayOfWeek: t.dayOfWeek,
          location: loc,
          manager: mgr,
          participants: parts,
          isActive: t.isActive !== false,
          notes: t.notes || ''
        };
      });
      this.mockInitialized = true;
    },

    async fetchTemplates() {
      this.loading = true;
      this.error = null;

      const appSettings = useAppSettingsStore();
      if (appSettings.useMockData) {
        this.initMockTemplates();
        this.templates = JSON.parse(JSON.stringify(this.mockTemplates));
        this.loading = false;
        this.isDirty = false;
        return this.templates;
      }

      try {
        const res = await api.get('/room-session-templates', {
          params: {
            'populate[0]': 'location',
            'populate[1]': 'manager',
            'populate[2]': 'participants',
            'pagination[pageSize]': 1000
          }
        });
        
        const fetched = res.data.data || [];
        if (fetched.length === 0) {
          // If no templates exist in DB yet, initialize from mock default structure
          this.initMockTemplates();
          this.templates = JSON.parse(JSON.stringify(this.mockTemplates));
        } else {
          this.templates = fetched;
        }
        this.isDirty = false;
        return this.templates;
      } catch (err) {
        console.error('Error fetching room session templates:', err);
        this.error = err.message || 'Erreur lors du chargement de la semaine type';
        // Fallback to mock data on API error
        this.initMockTemplates();
        this.templates = JSON.parse(JSON.stringify(this.mockTemplates));
        return this.templates;
      } finally {
        this.loading = false;
      }
    },

    // Update local template entry in memory
    setTemplateEntry(dayOfWeek, locationId, updateData) {
      const idx = this.templates.findIndex(t => 
        Number(t.dayOfWeek) === Number(dayOfWeek) && 
        (t.location?.documentId === locationId || t.location?.id === locationId || t.location === locationId)
      );

      if (idx !== -1) {
        this.templates[idx] = {
          ...this.templates[idx],
          ...updateData
        };
        this.isDirty = true;
      } else {
        // Create new entry in state if missing
        this.templates.push({
          dayOfWeek: Number(dayOfWeek),
          location: locationId,
          isActive: true,
          ...updateData
        });
        this.isDirty = true;
      }
    },

    // Duplicate a day's setup to other target days
    duplicateDayToDays(sourceDay, targetDays) {
      const sourceItems = this.templates.filter(t => Number(t.dayOfWeek) === Number(sourceDay));
      if (!sourceItems.length) return;

      targetDays.forEach(targetDay => {
        if (Number(targetDay) === Number(sourceDay)) return;

        sourceItems.forEach(src => {
          const locId = src.location?.documentId || src.location?.id || src.location;
          this.setTemplateEntry(targetDay, locId, {
            location: src.location,
            manager: src.manager,
            participants: src.participants ? [...src.participants] : [],
            isActive: src.isActive,
            notes: src.notes || ''
          });
        });
      });

      this.isDirty = true;
      useGlobalStore().addSuccess(
        `Configuration du ${this.getDayName(sourceDay)} dupliquée avec succès.`,
        'Duplication effectuée'
      );
    },

    // Set all rooms open or closed for a specific day
    setDayAllActive(dayOfWeek, activeState) {
      this.templates.forEach(t => {
        if (Number(t.dayOfWeek) === Number(dayOfWeek)) {
          t.isActive = !!activeState;
        }
      });
      this.isDirty = true;
    },

    // Save all templates to Database / Mock store
    async saveAllTemplates() {
      this.saving = true;
      this.error = null;
      const appSettings = useAppSettingsStore();

      try {
        if (appSettings.useMockData) {
          await new Promise(resolve => setTimeout(resolve, 400));
          this.mockTemplates = JSON.parse(JSON.stringify(this.templates));
          this.isDirty = false;
          useGlobalStore().addSuccess('La Semaine Type a été enregistrée avec succès.', 'Semaine Type Sauvegardée');
          return;
        }

        // In API mode, persist items
        for (const item of this.templates) {
          const locId = item.location?.documentId || item.location?.id || item.location;
          const mgrId = item.manager?.documentId || item.manager?.id || item.manager || null;
          const partIds = (item.participants || []).map(p => p.documentId || p.id || p);

          const payload = {
            dayOfWeek: Number(item.dayOfWeek),
            location: locId,
            manager: mgrId,
            participants: partIds,
            isActive: item.isActive !== false,
            notes: item.notes || ''
          };

          if (item.documentId && !item.documentId.startsWith('tmpl_')) {
            await api.put(`/room-session-templates/${item.documentId}`, { data: payload });
          } else if (item.id && typeof item.id === 'number') {
            await api.put(`/room-session-templates/${item.id}`, { data: payload });
          } else {
            const createRes = await api.post('/room-session-templates', { data: payload });
            if (createRes.data?.data?.documentId) {
              item.documentId = createRes.data.data.documentId;
            }
          }
        }

        this.isDirty = false;
        useGlobalStore().addSuccess('La Semaine Type a été enregistrée en base de données.', 'Semaine Type Sauvegardée');
      } catch (err) {
        console.error('Error saving templates:', err);
        this.error = err.message || 'Erreur lors de la sauvegarde de la semaine type';
        useGlobalStore().addError(this.error, 'Erreur de Sauvegarde');
        throw err;
      } finally {
        this.saving = false;
      }
    },

    // Reset templates to default mock data
    async resetToDefaults(locations = [], facilitators = []) {
      this.initMockTemplates();
      this.templates = JSON.parse(JSON.stringify(this.mockTemplates));
      this.isDirty = true;
      useGlobalStore().addInfo('Modèle réinitialisé aux valeurs standard par défaut. Cliquez sur Enregistrer pour valider.', 'Réinitialisation');
    },

    getDayName(dayNum) {
      const days = {
        1: 'Lundi',
        2: 'Mardi',
        3: 'Mercredi',
        4: 'Jeudi',
        5: 'Vendredi',
        6: 'Samedi',
        7: 'Dimanche'
      };
      return days[Number(dayNum)] || `Jour ${dayNum}`;
    }
  }
});
