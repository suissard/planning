<template>
  <div class="locations-view-container">
    <div class="d-flex justify-space-between align-center mb-4 flex-wrap ga-3">
      <div>
        <h2 class="text-h5 font-weight-bold d-flex align-center gap-2">
          <span>📍</span> Gestion des Lieux
        </h2>
        <p class="text-caption text-medium-emphasis">Configurez les salles, capacités d'accueil et plages d'ouverture</p>
      </div>

      <div class="d-flex align-center ga-3">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Rechercher un lieu..."
          single-line
          hide-details
          density="compact"
          variant="outlined"
          style="min-width: 220px;"
        ></v-text-field>

        <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog" class="text-none">
          Ajouter un Lieu
        </v-btn>
      </div>
    </div>

    <v-data-table
      :headers="headers"
      :items="locations"
      :loading="loading"
      :search="search"
      class="elevation-1 border rounded-lg"
    >
      <template v-slot:item.name="{ item }">
        <div class="d-flex align-center ga-2 font-weight-medium">
          <span class="text-primary">📍</span>
          {{ item.name }}
        </div>
      </template>

      <template v-slot:item.capacity="{ item }">
        <v-chip color="info" size="small" variant="tonal" class="font-weight-medium">
          👥 {{ item.capacity }} max
        </v-chip>
      </template>

      <template v-slot:item.globalOpeningStart="{ item }">
        <span class="text-subtitle-2">⏰ {{ formatTime(item.globalOpeningStart) }}</span>
      </template>

      <template v-slot:item.globalOpeningEnd="{ item }">
        <span class="text-subtitle-2">🏁 {{ formatTime(item.globalOpeningEnd) }}</span>
      </template>

      <template v-slot:item.actions="{ item }">
        <div class="d-flex ga-1">
          <v-btn
            icon="mdi-pencil"
            size="x-small"
            color="primary"
            variant="text"
            title="Modifier"
            @click="openEditDialog(item)"
          ></v-btn>
          <v-btn
            icon="mdi-delete"
            size="x-small"
            color="error"
            variant="text"
            title="Supprimer"
            @click="deleteLocation(item)"
          ></v-btn>
        </div>
      </template>
    </v-data-table>

    <v-dialog v-model="dialog" max-width="600px" persistent>
      <LocationForm
        :location="selectedLocation"
        @save="saveLocation"
        @cancel="closeDialog"
      />
    </v-dialog>
  </div>
</template>

<script>
import { useLocationStore } from '../../stores/locationStore';
import LocationForm from '../../components/locations/LocationForm.vue';
import { storeToRefs } from 'pinia';
import { onMounted, ref } from 'vue';

export default {
  name: 'LocationsList',
  components: {
    LocationForm,
  },
  setup() {
    const locationStore = useLocationStore();
    const { locations, loading } = storeToRefs(locationStore);

    const dialog = ref(false);
    const selectedLocation = ref(null);
    const search = ref('');

    const headers = [
      { title: 'Nom du lieu', key: 'name' },
      { title: 'Capacité d\'accueil', key: 'capacity' },
      { title: 'Ouverture', key: 'globalOpeningStart' },
      { title: 'Fermeture', key: 'globalOpeningEnd' },
      { title: 'Actions', key: 'actions', sortable: false, align: 'end' },
    ];

    onMounted(() => {
      locationStore.fetchLocations();
    });

    const openCreateDialog = () => {
      selectedLocation.value = null;
      dialog.value = true;
    };

    const openEditDialog = (item) => {
      selectedLocation.value = { ...item };
      dialog.value = true;
    };

    const closeDialog = () => {
      dialog.value = false;
      selectedLocation.value = null;
    };

    const saveLocation = async (locationData) => {
      if (selectedLocation.value) {
        await locationStore.updateLocation(selectedLocation.value.documentId, locationData);
      } else {
        await locationStore.addLocation(locationData);
      }
      closeDialog();
      locationStore.fetchLocations();
    };

    const deleteLocation = async (item) => {
      if (confirm(`Êtes-vous sûr de vouloir supprimer le lieu "${item.name}" ?`)) {
        await locationStore.deleteLocation(item.documentId);
        locationStore.fetchLocations();
      }
    };

    const formatTime = (timeString) => {
      if (!timeString) return '--:--';
      return timeString.substring(0, 5);
    };

    return {
      locations,
      loading,
      headers,
      dialog,
      selectedLocation,
      search,
      openCreateDialog,
      openEditDialog,
      closeDialog,
      saveLocation,
      deleteLocation,
      formatTime,
    };
  },
};
</script>

<style scoped>
.locations-view-container {
  padding: 0.5rem;
}
</style>
