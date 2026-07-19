<template>
  <v-card>
    <v-card-title>
      <span class="text-h5">{{ location ? 'Modifier le Lieu' : 'Ajouter un Lieu' }}</span>
    </v-card-title>

    <v-card-text>
      <v-form ref="form" v-model="valid">
        <v-text-field
          v-model="formData.name"
          :rules="[v => !!v || 'Le nom est requis']"
          label="Nom"
          required
        ></v-text-field>

        <v-text-field
          v-model.number="formData.capacity"
          :rules="[
            v => !!v || 'La capacité est requise',
            v => v > 0 || 'La capacité doit être supérieure à 0'
          ]"
          label="Capacité"
          type="number"
          required
        ></v-text-field>

        <v-row>
            <v-col cols="6">
                <v-text-field
                v-model="formData.globalOpeningStart"
                label="Heure d'ouverture (ex: 08:00)"
                type="time"
                required
                ></v-text-field>
            </v-col>
            <v-col cols="6">
                <v-text-field
                v-model="formData.globalOpeningEnd"
                label="Heure de fermeture (ex: 18:00)"
                type="time"
                required
                ></v-text-field>
            </v-col>
        </v-row>

        <v-textarea
          v-model="weeklyClosuresString"
          label="Fermetures hebdomadaires (JSON)"
          rows="3"
          hint="Exemple: [{ 'dayOfWeek': 'Monday', 'startTime': '12:00', 'endTime': '14:00' }]"
          persistent-hint
        ></v-textarea>

        <v-textarea
          v-model="specificClosuresString"
          label="Fermetures spécifiques (JSON)"
          rows="3"
          hint="Exemple: [{ 'startDate': '2023-12-25', 'endDate': '2023-12-26', 'reason': 'Noël' }]"
          persistent-hint
        ></v-textarea>
      </v-form>
    </v-card-text>

    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn color="blue darken-1" text @click="$emit('cancel')">Annuler</v-btn>
      <v-btn color="blue darken-1" text @click="save" :disabled="!valid">Enregistrer</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import { ref, watch, onMounted } from 'vue';

export default {
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
          // Extract time portion if it's a full time string
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
      if (form.value.validate()) {
        try {
          const weeklyClosures = JSON.parse(weeklyClosuresString.value);
          const specificClosures = JSON.parse(specificClosuresString.value);

          // Format time properly to include seconds and ms for Strapi Time field
          // Strapi 'time' type often expects HH:mm:ss.SSS format
          const formattedData = {
              ...formData.value,
              globalOpeningStart: `${formData.value.globalOpeningStart}:00.000`,
              globalOpeningEnd: `${formData.value.globalOpeningEnd}:00.000`,
              weeklyClosures,
              specificClosures
          };
          emit('save', formattedData);
        } catch (e) {
            // Use global error store here in a real app, or local alert
            alert("Erreur de syntaxe JSON dans les fermetures.");
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
