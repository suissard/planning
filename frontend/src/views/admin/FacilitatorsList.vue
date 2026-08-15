<template>
  <div class="facilitators-view-container">
    <div class="d-flex justify-space-between align-center mb-4 flex-wrap ga-3">
      <div>
        <h2 class="text-h5 font-weight-bold d-flex align-center ga-2">
          <span>👨‍🏫</span> Administration des Animateurs
        </h2>
        <p class="text-caption text-medium-emphasis">Gérez la liste des animateurs, leurs compétences et plannings de disponibilité</p>
      </div>

      <div class="d-flex align-center ga-3">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Rechercher un animateur..."
          single-line
          hide-details
          density="compact"
          variant="outlined"
          style="min-width: 220px;"
        ></v-text-field>

        <v-btn v-if="isAdminMode" color="primary" prepend-icon="mdi-plus" @click="openDialog()" class="text-none font-weight-bold">
          Nouvel Animateur
        </v-btn>
      </div>
    </div>

    <v-data-table
      :headers="headers"
      :items="facilitators"
      :loading="loading"
      :search="search"
      class="elevation-1 border rounded-lg"
    >
      <template v-slot:item.name="{ item }">
        <div class="d-flex align-center ga-2 font-weight-medium py-2">
          <v-avatar size="32" color="teal-darken-3" class="text-teal-lighten-4 font-weight-bold">
            {{ item.firstName ? item.firstName.charAt(0) : '👨‍🏫' }}
          </v-avatar>
          <div>
            <div class="font-weight-bold">{{ item.firstName }} {{ item.lastName }}</div>
            <div class="text-caption text-medium-emphasis">{{ item.email }}</div>
          </div>
        </div>
      </template>

      <template v-slot:item.skills="{ item }">
        <span v-if="item.skills" class="text-caption font-italic text-teal-lighten-3">
          {{ item.skills }}
        </span>
        <span v-else class="text-caption text-medium-emphasis">Non renseigné</span>
      </template>

      <template v-slot:item.weeklyAvailabilities="{ item }">
        <v-chip
          v-if="item.weeklyAvailabilities && Object.keys(item.weeklyAvailabilities).length > 0"
          color="success"
          size="small"
          variant="tonal"
          class="font-weight-medium"
        >
          ✓ {{ Object.keys(item.weeklyAvailabilities).length }} jour(s) configuré(s)
        </v-chip>
        <v-chip v-else color="grey" size="small" variant="tonal">
          Non définies
        </v-chip>
      </template>

      <template v-slot:item.actions="{ item }">
        <div v-if="isAdminMode" class="d-flex ga-1">
          <v-btn
            icon="mdi-pencil"
            size="small"
            color="primary"
            variant="text"
            title="Modifier"
            @click="openDialog(item)"
          ></v-btn>
          <v-btn
            icon="mdi-delete"
            size="small"
            color="error"
            variant="text"
            title="Supprimer"
            @click="deleteItem(item)"
          ></v-btn>
        </div>
      </template>
    </v-data-table>

    <v-dialog v-model="dialog" max-width="780px" persistent>
      <v-card class="pa-3 border rounded-xl" max-height="90vh" style="display: flex; flex-direction: column; overflow: hidden;">
        <v-card-title class="d-flex align-center justify-space-between py-3 px-4 border-b">
          <span class="text-h6 font-weight-bold d-flex align-center ga-2">
            <span>👨‍🏫</span> {{ formTitle }}
          </span>
          <v-btn icon="mdi-close" variant="text" size="small" @click="closeDialog"></v-btn>
        </v-card-title>

        <v-card-text style="overflow-y: auto; flex: 1; padding: 1.25rem;">
          <v-container class="pa-0">
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="editedItem.firstName"
                  label="Prénom *"
                  prepend-inner-icon="mdi-account"
                  variant="outlined"
                  density="comfortable"
                  :rules="[v => !!v || 'Prénom requis']"
                  required
                ></v-text-field>
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="editedItem.lastName"
                  label="Nom *"
                  prepend-inner-icon="mdi-account"
                  variant="outlined"
                  density="comfortable"
                  :rules="[v => !!v || 'Nom requis']"
                  required
                ></v-text-field>
              </v-col>

              <v-col cols="12">
                <v-text-field
                  v-model="editedItem.email"
                  label="Adresse Email *"
                  type="email"
                  prepend-inner-icon="mdi-email"
                  variant="outlined"
                  density="comfortable"
                  :rules="[v => !!v || 'Email requis']"
                  required
                ></v-text-field>
              </v-col>

              <v-col cols="12">
                <v-textarea
                  v-model="editedItem.skills"
                  label="Compétences & Spécialités"
                  placeholder="Ex: Psychomotricité, Gym douce, Relaxation, Animation mémoire..."
                  prepend-inner-icon="mdi-star"
                  variant="outlined"
                  density="comfortable"
                  rows="2"
                ></v-textarea>
              </v-col>

              <!-- Weekly Availabilities -->
              <v-col cols="12">
                <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-2">
                  <h4 class="text-subtitle-1 font-weight-bold d-flex align-center ga-2">
                    <span>📅</span> Disponibilités Hebdomadaires
                  </h4>
                </div>

                <!-- Quick Presets -->
                <div class="d-flex align-center flex-wrap ga-2 mb-3 pa-2 rounded-lg" style="background: rgba(255, 255, 255, 0.03); border: 1px dashed rgba(255, 255, 255, 0.1);">
                  <span class="text-caption font-weight-bold text-medium-emphasis">⚡ Raccourcis :</span>
                  <v-chip size="small" variant="outlined" color="primary" class="clickable" @click="applyStandardWeek">
                    💼 Lun-Ven (08:30 - 17:30)
                  </v-chip>
                  <v-chip size="small" variant="outlined" color="success" class="clickable" @click="applyFullWeek">
                    ⭐ 7j/7 (08:00 - 19:30)
                  </v-chip>
                  <v-chip size="small" variant="outlined" color="grey" class="clickable" @click="clearAllDays">
                    🧹 Tout décocher
                  </v-chip>
                </div>

                <v-card variant="outlined" class="pa-3 rounded-lg border-opacity-25">
                  <div v-for="day in daysOfWeek" :key="day.value" class="mb-2 pb-2 border-b-sm">
                    <div class="d-flex align-center justify-space-between flex-wrap ga-2">
                      <v-checkbox
                        v-model="availabilityChecks[day.value]"
                        :label="day.text"
                        density="compact"
                        hide-details
                        color="primary"
                        @change="toggleDay(day.value)"
                      ></v-checkbox>

                      <div v-if="availabilityChecks[day.value]" class="d-flex align-center ga-2">
                        <v-text-field
                          v-model="editedAvailabilities[day.value][0].start"
                          label="Début"
                          type="time"
                          density="compact"
                          variant="outlined"
                          hide-details
                          style="width: 110px;"
                        ></v-text-field>
                        <span class="text-caption">à</span>
                        <v-text-field
                          v-model="editedAvailabilities[day.value][0].end"
                          label="Fin"
                          type="time"
                          density="compact"
                          variant="outlined"
                          hide-details
                          style="width: 110px;"
                        ></v-text-field>
                      </div>
                      <span v-else class="text-caption text-medium-emphasis font-italic">
                        Non disponible
                      </span>
                    </div>
                  </div>
                </v-card>
              </v-col>

              <!-- Specific Unavailabilities -->
              <v-col cols="12" class="mt-2">
                <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-2">
                  <h4 class="text-subtitle-1 font-weight-bold d-flex align-center ga-2">
                    <span>🚫</span> Indisponibilités Spécifiques & Congés
                  </h4>
                  <v-btn color="secondary" size="small" prepend-icon="mdi-plus" variant="tonal" @click="addUnavailability" class="text-none">
                    Ajouter une période
                  </v-btn>
                </div>

                <div v-if="!editedItem.specificUnavailabilities || editedItem.specificUnavailabilities.length === 0" class="pa-3 text-center rounded-lg text-caption text-medium-emphasis" style="background: rgba(0, 0, 0, 0.15); border: 1px solid rgba(255, 255, 255, 0.05);">
                  ✅ Aucune indisponibilité spécifique enregistrée (animateur disponible selon son planning hebdomadaire).
                </div>

                <div
                  v-for="(unavail, index) in editedItem.specificUnavailabilities"
                  :key="index"
                  class="pa-3 rounded-lg border d-flex flex-wrap align-center justify-space-between ga-2 mb-2"
                  style="background: rgba(15, 23, 42, 0.5);"
                >
                  <div class="d-flex align-center flex-wrap ga-2 flex-grow-1">
                    <v-text-field
                      v-model="unavail.startDate"
                      label="Début"
                      type="datetime-local"
                      density="compact"
                      variant="outlined"
                      hide-details
                      style="min-width: 180px;"
                    ></v-text-field>

                    <span class="text-caption text-medium-emphasis">au</span>

                    <v-text-field
                      v-model="unavail.endDate"
                      label="Fin"
                      type="datetime-local"
                      density="compact"
                      variant="outlined"
                      hide-details
                      style="min-width: 180px;"
                    ></v-text-field>

                    <v-text-field
                      v-model="unavail.reason"
                      label="Motif (ex: Congés, Formation)"
                      placeholder="Ex: Congés payés"
                      density="compact"
                      variant="outlined"
                      hide-details
                      class="flex-grow-1"
                      style="min-width: 160px;"
                    ></v-text-field>
                  </div>

                  <v-btn
                    icon="mdi-trash-can-outline"
                    size="small"
                    color="error"
                    variant="text"
                    @click="removeUnavailability(index)"
                  ></v-btn>
                </div>
              </v-col>

            </v-row>
          </v-container>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="px-4 py-3 justify-end ga-2">
          <v-btn color="grey-lighten-1" variant="text" @click="closeDialog" class="text-none">
            Annuler
          </v-btn>
          <v-btn color="primary" variant="flat" @click="saveItem" :loading="saving" class="text-none px-5 font-weight-bold">
            💾 Enregistrer l'animateur
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { useFacilitatorStore } from '../../stores/admin/facilitatorStore';
import { useAppSettingsStore } from '../../stores/appSettings';
import { storeToRefs } from 'pinia';
import { computed, ref, onMounted } from 'vue';

export default {
  name: 'FacilitatorsList',
  setup() {
    const store = useFacilitatorStore();
    const appSettingsStore = useAppSettingsStore();
    const { facilitators, loading } = storeToRefs(store);

    const dialog = ref(false);
    const saving = ref(false);
    const search = ref('');

    const isAdminMode = computed(() => appSettingsStore.isAdminMode);

    const daysOfWeek = [
      { text: 'Lundi', value: '1' },
      { text: 'Mardi', value: '2' },
      { text: 'Mercredi', value: '3' },
      { text: 'Jeudi', value: '4' },
      { text: 'Vendredi', value: '5' },
      { text: 'Samedi', value: '6' },
      { text: 'Dimanche', value: '0' },
    ];

    const headers = computed(() => {
      const base = [
        { title: 'Animateur', key: 'name', value: item => `${item.lastName || ''} ${item.firstName || ''}`.trim() },
        { title: 'Compétences', key: 'skills' },
        { title: 'Disponibilités Hebdo.', key: 'weeklyAvailabilities' },
      ];
      if (isAdminMode.value) {
        base.push({ title: 'Actions', key: 'actions', sortable: false, align: 'end' });
      }
      return base;
    });

    const defaultItem = {
      firstName: '',
      lastName: '',
      email: '',
      skills: '',
      weeklyAvailabilities: {},
      specificUnavailabilities: []
    };

    const editedItem = ref({ ...defaultItem });
    const isEditing = ref(false);

    const editedAvailabilities = ref({});
    const availabilityChecks = ref({});

    const formTitle = computed(() => {
      return isEditing.value ? 'Modifier Animateur' : 'Nouvel Animateur';
    });

    onMounted(() => {
      store.fetchFacilitators();
    });

    const initAvailabilities = () => {
      editedAvailabilities.value = {};
      availabilityChecks.value = {};
      daysOfWeek.forEach(day => {
        availabilityChecks.value[day.value] = false;
        editedAvailabilities.value[day.value] = [{ start: '08:30', end: '17:30' }];
      });
    };

    const formatIsoForInput = (isoString) => {
      if (!isoString) return '';
      try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return '';
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } catch (e) {
        return '';
      }
    };

    const openDialog = (item = null) => {
      initAvailabilities();
      if (item) {
        const rawUnavails = item.specificUnavailabilities ? [...item.specificUnavailabilities] : [];
        editedItem.value = {
          ...item,
          specificUnavailabilities: rawUnavails.map(u => ({
            startDate: formatIsoForInput(u.startDate),
            endDate: formatIsoForInput(u.endDate),
            reason: u.reason || ''
          }))
        };
        isEditing.value = true;

        if (item.weeklyAvailabilities) {
          Object.keys(item.weeklyAvailabilities).forEach(day => {
            availabilityChecks.value[day] = true;
            if (item.weeklyAvailabilities[day] && item.weeklyAvailabilities[day].length > 0) {
              editedAvailabilities.value[day] = [...item.weeklyAvailabilities[day]];
            }
          });
        }
      } else {
        editedItem.value = { ...defaultItem, specificUnavailabilities: [] };
        // Default check Mon-Fri
        ['1', '2', '3', '4', '5'].forEach(d => {
          availabilityChecks.value[d] = true;
        });
        isEditing.value = false;
      }
      dialog.value = true;
    };

    const closeDialog = () => {
      dialog.value = false;
      setTimeout(() => {
        editedItem.value = { ...defaultItem };
        isEditing.value = false;
      }, 300);
    };

    const toggleDay = (dayValue) => {
      if (availabilityChecks.value[dayValue] && !editedAvailabilities.value[dayValue]) {
        editedAvailabilities.value[dayValue] = [{ start: '08:30', end: '17:30' }];
      }
    };

    const applyStandardWeek = () => {
      daysOfWeek.forEach(day => {
        const isWeekday = ['1', '2', '3', '4', '5'].includes(day.value);
        availabilityChecks.value[day.value] = isWeekday;
        editedAvailabilities.value[day.value] = [{ start: '08:30', end: '17:30' }];
      });
    };

    const applyFullWeek = () => {
      daysOfWeek.forEach(day => {
        availabilityChecks.value[day.value] = true;
        editedAvailabilities.value[day.value] = [{ start: '08:00', end: '19:30' }];
      });
    };

    const clearAllDays = () => {
      daysOfWeek.forEach(day => {
        availabilityChecks.value[day.value] = false;
      });
    };

    const addUnavailability = () => {
      if (!editedItem.value.specificUnavailabilities) {
        editedItem.value.specificUnavailabilities = [];
      }
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const startStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T08:00`;
      const endStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T18:00`;
      editedItem.value.specificUnavailabilities.push({ startDate: startStr, endDate: endStr, reason: 'Congés' });
    };

    const removeUnavailability = (index) => {
      editedItem.value.specificUnavailabilities.splice(index, 1);
    };

    const saveItem = async () => {
      if (!editedItem.value.firstName || !editedItem.value.lastName || !editedItem.value.email) {
        alert('Veuillez remplir tous les champs obligatoires.');
        return;
      }

      saving.value = true;

      const formattedWeeklyAvailabilities = {};
      Object.keys(availabilityChecks.value).forEach(day => {
        if (availabilityChecks.value[day]) {
          formattedWeeklyAvailabilities[day] = editedAvailabilities.value[day];
        }
      });

      const formattedUnavails = (editedItem.value.specificUnavailabilities || [])
        .filter(u => u.startDate && u.endDate)
        .map(u => ({
          startDate: new Date(u.startDate).toISOString(),
          endDate: new Date(u.endDate).toISOString(),
          reason: u.reason || ''
        }));

      const payload = {
        firstName: editedItem.value.firstName,
        lastName: editedItem.value.lastName,
        email: editedItem.value.email,
        skills: editedItem.value.skills,
        weeklyAvailabilities: formattedWeeklyAvailabilities,
        specificUnavailabilities: formattedUnavails
      };

      try {
        if (isEditing.value) {
          await store.updateFacilitator(editedItem.value.documentId, payload);
        } else {
          await store.createFacilitator(payload);
        }
        closeDialog();
      } catch (error) {
        console.error('Save failed', error);
      } finally {
        saving.value = false;
      }
    };

    const deleteItem = async (item) => {
      if (confirm(`Êtes-vous sûr de vouloir supprimer ${item.firstName} ${item.lastName} ?`)) {
        await store.deleteFacilitator(item.documentId);
      }
    };

    return {
      isAdminMode,
      facilitators,
      loading,
      headers,
      dialog,
      editedItem,
      formTitle,
      saving,
      search,
      openDialog,
      closeDialog,
      saveItem,
      deleteItem,
      daysOfWeek,
      editedAvailabilities,
      availabilityChecks,
      toggleDay,
      applyStandardWeek,
      applyFullWeek,
      clearAllDays,
      addUnavailability,
      removeUnavailability
    };
  }
};
</script>

<style scoped>
.facilitators-view-container {
  padding: 0.5rem;
}
.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}
.clickable:hover {
  transform: translateY(-1px);
  filter: brightness(1.15);
}
</style>
