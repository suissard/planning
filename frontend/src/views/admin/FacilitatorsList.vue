<template>
  <div class="pa-4">
    <div class="d-flex justify-space-between align-center mb-4">
      <h2>Gestion des Animateurs</h2>
      <v-btn color="primary" @click="openDialog()">Nouveau Animateur</v-btn>
    </div>

    <v-data-table
      :headers="headers"
      :items="facilitators"
      :loading="loading"
      class="elevation-1"
    >
      <template v-slot:item.weeklyAvailabilities="{ item }">
          <span v-if="item.weeklyAvailabilities && Object.keys(item.weeklyAvailabilities).length > 0">
              Définies
          </span>
          <span v-else>
              Non définies
          </span>
      </template>

      <template v-slot:item.actions="{ item }">
        <v-icon size="small" class="me-2" @click="openDialog(item)">mdi-pencil</v-icon>
        <v-icon size="small" @click="deleteItem(item)">mdi-delete</v-icon>
      </template>
    </v-data-table>

    <v-dialog v-model="dialog" max-width="800px">
      <v-card>
        <v-card-title>
          <span class="text-h5">{{ formTitle }}</span>
        </v-card-title>

        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field v-model="editedItem.firstName" label="Prénom" :rules="[v => !!v || 'Requis']" required></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="editedItem.lastName" label="Nom" :rules="[v => !!v || 'Requis']" required></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-text-field v-model="editedItem.email" label="Email" :rules="[v => !!v || 'Requis']" required></v-text-field>
              </v-col>
              <v-col cols="12">
                  <v-textarea v-model="editedItem.skills" label="Compétences"></v-textarea>
              </v-col>

              <v-col cols="12">
                  <h3>Disponibilités Hebdomadaires</h3>
                  <div v-for="day in daysOfWeek" :key="day.value" class="mb-4">
                    <div class="d-flex align-center">
                        <v-checkbox v-model="availabilityChecks[day.value]" :label="day.text" @change="toggleDay(day.value)"></v-checkbox>
                        <div v-if="availabilityChecks[day.value]" class="ml-4 d-flex align-center">
                             <v-text-field v-model="editedAvailabilities[day.value][0].start" label="Début" type="time" density="compact" hide-details class="mr-2" style="width: 100px;"></v-text-field>
                             <span> à </span>
                             <v-text-field v-model="editedAvailabilities[day.value][0].end" label="Fin" type="time" density="compact" hide-details class="ml-2" style="width: 100px;"></v-text-field>
                        </div>
                    </div>
                  </div>
              </v-col>

               <v-col cols="12">
                  <h3>Indisponibilités Spécifiques</h3>
                  <v-btn color="secondary" size="small" class="mb-2" @click="addUnavailability">Ajouter</v-btn>

                  <div v-for="(unavail, index) in editedItem.specificUnavailabilities" :key="index" class="d-flex align-center mb-2">
                       <v-text-field v-model="unavail.startDate" label="Date de début" type="datetime-local" density="compact" hide-details class="mr-2"></v-text-field>
                       <v-text-field v-model="unavail.endDate" label="Date de fin" type="datetime-local" density="compact" hide-details class="mr-2"></v-text-field>
                       <v-icon color="error" @click="removeUnavailability(index)">mdi-delete</v-icon>
                  </div>
              </v-col>

            </v-row>
          </v-container>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue-darken-1" variant="text" @click="closeDialog">Annuler</v-btn>
          <v-btn color="blue-darken-1" variant="text" @click="saveItem" :loading="saving">Sauvegarder</v-btn>
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
      { title: 'Prénom', key: 'firstName' },
      { title: 'Nom', key: 'lastName' },
      { title: 'Email', key: 'email' },
      { title: 'Disponibilités Hebdo.', key: 'weeklyAvailabilities' },
      { title: 'Actions', key: 'actions', sortable: false },
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
      return isEditing.value ? 'Éditer Animateur' : 'Nouvel Animateur';
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
                if(item.weeklyAvailabilities[day] && item.weeklyAvailabilities[day].length > 0) {
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
        if(availabilityChecks.value[dayValue] && !editedAvailabilities.value[dayValue]) {
             editedAvailabilities.value[dayValue] = [{ start: '09:00', end: '17:00' }];
        }
    };

    const addUnavailability = () => {
        if(!editedItem.value.specificUnavailabilities) {
             editedItem.value.specificUnavailabilities = [];
        }
        editedItem.value.specificUnavailabilities.push({ startDate: '', endDate: '' });
    }

    const removeUnavailability = (index) => {
        editedItem.value.specificUnavailabilities.splice(index, 1);
    }

    const saveItem = async () => {
      if (!editedItem.value.firstName || !editedItem.value.lastName || !editedItem.value.email) {
          alert('Veuillez remplir les champs obligatoires.');
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
