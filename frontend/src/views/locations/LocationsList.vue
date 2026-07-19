<template>
  <v-container>
    <v-row class="mb-4">
      <v-col>
        <h2>Gestion des Lieux</h2>
      </v-col>
      <v-col class="text-right">
        <v-btn color="primary" @click="openCreateDialog">
          Ajouter un Lieu
        </v-btn>
      </v-col>
    </v-row>

    <v-data-table
      :headers="headers"
      :items="locations"
      :loading="loading"
      class="elevation-1"
    >
      <template v-slot:item.globalOpeningStart="{ item }">
        {{ formatTime(item.globalOpeningStart) }}
      </template>
      <template v-slot:item.globalOpeningEnd="{ item }">
        {{ formatTime(item.globalOpeningEnd) }}
      </template>
      <template v-slot:item.actions="{ item }">
        <v-icon
          small
          class="mr-2"
          @click="openEditDialog(item)"
        >
          mdi-pencil
        </v-icon>
        <v-icon
          small
          @click="deleteLocation(item)"
        >
          mdi-delete
        </v-icon>
      </template>
    </v-data-table>

    <v-dialog v-model="dialog" max-width="600px">
      <LocationForm
        :location="selectedLocation"
        @save="saveLocation"
        @cancel="closeDialog"
      />
    </v-dialog>
  </v-container>
</template>

<script>
import { useLocationStore } from '../../stores/locationStore';
import LocationForm from '../../components/locations/LocationForm.vue';
import { storeToRefs } from 'pinia';
import { onMounted, ref } from 'vue';

export default {
  components: {
    LocationForm,
  },
  setup() {
    const locationStore = useLocationStore();
    const { locations, loading } = storeToRefs(locationStore);

    const dialog = ref(false);
    const selectedLocation = ref(null);

    const headers = [
      { title: 'Nom', key: 'name' },
      { title: 'Capacité', key: 'capacity' },
      { title: 'Heure d\'ouverture', key: 'globalOpeningStart' },
      { title: 'Heure de fermeture', key: 'globalOpeningEnd' },
      { title: 'Actions', key: 'actions', sortable: false },
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
      locationStore.fetchLocations(); // Refresh list after save
    };

    const deleteLocation = async (item) => {
      if (confirm('Êtes-vous sûr de vouloir supprimer ce lieu ?')) {
        await locationStore.deleteLocation(item.documentId);
        locationStore.fetchLocations();
      }
    };

    const formatTime = (timeString) => {
      if (!timeString) return '';
      // Simple format assuming 'HH:mm:ss.SSSZ'
      return timeString.substring(0, 5);
    };

    return {
      locations,
      loading,
      headers,
      dialog,
      selectedLocation,
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
