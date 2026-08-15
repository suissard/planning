<template>
  <v-card class="pa-3 border rounded-xl" max-height="90vh" style="display: flex; flex-direction: column; overflow: hidden;">
    <v-card-title class="d-flex align-center justify-space-between py-3 px-4 border-b">
      <div class="d-flex align-center ga-2">
        <span class="text-h6">📍</span>
        <span class="text-h6 font-weight-bold">{{ location ? 'Modifier le Lieu' : 'Ajouter un Lieu' }}</span>
      </div>
      <v-btn icon="mdi-close" variant="text" size="small" @click="$emit('cancel')"></v-btn>
    </v-card-title>

    <v-card-text style="overflow-y: auto; flex: 1; padding: 1.25rem;">
      <v-form ref="form" v-model="valid">
        <!-- Informations Générales -->
        <h4 class="text-subtitle-2 font-weight-bold text-uppercase text-medium-emphasis mb-3 d-flex align-center ga-2">
          <span>🏛️</span> Informations Générales
        </h4>

        <v-text-field
          v-model="formData.name"
          :rules="[v => !!v || 'Le nom du lieu est obligatoire']"
          label="Nom du lieu / Salle *"
          prepend-inner-icon="mdi-format-title"
          variant="outlined"
          density="comfortable"
          placeholder="Ex: Salle d'Atelier & Psychomotricité"
          required
          class="mb-3"
        ></v-text-field>

        <v-text-field
          v-model="formData.address"
          label="Adresse / Localisation"
          prepend-inner-icon="mdi-map-marker"
          variant="outlined"
          density="comfortable"
          placeholder="Ex: Bâtiment A - 1er Étage, Aile Sud"
          class="mb-3"
        ></v-text-field>

        <v-row class="mb-3">
          <v-col cols="12" sm="4">
            <v-text-field
              v-model.number="formData.capacity"
              :rules="[
                v => (v !== null && v !== undefined && v !== '') || 'Capacité requise',
                v => v > 0 || 'Doit être supérieure à 0'
              ]"
              label="Capacité d'accueil *"
              type="number"
              min="1"
              prepend-inner-icon="mdi-account-group"
              variant="outlined"
              density="comfortable"
              required
            ></v-text-field>
          </v-col>
          <v-col cols="6" sm="4">
            <v-text-field
              v-model="formData.globalOpeningStart"
              label="Ouverture globale *"
              type="time"
              prepend-inner-icon="mdi-clock-outline"
              variant="outlined"
              density="comfortable"
              required
            ></v-text-field>
          </v-col>
          <v-col cols="6" sm="4">
            <v-text-field
              v-model="formData.globalOpeningEnd"
              label="Fermeture globale *"
              type="time"
              prepend-inner-icon="mdi-clock-check-outline"
              variant="outlined"
              density="comfortable"
              required
            ></v-text-field>
          </v-col>
        </v-row>

        <v-divider class="my-4"></v-divider>

        <!-- FERMETURES HEBDOMADAIRES (RÉCURRENTES) -->
        <div class="mb-5">
          <div class="d-flex justify-space-between align-center flex-wrap ga-2 mb-2">
            <div>
              <h4 class="text-subtitle-1 font-weight-bold d-flex align-center ga-2">
                <span>🔄</span> Fermetures Hebdomadaires Récurrentes
              </h4>
              <p class="text-caption text-medium-emphasis">Ex: pauses méridiennes, indisponibilités régulières chaque semaine</p>
            </div>
            <v-btn
              color="primary"
              size="small"
              variant="tonal"
              prepend-icon="mdi-plus"
              @click="addWeeklyClosure"
              class="text-none"
            >
              Ajouter une fermeture
            </v-btn>
          </div>

          <!-- Quick Presets -->
          <div class="d-flex align-center flex-wrap ga-2 mb-3 pa-2 rounded-lg" style="background: rgba(255, 255, 255, 0.03); border: 1px dashed rgba(255, 255, 255, 0.1);">
            <span class="text-caption font-weight-bold text-medium-emphasis">⚡ Raccourcis :</span>
            <v-chip size="small" variant="outlined" color="primary" class="clickable" @click="presetLunchBreak">
              🍽️ Pause déj. (Lun-Ven 12h-14h)
            </v-chip>
            <v-chip size="small" variant="outlined" color="amber" class="clickable" @click="presetWeekendClosed">
              🚫 Fermé Samedi & Dimanche
            </v-chip>
            <v-chip size="small" variant="outlined" color="teal" class="clickable" @click="presetWedAfternoon">
              🧹 Mercredi après-midi (13h-18h)
            </v-chip>
          </div>

          <!-- Empty weekly closures -->
          <div v-if="weeklyClosures.length === 0" class="pa-3 text-center rounded-lg text-caption text-medium-emphasis" style="background: rgba(0, 0, 0, 0.15); border: 1px solid rgba(255, 255, 255, 0.05);">
            ✅ Aucune fermeture hebdomadaire récurrente (ouvert en continu selon les horaires généraux).
          </div>

          <!-- Weekly closures list -->
          <div v-else class="d-flex flex-column ga-2">
            <div
              v-for="(wc, index) in weeklyClosures"
              :key="'wc-' + index"
              class="pa-3 rounded-lg border d-flex flex-wrap align-center justify-space-between ga-2"
              style="background: rgba(15, 23, 42, 0.5);"
            >
              <div class="d-flex align-center flex-wrap ga-2 flex-grow-1">
                <!-- Day selector -->
                <v-select
                  v-model="wc.dayOfWeek"
                  :items="daysOfWeekOptions"
                  item-title="label"
                  item-value="value"
                  label="Jour"
                  density="compact"
                  variant="outlined"
                  hide-details
                  style="min-width: 140px; max-width: 170px;"
                ></v-select>

                <!-- Start & End time -->
                <div class="d-flex align-center ga-1">
                  <v-text-field
                    v-model="wc.startTime"
                    label="Fermé de"
                    type="time"
                    density="compact"
                    variant="outlined"
                    hide-details
                    style="width: 110px;"
                  ></v-text-field>
                  <span class="text-caption text-medium-emphasis">à</span>
                  <v-text-field
                    v-model="wc.endTime"
                    label="jusqu'à"
                    type="time"
                    density="compact"
                    variant="outlined"
                    hide-details
                    style="width: 110px;"
                  ></v-text-field>
                </div>

                <!-- Reason / Label -->
                <v-text-field
                  v-model="wc.reason"
                  label="Motif (optionnel)"
                  placeholder="Ex: Pause déjeuner, Entretien"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="flex-grow-1"
                  style="min-width: 160px;"
                ></v-text-field>
              </div>

              <!-- Delete closure button -->
              <v-btn
                icon="mdi-trash-can-outline"
                size="small"
                color="error"
                variant="text"
                title="Supprimer cette fermeture"
                @click="removeWeeklyClosure(index)"
              ></v-btn>
            </div>
          </div>
        </div>

        <v-divider class="my-4"></v-divider>

        <!-- FERMETURES SPÉCIFIQUES & EXCEPTIONNELLES -->
        <div>
          <div class="d-flex justify-space-between align-center flex-wrap ga-2 mb-2">
            <div>
              <h4 class="text-subtitle-1 font-weight-bold d-flex align-center ga-2">
                <span>📅</span> Fermetures Spécifiques & Exceptionnelles
              </h4>
              <p class="text-caption text-medium-emphasis">Ex: jours fériés, congés annuels, travaux de réfection</p>
            </div>
            <v-btn
              color="secondary"
              size="small"
              variant="tonal"
              prepend-icon="mdi-plus"
              @click="addSpecificClosure"
              class="text-none"
            >
              Ajouter une date
            </v-btn>
          </div>

          <!-- Quick Presets -->
          <div class="d-flex align-center flex-wrap ga-2 mb-3 pa-2 rounded-lg" style="background: rgba(255, 255, 255, 0.03); border: 1px dashed rgba(255, 255, 255, 0.1);">
            <span class="text-caption font-weight-bold text-medium-emphasis">⚡ Modèles rapides :</span>
            <v-chip size="small" variant="outlined" color="warning" class="clickable" @click="presetHolidayClosure">
              🎉 Jour Férié (1 jour)
            </v-chip>
            <v-chip size="small" variant="outlined" color="info" class="clickable" @click="presetRenovationClosure">
              🛠️ Travaux & Entretien (3 jours)
            </v-chip>
            <v-chip size="small" variant="outlined" color="purple" class="clickable" @click="presetAnnualClosure">
              🏖️ Fermeture estivale (2 semaines)
            </v-chip>
          </div>

          <!-- Empty specific closures -->
          <div v-if="specificClosures.length === 0" class="pa-3 text-center rounded-lg text-caption text-medium-emphasis" style="background: rgba(0, 0, 0, 0.15); border: 1px solid rgba(255, 255, 255, 0.05);">
            ✅ Aucune fermeture exceptionnelle programmée.
          </div>

          <!-- Specific closures list -->
          <div v-else class="d-flex flex-column ga-2">
            <div
              v-for="(sc, index) in specificClosures"
              :key="'sc-' + index"
              class="pa-3 rounded-lg border d-flex flex-wrap align-center justify-space-between ga-2"
              style="background: rgba(15, 23, 42, 0.5);"
            >
              <div class="d-flex align-center flex-wrap ga-2 flex-grow-1">
                <!-- Start date -->
                <v-text-field
                  v-model="sc.startDate"
                  label="Date / Heure début"
                  type="datetime-local"
                  density="compact"
                  variant="outlined"
                  hide-details
                  style="min-width: 190px;"
                ></v-text-field>

                <span class="text-caption text-medium-emphasis">au</span>

                <!-- End date -->
                <v-text-field
                  v-model="sc.endDate"
                  label="Date / Heure fin"
                  type="datetime-local"
                  density="compact"
                  variant="outlined"
                  hide-details
                  style="min-width: 190px;"
                ></v-text-field>

                <!-- Reason / Label -->
                <v-text-field
                  v-model="sc.reason"
                  label="Motif / Raison"
                  placeholder="Ex: Jour Férié, Travaux, Fermeture"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="flex-grow-1"
                  style="min-width: 180px;"
                ></v-text-field>
              </div>

              <!-- Delete closure button -->
              <v-btn
                icon="mdi-trash-can-outline"
                size="small"
                color="error"
                variant="text"
                title="Supprimer cette fermeture"
                @click="removeSpecificClosure(index)"
              ></v-btn>
            </div>
          </div>
        </div>

      </v-form>
    </v-card-text>

    <v-divider></v-divider>

    <v-card-actions class="px-4 py-3 justify-space-between">
      <span class="text-caption text-medium-emphasis">
        {{ weeklyClosures.length }} fermeture(s) hebdo • {{ specificClosures.length }} fermeture(s) exceptionnelle(s)
      </span>
      <div class="d-flex ga-2">
        <v-btn color="grey-lighten-1" variant="text" @click="$emit('cancel')" class="text-none">
          Annuler
        </v-btn>
        <v-btn color="primary" variant="flat" @click="save" :disabled="!valid" class="text-none px-5">
          💾 Enregistrer le lieu
        </v-btn>
      </div>
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
      address: '',
      capacity: 10,
      globalOpeningStart: '08:00',
      globalOpeningEnd: '18:00',
    });

    const weeklyClosures = ref([]);
    const specificClosures = ref([]);

    const daysOfWeekOptions = [
      { label: 'Lundi', value: 'Monday' },
      { label: 'Mardi', value: 'Tuesday' },
      { label: 'Mercredi', value: 'Wednesday' },
      { label: 'Jeudi', value: 'Thursday' },
      { label: 'Vendredi', value: 'Friday' },
      { label: 'Samedi', value: 'Saturday' },
      { label: 'Dimanche', value: 'Sunday' },
    ];

    const dayNameNormalization = {
      '1': 'Monday', 'lundi': 'Monday', 'mon': 'Monday', 'monday': 'Monday',
      '2': 'Tuesday', 'mardi': 'Tuesday', 'tue': 'Tuesday', 'tuesday': 'Tuesday',
      '3': 'Wednesday', 'mercredi': 'Wednesday', 'wed': 'Wednesday', 'wednesday': 'Wednesday',
      '4': 'Thursday', 'jeudi': 'Thursday', 'thu': 'Thursday', 'thursday': 'Thursday',
      '5': 'Friday', 'vendredi': 'Friday', 'fri': 'Friday', 'friday': 'Friday',
      '6': 'Saturday', 'samedi': 'Saturday', 'sat': 'Saturday', 'saturday': 'Saturday',
      '0': 'Sunday', '7': 'Sunday', 'dimanche': 'Sunday', 'sun': 'Sunday', 'sunday': 'Sunday',
    };

    const normalizeDay = (day) => {
      if (!day) return 'Monday';
      const key = String(day).toLowerCase().trim();
      return dayNameNormalization[key] || 'Monday';
    };

    const formatIsoForInput = (isoString) => {
      if (!isoString) return '';
      try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return '';
        // Format to YYYY-MM-DDTHH:mm
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } catch (e) {
        return '';
      }
    };

    const initForm = () => {
      if (props.location) {
        formData.value = {
          name: props.location.name || '',
          address: props.location.address || '',
          capacity: props.location.capacity || 10,
          globalOpeningStart: props.location.globalOpeningStart ? props.location.globalOpeningStart.substring(0, 5) : '08:00',
          globalOpeningEnd: props.location.globalOpeningEnd ? props.location.globalOpeningEnd.substring(0, 5) : '18:00',
        };

        // Parse weekly closures
        const rawWeekly = props.location.weeklyClosures || [];
        if (Array.isArray(rawWeekly)) {
          weeklyClosures.value = rawWeekly.map(item => {
            if (typeof item === 'string' || typeof item === 'number') {
              return {
                dayOfWeek: normalizeDay(item),
                startTime: '08:00',
                endTime: '18:00',
                reason: 'Fermeture hebd.'
              };
            }
            return {
              dayOfWeek: normalizeDay(item.dayOfWeek || item.day),
              startTime: item.startTime ? item.startTime.substring(0, 5) : '12:00',
              endTime: item.endTime ? item.endTime.substring(0, 5) : '14:00',
              reason: item.reason || ''
            };
          });
        } else {
          weeklyClosures.value = [];
        }

        // Parse specific closures
        const rawSpecific = props.location.specificClosures || [];
        if (Array.isArray(rawSpecific)) {
          specificClosures.value = rawSpecific.map(item => ({
            startDate: formatIsoForInput(item.startDate),
            endDate: formatIsoForInput(item.endDate),
            reason: item.reason || ''
          }));
        } else {
          specificClosures.value = [];
        }

      } else {
        formData.value = {
          name: '',
          address: '',
          capacity: 10,
          globalOpeningStart: '08:00',
          globalOpeningEnd: '18:00',
        };
        weeklyClosures.value = [];
        specificClosures.value = [];
      }
    };

    onMounted(initForm);
    watch(() => props.location, initForm);

    // Weekly closures actions
    const addWeeklyClosure = () => {
      weeklyClosures.value.push({
        dayOfWeek: 'Monday',
        startTime: '12:00',
        endTime: '14:00',
        reason: 'Pause déjeuner'
      });
    };

    const removeWeeklyClosure = (index) => {
      weeklyClosures.value.splice(index, 1);
    };

    const presetLunchBreak = () => {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      days.forEach(day => {
        const exists = weeklyClosures.value.some(wc => wc.dayOfWeek === day && wc.startTime === '12:00' && wc.endTime === '14:00');
        if (!exists) {
          weeklyClosures.value.push({
            dayOfWeek: day,
            startTime: '12:00',
            endTime: '14:00',
            reason: 'Pause déjeuner'
          });
        }
      });
    };

    const presetWeekendClosed = () => {
      const days = ['Saturday', 'Sunday'];
      days.forEach(day => {
        const exists = weeklyClosures.value.some(wc => wc.dayOfWeek === day && wc.reason.includes('Week-end'));
        if (!exists) {
          weeklyClosures.value.push({
            dayOfWeek: day,
            startTime: '08:00',
            endTime: '18:00',
            reason: 'Fermé le week-end'
          });
        }
      });
    };

    const presetWedAfternoon = () => {
      weeklyClosures.value.push({
        dayOfWeek: 'Wednesday',
        startTime: '13:00',
        endTime: '18:00',
        reason: 'Entretien & Nettoyage'
      });
    };

    // Specific closures actions
    const addSpecificClosure = () => {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const startStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T08:00`;
      const endStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T18:00`;
      specificClosures.value.push({
        startDate: startStr,
        endDate: endStr,
        reason: 'Fermeture exceptionnelle'
      });
    };

    const removeSpecificClosure = (index) => {
      specificClosures.value.splice(index, 1);
    };

    const presetHolidayClosure = () => {
      const year = new Date().getFullYear();
      specificClosures.value.push({
        startDate: `${year}-12-25T00:00`,
        endDate: `${year}-12-25T23:59`,
        reason: 'Jour Férié - Noël'
      });
    };

    const presetRenovationClosure = () => {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const endRenov = new Date(now.getFullYear(), now.getMonth() + 1, 4);
      specificClosures.value.push({
        startDate: `${nextMonth.getFullYear()}-${pad(nextMonth.getMonth() + 1)}-${pad(nextMonth.getDate())}T08:00`,
        endDate: `${endRenov.getFullYear()}-${pad(endRenov.getMonth() + 1)}-${pad(endRenov.getDate())}T18:00`,
        reason: 'Travaux de rénovation & Peinture'
      });
    };

    const presetAnnualClosure = () => {
      const year = new Date().getFullYear();
      specificClosures.value.push({
        startDate: `${year}-08-01T00:00`,
        endDate: `${year}-08-15T23:59`,
        reason: 'Fermeture estivale annuelle'
      });
    };

    const save = () => {
      if (form.value && form.value.validate()) {
        const formattedWeekly = weeklyClosures.value
          .filter(wc => wc.dayOfWeek && wc.startTime && wc.endTime)
          .map(wc => ({
            dayOfWeek: wc.dayOfWeek,
            startTime: wc.startTime.length === 5 ? `${wc.startTime}:00.000` : wc.startTime,
            endTime: wc.endTime.length === 5 ? `${wc.endTime}:00.000` : wc.endTime,
            reason: wc.reason || ''
          }));

        const formattedSpecific = specificClosures.value
          .filter(sc => sc.startDate && sc.endDate)
          .map(sc => ({
            startDate: new Date(sc.startDate).toISOString(),
            endDate: new Date(sc.endDate).toISOString(),
            reason: sc.reason || ''
          }));

        const formattedData = {
          name: formData.value.name,
          address: formData.value.address,
          capacity: parseInt(formData.value.capacity) || 1,
          globalOpeningStart: `${formData.value.globalOpeningStart}:00.000`,
          globalOpeningEnd: `${formData.value.globalOpeningEnd}:00.000`,
          weeklyClosures: formattedWeekly,
          specificClosures: formattedSpecific
        };

        emit('save', formattedData);
      }
    };

    return {
      valid,
      form,
      formData,
      weeklyClosures,
      specificClosures,
      daysOfWeekOptions,
      addWeeklyClosure,
      removeWeeklyClosure,
      presetLunchBreak,
      presetWeekendClosed,
      presetWedAfternoon,
      addSpecificClosure,
      removeSpecificClosure,
      presetHolidayClosure,
      presetRenovationClosure,
      presetAnnualClosure,
      save,
    };
  },
};
</script>

<style scoped>
.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}
.clickable:hover {
  transform: translateY(-1px);
  filter: brightness(1.15);
}
</style>
