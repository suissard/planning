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

        <v-btn color="primary" prepend-icon="mdi-plus" @click="openDialog()" class="text-none">
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
        <div class="d-flex align-center ga-2 font-weight-medium">
          <v-avatar size="28" color="indigo-lighten-4" class="text-indigo-darken-3 font-weight-bold">
            {{ item.firstName ? item.firstName.charAt(0) : '👨‍🏫' }}
          </v-avatar>
          <span>{{ item.firstName }} {{ item.lastName }}</span>
        </div>
      </template>

      <template v-slot:item.email="{ item }">
        <span class="text-medium-emphasis">✉️ {{ item.email }}</span>
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
        <div class="d-flex ga-1">
          <v-btn
            icon="mdi-pencil"
            size="x-small"
            color="primary"
            variant="text"
            title="Modifier"
            @click="openDialog(item)"
          ></v-btn>
          <v-btn
            icon="mdi-delete"
            size="x-small"
            color="error"
            variant="text"
            title="Supprimer"
            @click="deleteItem(item)"
          ></v-btn>
        </div>
      </template>
    </v-data-table>

    <v-dialog v-model="dialog" max-width="750px" persistent>
      <v-card class="pa-2 border rounded-xl">
        <v-card-title class="d-flex align-center justify-space-between py-3 px-4">
          <span class="text-h6 font-weight-bold d-flex align-center ga-2">
            <span>👨‍🏫</span> {{ formTitle }}
          </span>
          <v-btn icon="mdi-close" variant="text" size="small" @click="closeDialog"></v-btn>
        </v-card-title>

        <v-divider class="mb-4"></v-divider>

        <v-card-text>
          <v-container class="pa-0">
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="editedItem.firstName"
                  label="Prénom"
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
                  label="Nom"
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
                  label="Adresse Email"
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
                  prepend-inner-icon="mdi-star"
                  variant="outlined"
                  density="comfortable"
                  rows="2"
                ></v-textarea>
              </v-col>

              <!-- Weekly Availabilities -->
              <v-col cols="12">
                <h4 class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center ga-2">
                  <span>📅</span> Disponibilités Hebdomadaires
                </h4>
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
                          style="width: 120px;"
                        ></v-text-field>
                        <span class="text-caption">à</span>
                        <v-text-field
                          v-model="editedAvailabilities[day.value][0].end"
                          label="Fin"
                          type="time"
                          density="compact"
                          variant="outlined"
                          hide-details
                          style="width: 120px;"
                        ></v-text-field>
                      </div>
                    </div>
                  </div>
                </v-card>
              </v-col>

              <!-- Specific Unavailabilities -->
              <v-col cols="12" class="mt-2">
                <div class="d-flex align-center justify-space-between mb-3">
                  <h4 class="text-subtitle-1 font-weight-bold d-flex align-center ga-2">
                    <span>🚫</span> Indisponibilités Spécifiques
                  </h4>
                  <v-btn color="secondary" size="small" prepend-icon="mdi-plus" variant="tonal" @click="addUnavailability">
                    Ajouter
                  </v-btn>
                </div>

                <div v-if="!editedItem.specificUnavailabilities || editedItem.specificUnavailabilities.length === 0" class="text-caption text-medium-emphasis italic">
                  Aucune indisponibilité spécifique enregistrée.
                </div>

                <div
                  v-for="(unavail, index) in editedItem.specificUnavailabilities"
                  :key="index"
                  class="d-flex align-center ga-2 mb-2"
                >
                  <v-text-field
                    v-model="unavail.startDate"
                    label="Date de début"
                    type="datetime-local"
                    density="compact"
                    variant="outlined"
                    hide-details
                  ></v-text-field>

                  <v-text-field
                    v-model="unavail.endDate"
                    label="Date de fin"
                    type="datetime-local"
                    density="compact"
                    variant="outlined"
                    hide-details
                  ></v-text-field>

                  <v-btn
                    icon="mdi-delete"
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

        <v-card-actions class="px-4 pb-4">
          <v-spacer></v-spacer>
          <v-btn color="grey-lighten-1" variant="text" @click="closeDialog" class="text-none">
            Annuler
          </v-btn>
          <v-btn color="primary" variant="flat" @click="saveItem" :loading="saving" class="text-none px-5">
            Sauvegarder
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { useFacilitatorStore } from '../../stores/admin/facilitatorStore';
import { storeToRefs } from 'pinia';
import { computed, ref, onMounted } from 'vue';

export default {
  name: 'FacilitatorsList',
  setup() {
    const store = useFacilitatorStore();
    const { facilitators, loading } = storeToRefs(store);

    const dialog = ref(false);
    const saving = ref(false);
    const search = ref('');

    const daysOfWeek = [
      { text: 'Lundi', value: '1' },
      { text: 'Mardi', value: '2' },
      { text: 'Mercredi', value: '3' },
      { text: 'Jeudi', value: '4' },
      { text: 'Vendredi', value: '5' },
      { text: 'Samedi', value: '6' },
      { text: 'Dimanche', value: '0' },
    ];

    const headers = [
      { title: 'Animateur', key: 'name' },
      { title: 'Email', key: 'email' },
      { title: 'Disponibilités Hebdo.', key: 'weeklyAvailabilities' },
      { title: 'Actions', key: 'actions', sortable: false, align: 'end' },
    ];

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
      return isEditing.value ? 'Modifier Animateur' : 'Nouveau Animateur';
    });

    onMounted(() => {
      store.fetchFacilitators();
    });

    const initAvailabilities = () => {
      editedAvailabilities.value = {};
      availabilityChecks.value = {};
      daysOfWeek.forEach(day => {
        availabilityChecks.value[day.value] = false;
        editedAvailabilities.value[day.value] = [{ start: '09:00', end: '17:00' }];
      });
    };

    const openDialog = (item = null) => {
      initAvailabilities();
      if (item) {
        editedItem.value = {
          ...item,
          specificUnavailabilities: item.specificUnavailabilities ? [...item.specificUnavailabilities] : []
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
        editedAvailabilities.value[dayValue] = [{ start: '09:00', end: '17:00' }];
      }
    };

    const addUnavailability = () => {
      if (!editedItem.value.specificUnavailabilities) {
        editedItem.value.specificUnavailabilities = [];
      }
      editedItem.value.specificUnavailabilities.push({ startDate: '', endDate: '' });
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

      const payload = {
        firstName: editedItem.value.firstName,
        lastName: editedItem.value.lastName,
        email: editedItem.value.email,
        skills: editedItem.value.skills,
        weeklyAvailabilities: formattedWeeklyAvailabilities,
        specificUnavailabilities: editedItem.value.specificUnavailabilities.filter(u => u.startDate && u.endDate)
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
</style>
