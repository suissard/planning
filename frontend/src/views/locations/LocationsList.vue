<template>
  <div class="locations-view-container">
    <div class="d-flex justify-space-between align-center mb-4 flex-wrap ga-3">
      <div>
        <h2 class="text-h5 font-weight-bold d-flex align-center ga-2">
          <span>📍</span> Gestion des Lieux
        </h2>
        <p class="text-caption text-medium-emphasis">Configurez les salles, capacités d'accueil, fermetures récurrentes et exceptionnelles</p>
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

        <v-btn v-if="isAdminMode" color="primary" prepend-icon="mdi-plus" @click="openCreateDialog" class="text-none font-weight-bold">
          Ajouter un Lieu
        </v-btn>
      </div>
    </div>

    <v-data-table
      :headers="headers"
      :items="displayLocations"
      :loading="loading"
      :search="search"
      class="elevation-1 border rounded-lg"
    >
      <template v-slot:item.name="{ item }">
        <div class="py-2">
          <div class="d-flex align-center ga-2 font-weight-bold text-subtitle-1">
            <span class="text-primary">📍</span>
            {{ item.name }}
          </div>
          <div v-if="item.address" class="d-flex align-center ga-1 text-caption text-medium-emphasis mt-1">
            <v-icon size="x-small" color="grey">mdi-map-marker-outline</v-icon>
            <span>{{ item.address }}</span>
          </div>
        </div>
      </template>

      <template v-slot:item.capacity="{ item }">
        <v-chip color="info" size="small" variant="tonal" class="font-weight-bold">
          👥 {{ item.capacity }} max
        </v-chip>
      </template>

      <template v-slot:item.hours="{ item }">
        <div class="d-flex align-center ga-1">
          <v-chip size="small" variant="outlined" color="teal" class="font-weight-medium">
            ⏰ {{ formatTime(item.globalOpeningStart) }} → {{ formatTime(item.globalOpeningEnd) }}
          </v-chip>
        </div>
      </template>

      <template v-slot:item.weeklyClosures="{ item }">
        <div class="d-flex flex-wrap ga-1 py-1">
          <template v-if="item.weeklyClosures && item.weeklyClosures.length > 0">
            <v-chip
              v-for="(wc, i) in formatWeeklyClosuresList(item.weeklyClosures).slice(0, 2)"
              :key="'wc-chip-' + i"
              size="x-small"
              color="amber"
              variant="tonal"
              class="font-weight-medium"
            >
              🚫 {{ wc }}
            </v-chip>
            <v-chip
              v-if="formatWeeklyClosuresList(item.weeklyClosures).length > 2"
              size="x-small"
              color="grey"
              variant="tonal"
              :title="formatWeeklyClosuresList(item.weeklyClosures).join(' | ')"
            >
              +{{ formatWeeklyClosuresList(item.weeklyClosures).length - 2 }}
            </v-chip>
          </template>
          <span v-else class="text-caption text-medium-emphasis">
            ✓ Ouvert en continu
          </span>
        </div>
      </template>

      <template v-slot:item.specificClosures="{ item }">
        <div class="d-flex flex-wrap ga-1 py-1">
          <template v-if="item.specificClosures && item.specificClosures.length > 0">
            <v-chip
              v-for="(sc, i) in formatSpecificClosuresList(item.specificClosures).slice(0, 2)"
              :key="'sc-chip-' + i"
              size="x-small"
              color="deep-orange"
              variant="tonal"
              class="font-weight-medium"
            >
              🏖️ {{ sc }}
            </v-chip>
            <v-chip
              v-if="formatSpecificClosuresList(item.specificClosures).length > 2"
              size="x-small"
              color="grey"
              variant="tonal"
              :title="formatSpecificClosuresList(item.specificClosures).join(' | ')"
            >
              +{{ formatSpecificClosuresList(item.specificClosures).length - 2 }}
            </v-chip>
          </template>
          <span v-else class="text-caption text-medium-emphasis">
            ✓ Aucune
          </span>
        </div>
      </template>

      <template v-slot:item.actions="{ item }">
        <div v-if="isAdminMode" class="d-flex ga-1">
          <v-btn
            icon="mdi-pencil"
            size="small"
            color="primary"
            variant="text"
            title="Modifier"
            @click="openEditDialog(item)"
          ></v-btn>
          <v-btn
            icon="mdi-delete"
            size="small"
            color="error"
            variant="text"
            title="Supprimer"
            @click="deleteLocation(item)"
          ></v-btn>
        </div>
      </template>
    </v-data-table>

    <v-dialog v-model="dialog" max-width="780px" persistent>
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
import { useAppSettingsStore } from '../../stores/appSettings';
import LocationForm from '../../components/locations/LocationForm.vue';
import { storeToRefs } from 'pinia';
import { onMounted, ref, computed } from 'vue';

export default {
  name: 'LocationsList',
  components: {
    LocationForm,
  },
  props: {
    customLocations: {
      type: Array,
      default: null
    }
  },
  setup(props) {
    const locationStore = useLocationStore();
    const appSettingsStore = useAppSettingsStore();
    const { locations, loading } = storeToRefs(locationStore);

    const dialog = ref(false);
    const selectedLocation = ref(null);
    const search = ref('');

    const isAdminMode = computed(() => appSettingsStore.isAdminMode);

    const displayLocations = computed(() => {
      if (props.customLocations) return props.customLocations;
      return locations.value;
    });

    const headers = computed(() => {
      const base = [
        { title: 'Nom du lieu', key: 'name' },
        { title: 'Capacité', key: 'capacity', align: 'center' },
        { title: 'Horaires généraux', key: 'hours', sortable: false },
        { title: 'Fermetures hebdo', key: 'weeklyClosures', sortable: false },
        { title: 'Fermetures exceptionnelles', key: 'specificClosures', sortable: false },
      ];
      if (isAdminMode.value) {
        base.push({ title: 'Actions', key: 'actions', sortable: false, align: 'end' });
      }
      return base;
    });

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

    const DAYS_FR_MAP = {
      'Monday': 'Lun', 'Tuesday': 'Mar', 'Wednesday': 'Mer', 'Thursday': 'Jeu', 'Friday': 'Ven', 'Saturday': 'Sam', 'Sunday': 'Dim',
      '1': 'Lun', '2': 'Mar', '3': 'Mer', '4': 'Jeu', '5': 'Ven', '6': 'Sam', '0': 'Dim'
    };

    const formatWeeklyClosuresList = (closures) => {
      if (!closures || !Array.isArray(closures)) return [];
      return closures.map(c => {
        if (typeof c === 'string' || typeof c === 'number') {
          return `${DAYS_FR_MAP[String(c)] || c} fermé`;
        }
        const day = DAYS_FR_MAP[c.dayOfWeek] || c.dayOfWeek || '';
        const start = (c.startTime || '').substring(0, 5);
        const end = (c.endTime || '').substring(0, 5);
        const reason = c.reason ? ` (${c.reason})` : '';
        if (start && end) return `${day} ${start}-${end}${reason}`;
        return `${day} fermé${reason}`;
      });
    };

    const formatSpecificClosuresList = (closures) => {
      if (!closures || !Array.isArray(closures)) return [];
      return closures.map(c => {
        try {
          const dStart = new Date(c.startDate);
          const dEnd = new Date(c.endDate);
          const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
          const reason = c.reason ? ` (${c.reason})` : '';
          return `${fmt(dStart)} au ${fmt(dEnd)}${reason}`;
        } catch (e) {
          return c.reason || 'Fermeture';
        }
      });
    };

    return {
      locations,
      displayLocations,
      loading,
      headers,
      dialog,
      selectedLocation,
      search,
      isAdminMode,
      openCreateDialog,
      openEditDialog,
      closeDialog,
      saveLocation,
      deleteLocation,
      formatTime,
      formatWeeklyClosuresList,
      formatSpecificClosuresList
    };
  },
};
</script>

<style scoped>
.locations-view-container {
  padding: 0.5rem;
}
</style>
