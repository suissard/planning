<template>
  <v-card class="pa-2 border rounded-xl">
    <v-card-title class="d-flex align-center justify-space-between py-3 px-4">
      <span class="text-h6 font-weight-bold d-flex align-center ga-2">
        <span>📍</span> {{ location ? 'Modifier le Lieu' : 'Ajouter un Lieu' }}
      </span>
      <v-btn icon="mdi-close" variant="text" size="small" @click="$emit('cancel')"></v-btn>
    </v-card-title>

    <v-divider class="mb-4"></v-divider>

    <v-card-text>
      <v-form ref="form" v-model="valid">
        <v-text-field
          v-model="formData.name"
          :rules="[v => !!v || 'Le nom est requis']"
          label="Nom du lieu / Salle"
          prepend-inner-icon="mdi-format-title"
          variant="outlined"
          density="comfortable"
          required
          class="mb-3"
        ></v-text-field>

        <v-text-field
          v-model.number="formData.capacity"
          :rules="[
            v => !!v || 'La capacité est requise',
            v => v > 0 || 'La capacité doit être supérieure à 0'
          ]"
          label="Capacité d'accueil"
          type="number"
          prepend-inner-icon="mdi-account-group"
          variant="outlined"
          density="comfortable"
          required
          class="mb-3"
        ></v-text-field>

        <v-row class="mb-3">
          <v-col cols="6">
            <v-text-field
              v-model="formData.globalOpeningStart"
              label="Ouverture (ex: 08:00)"
              type="time"
              prepend-inner-icon="mdi-clock-outline"
              variant="outlined"
              density="comfortable"
              required
            ></v-text-field>
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model="formData.globalOpeningEnd"
              label="Fermeture (ex: 18:00)"
              type="time"
              prepend-inner-icon="mdi-clock-check-outline"
              variant="outlined"
              density="comfortable"
              required
            ></v-text-field>
          </v-col>
        </v-row>

        <v-textarea
          v-model="weeklyClosuresString"
          label="Fermetures hebdomadaires (Format JSON)"
          rows="2"
          prepend-inner-icon="mdi-calendar-sync"
          variant="outlined"
          density="comfortable"
          hint='Ex: [{"dayOfWeek": "Monday", "startTime": "12:00", "endTime": "14:00"}]'
          persistent-hint
          class="mb-3"
        ></v-textarea>

        <v-textarea
          v-model="specificClosuresString"
          label="Fermetures spécifiques (Format JSON)"
          rows="2"
          prepend-inner-icon="mdi-calendar-remove"
          variant="outlined"
          density="comfortable"
          hint='Ex: [{"startDate": "2026-12-25", "endDate": "2026-12-26", "reason": "Férié"}]'
          persistent-hint
        ></v-textarea>
      </v-form>
    </v-card-text>

    <v-card-actions class="px-4 pb-4">
      <v-spacer></v-spacer>
      <v-btn color="grey-lighten-1" variant="text" @click="$emit('cancel')" class="text-none">
        Annuler
      </v-btn>
      <v-btn color="primary" variant="flat" @click="save" :disabled="!valid" class="text-none px-5">
        Enregistrer
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import { ref, watch, onMounted } from 'vue';

export default {
  name: 'LocationForm',
  props: {
    location: {
      type: Object,
      default: null,
    },
  },
  emits: ['save', 'cancel'],
  setup(props, { emit }) {
    const valid = ref(false);
    const form = ref(null);

    const formData = ref({
      name: '',
      capacity: 1,
      globalOpeningStart: '08:00',
      globalOpeningEnd: '18:00',
    });

    const weeklyClosuresString = ref('[]');
    const specificClosuresString = ref('[]');

    const initForm = () => {
      if (props.location) {
        formData.value = {
          name: props.location.name,
          capacity: props.location.capacity,
          globalOpeningStart: props.location.globalOpeningStart ? props.location.globalOpeningStart.substring(0, 5) : '08:00',
          globalOpeningEnd: props.location.globalOpeningEnd ? props.location.globalOpeningEnd.substring(0, 5) : '18:00',
        };
        weeklyClosuresString.value = props.location.weeklyClosures ? JSON.stringify(props.location.weeklyClosures, null, 2) : '[]';
        specificClosuresString.value = props.location.specificClosures ? JSON.stringify(props.location.specificClosures, null, 2) : '[]';
      } else {
        formData.value = {
          name: '',
          capacity: 1,
          globalOpeningStart: '08:00',
          globalOpeningEnd: '18:00',
        };
        weeklyClosuresString.value = '[]';
        specificClosuresString.value = '[]';
      }
    };

    onMounted(initForm);
    watch(() => props.location, initForm);

    const save = () => {
      if (form.value && form.value.validate()) {
        try {
          const weeklyClosures = JSON.parse(weeklyClosuresString.value || '[]');
          const specificClosures = JSON.parse(specificClosuresString.value || '[]');

          const formattedData = {
            ...formData.value,
            globalOpeningStart: `${formData.value.globalOpeningStart}:00.000`,
            globalOpeningEnd: `${formData.value.globalOpeningEnd}:00.000`,
            weeklyClosures,
            specificClosures
          };
          emit('save', formattedData);
        } catch (e) {
          alert("Erreur de syntaxe JSON dans les fermetures. Veuillez corriger la syntaxe.");
        }
      }
    };

    return {
      valid,
      form,
      formData,
      weeklyClosuresString,
      specificClosuresString,
      save,
    };
  },
};
</script>
