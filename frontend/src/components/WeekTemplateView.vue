<template>
  <div class="week-template-root">
    <!-- ════════════════ TOP HEADER BAR ════════════════ -->
    <div class="view-header">
      <div class="header-main">
        <div class="header-title-wrapper">
          <div class="header-icon-box">⚡</div>
          <div>
            <div class="title-with-pill">
              <h2>Configuration de la Semaine Type</h2>
              <span class="mode-tag-pill">Modèle Récurrent</span>
              <span v-if="templateStore.isDirty" class="unsaved-pill">● Non enregistré</span>
            </div>
            <p class="subtitle">
              Définissez les ouvertures récurrentes de salles et les gestionnaires référents par jour. Ce modèle est enregistré en base de données et sert au remplissage automatique du planning.
            </p>
          </div>
        </div>

        <!-- ACTION BUTTONS -->
        <div class="header-actions">
          <button 
            type="button" 
            class="action-btn secondary-btn" 
            @click="$emit('navigate', 'room-sessions')"
            title="Revenir au planning des ouvertures"
          >
            🚪 Retour Planning
          </button>

          <button 
            type="button" 
            class="action-btn reset-btn" 
            @click="confirmResetDefaults"
            :disabled="templateStore.saving"
            title="Réinitialiser aux valeurs par défaut"
          >
            🔄 Par défaut
          </button>

          <button 
            type="button" 
            class="action-btn apply-btn" 
            @click="openApplyModal"
            title="Appliquer ce modèle sur une période du planning"
          >
            ⚡ Remplir le Planning...
          </button>

          <button 
            type="button" 
            class="action-btn save-btn" 
            :class="{ 'pulse-btn': templateStore.isDirty }"
            @click="saveTemplate" 
            :disabled="templateStore.saving"
            title="Enregistrer la semaine type en base de données"
          >
            <span v-if="templateStore.saving">💾 Enregistrement...</span>
            <span v-else>💾 Enregistrer en Base</span>
          </button>
        </div>
      </div>

      <!-- TOOLBAR & VIEW SWITCHER -->
      <div class="header-toolbar-row">
        <!-- Summary metrics -->
        <div class="template-metrics-row">
          <div class="t-metric">
            <span class="t-metric-label">Ouvertures hebdomadaires :</span>
            <strong class="t-metric-val">{{ totalActiveOpenings }} créneaux / sem.</strong>
          </div>
          <div class="t-metric-divider"></div>
          <div class="t-metric">
            <span class="t-metric-label">Jours avec ouvertures :</span>
            <strong class="t-metric-val">{{ activeDaysCount }} / 7 jours</strong>
          </div>
          <div class="t-metric-divider"></div>
          <div class="t-metric">
            <span class="t-metric-label">Salles configurées :</span>
            <strong class="t-metric-val">{{ locations.length }} salles</strong>
          </div>
        </div>

        <!-- View Switcher -->
        <div class="view-switcher-pill">
          <button 
            type="button"
            class="view-pill-btn" 
            :class="{ active: currentViewTab === 'day-by-day' }" 
            @click="currentViewTab = 'day-by-day'"
          >
            📅 Vue par Jour
          </button>
          <button 
            type="button"
            class="view-pill-btn" 
            :class="{ active: currentViewTab === 'matrix' }" 
            @click="currentViewTab = 'matrix'"
          >
            🗓️ Matrice Hebdomadaire
          </button>
        </div>
      </div>
    </div>

    <!-- ════════════════ MAIN CONTENT ════════════════ -->
    <div class="week-template-body" v-if="!templateStore.loading">
      
      <!-- ────────────────── VUE 1 : PAR JOUR (DÉTAILLÉE) ────────────────── -->
      <div v-if="currentViewTab === 'day-by-day'" class="day-view-container">
        <!-- Day Navigation Tabs -->
        <div class="day-tabs-nav">
          <button 
            v-for="d in daysList" 
            :key="d.id"
            type="button"
            class="day-tab-btn"
            :class="{ 
              active: selectedDay === d.id,
              'has-openings': getDayOpeningsCount(d.id) > 0,
              'weekend': d.id >= 6
            }"
            @click="selectedDay = d.id"
          >
            <div class="day-tab-inner">
              <span class="day-tab-name">{{ d.name }}</span>
              <span class="day-tab-count-badge" :class="{ 'zero-count': getDayOpeningsCount(d.id) === 0 }">
                {{ getDayOpeningsCount(d.id) }} salle(s)
              </span>
            </div>
          </button>
        </div>

        <!-- Day Header & Quick Actions -->
        <div class="selected-day-header">
          <div class="day-header-info">
            <h3>{{ getSelectedDayName() }}</h3>
            <p class="day-header-sub">
              {{ getDayOpeningsCount(selectedDay) }} salle(s) ouverte(s) programmée(s) chaque {{ getSelectedDayName() }}.
            </p>
          </div>

          <div class="day-quick-actions">
            <button 
              type="button" 
              class="mini-action-btn copy-btn" 
              @click="openCopyModal(selectedDay)"
              title="Dupliquer la configuration de ce jour"
            >
              📋 Dupliquer ce jour...
            </button>
            <button 
              type="button" 
              class="mini-action-btn open-all-btn" 
              @click="setAllRoomsForDay(selectedDay, true)"
              title="Ouvrir toutes les salles ce jour"
            >
              ✅ Tout ouvrir
            </button>
            <button 
              type="button" 
              class="mini-action-btn close-all-btn" 
              @click="setAllRoomsForDay(selectedDay, false)"
              title="Fermer toutes les salles ce jour"
            >
              ❌ Tout fermer
            </button>
          </div>
        </div>

        <!-- Rooms Cards Grid for Selected Day -->
        <div class="day-rooms-grid">
          <div 
            v-for="loc in locations" 
            :key="loc.documentId || loc.id"
            class="room-card"
            :class="{ 'room-active': isRoomActive(selectedDay, loc), 'room-inactive': !isRoomActive(selectedDay, loc) }"
          >
            <!-- Card Top Header -->
            <div class="room-card-header">
              <div class="room-title-area">
                <span class="room-icon">🚪</span>
                <div>
                  <h4 class="room-name">📍 {{ loc.name }}</h4>
                  <span class="room-meta">Capacité max : {{ loc.capacity || 10 }} pers.</span>
                </div>
              </div>

              <!-- Open / Closed Switch -->
              <label class="toggle-switch-wrapper" :title="isRoomActive(selectedDay, loc) ? 'Salle ouverte ce jour' : 'Salle fermée ce jour'">
                <input 
                  type="checkbox" 
                  :checked="isRoomActive(selectedDay, loc)"
                  @change="toggleRoomActive(selectedDay, loc, $event.target.checked)"
                />
                <span class="slider round"></span>
                <span class="toggle-label">{{ isRoomActive(selectedDay, loc) ? 'Ouverte' : 'Fermée' }}</span>
              </label>
            </div>

            <!-- Card Body (Only active if room is open) -->
            <div class="room-card-body" :class="{ disabled: !isRoomActive(selectedDay, loc) }">
              <!-- Manager Selector -->
              <div class="form-group-field">
                <label class="field-label">
                  <span>👨‍💼 Gestionnaire Référent habituel</span>
                  <span v-if="!getRoomManager(selectedDay, loc)" class="req-warn">⚠️ Non assigné</span>
                </label>
                <div class="select-with-avatar">
                  <select 
                    class="form-select modern-select"
                    :value="getRoomManagerId(selectedDay, loc)"
                    @change="setRoomManager(selectedDay, loc, $event.target.value)"
                    :disabled="!isRoomActive(selectedDay, loc)"
                  >
                    <option value="">-- Aucun gestionnaire désigné --</option>
                    <option v-for="fac in facilitators" :key="fac.documentId || fac.id" :value="fac.documentId || fac.id">
                      👤 {{ fac.firstName }} {{ fac.lastName }}
                    </option>
                  </select>
                </div>
              </div>

              <!-- Notes field -->
              <div class="form-group-field">
                <label class="field-label">📝 Consigne / Note récurrente (optionnel)</label>
                <input 
                  type="text" 
                  class="form-input text-input"
                  placeholder="Ex : Activité libre, groupe du matin..."
                  :value="getRoomNotes(selectedDay, loc)"
                  @input="setRoomNotes(selectedDay, loc, $event.target.value)"
                  :disabled="!isRoomActive(selectedDay, loc)"
                />
              </div>

              <!-- Beneficiaries count info -->
              <div class="room-part-info">
                <div class="part-count-line">
                  <span class="part-label">👥 Bénéficiaires habituels :</span>
                  <span class="part-badge">{{ getRoomParticipants(selectedDay, loc).length }} inscrit(s)</span>
                </div>
                <button 
                  type="button" 
                  class="manage-parts-btn"
                  @click="openParticipantsModal(selectedDay, loc)"
                  :disabled="!isRoomActive(selectedDay, loc)"
                >
                  ⚙️ Gérer la liste des bénéficiaires
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ────────────────── VUE 2 : MATRICE HEBDOMADAIRE (TABLEAU GLOBAL) ────────────────── -->
      <div v-else-if="currentViewTab === 'matrix'" class="matrix-view-container">
        <div class="matrix-info-banner">
          <span class="banner-icon">ℹ️</span>
          <span>Aperçu global de toute la semaine type. Vous pouvez activer/désactiver directement les salles et choisir les gestionnaires référents.</span>
        </div>

        <div class="matrix-table-wrapper">
          <table class="week-matrix-table">
            <thead>
              <tr>
                <th class="loc-col-header">📍 Salle / Lieu</th>
                <th v-for="d in daysList" :key="d.id" class="day-col-header" :class="{ 'weekend-header': d.id >= 6 }">
                  <div class="day-col-title">
                    <span>{{ d.name }}</span>
                    <span class="day-col-sub">{{ getDayOpeningsCount(d.id) }} ouv.</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="loc in locations" :key="loc.documentId || loc.id">
                <td class="loc-name-cell">
                  <strong>📍 {{ loc.name }}</strong>
                  <small class="loc-cap">Cap. {{ loc.capacity || 10 }}</small>
                </td>

                <td 
                  v-for="d in daysList" 
                  :key="d.id" 
                  class="matrix-slot-cell"
                  :class="{ 
                    'active-slot': isRoomActive(d.id, loc),
                    'inactive-slot': !isRoomActive(d.id, loc),
                    'weekend-slot': d.id >= 6
                  }"
                >
                  <div class="matrix-cell-content">
                    <label class="matrix-checkbox-label">
                      <input 
                        type="checkbox" 
                        :checked="isRoomActive(d.id, loc)"
                        @change="toggleRoomActive(d.id, loc, $event.target.checked)"
                      />
                      <span class="slot-status-pill">{{ isRoomActive(d.id, loc) ? 'Ouvert' : 'Fermé' }}</span>
                    </label>

                    <select 
                      v-if="isRoomActive(d.id, loc)"
                      class="mini-matrix-select"
                      :value="getRoomManagerId(d.id, loc)"
                      @change="setRoomManager(d.id, loc, $event.target.value)"
                    >
                      <option value="">-- Sans réf. --</option>
                      <option v-for="fac in facilitators" :key="fac.documentId || fac.id" :value="fac.documentId || fac.id">
                        {{ fac.firstName }} {{ fac.lastName }}
                      </option>
                    </select>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else class="loading-state">
      <div class="spinner"></div>
      <p>Chargement de la semaine type...</p>
    </div>

    <!-- ════════════════ MODAL 1 : DUPLICATION D'UN JOUR ════════════════ -->
    <div v-if="showCopyModal" class="modal-backdrop" @click.self="showCopyModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-title-box">
            <span class="modal-icon">📋</span>
            <div>
              <h3>Dupliquer la configuration</h3>
              <p class="modal-sub">Copiez les salles et gestionnaires du <strong>{{ daysList.find(d => d.id === copySourceDay)?.name }}</strong> vers d'autres jours.</p>
            </div>
          </div>
          <button type="button" class="close-btn" @click="showCopyModal = false">✕</button>
        </div>

        <div class="modal-form">
          <div class="copy-targets-section">
            <label class="form-label">Sélectionnez les jours cibles :</label>
            <div class="target-days-grid">
              <label 
                v-for="d in daysList" 
                :key="d.id" 
                class="target-day-chip"
                :class="{ 
                  selected: copyTargetDays.includes(d.id),
                  disabled: d.id === copySourceDay 
                }"
              >
                <input 
                  type="checkbox" 
                  :value="d.id" 
                  v-model="copyTargetDays"
                  :disabled="d.id === copySourceDay"
                />
                <span>{{ d.name }}</span>
              </label>
            </div>

            <div class="quick-target-buttons">
              <button type="button" class="tag-btn" @click="setWorkDaysTarget">Jours ouvrés (Lun - Ven)</button>
              <button type="button" class="tag-btn" @click="setAllDaysTarget">Tous les jours</button>
              <button type="button" class="tag-btn" @click="copyTargetDays = []">Tout décocher</button>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="secondary-btn" @click="showCopyModal = false">Annuler</button>
            <button 
              type="button" 
              class="action-btn primary-btn" 
              @click="applyDayDuplication"
              :disabled="copyTargetDays.length === 0"
            >
              📋 Dupliquer vers {{ copyTargetDays.length }} jour(s)
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════ MODAL 2 : GESTION DES BÉNÉFICIAIRES DU MODÈLE ════════════════ -->
    <div v-if="showPartsModal" class="modal-backdrop" @click.self="showPartsModal = false">
      <div class="modal-card modal-lg">
        <div class="modal-header">
          <div class="modal-title-box">
            <span class="modal-icon">👥</span>
            <div>
              <h3>Bénéficiaires récurrents</h3>
              <p class="modal-sub">
                {{ activePartsModalDayName }} — 📍 {{ activePartsModalLocName }}
              </p>
            </div>
          </div>
          <button type="button" class="close-btn" @click="showPartsModal = false">✕</button>
        </div>

        <div class="modal-form">
          <div class="parts-search-bar">
            <input 
              type="text" 
              v-model="participantSearch" 
              placeholder="🔍 Rechercher un bénéficiaire par nom ou prénom..."
              class="form-input search-box-input"
            />
          </div>

          <div class="parts-selection-grid">
            <label 
              v-for="part in filteredParticipants" 
              :key="part.documentId || part.id"
              class="participant-check-card"
              :class="{ selected: isParticipantSelected(part) }"
            >
              <input 
                type="checkbox" 
                :checked="isParticipantSelected(part)"
                @change="toggleParticipantSelection(part, $event.target.checked)"
              />
              <div class="part-card-info">
                <strong class="part-name">{{ part.lastName }} {{ part.firstName }}</strong>
                <span class="part-email">{{ part.email }}</span>
              </div>
            </label>
          </div>

          <div class="modal-actions">
            <span class="selected-parts-count">{{ activeModalSelectedParts.length }} bénéficiaire(s) sélectionné(s)</span>
            <button type="button" class="action-btn primary-btn" @click="saveParticipantsModal">
              Valider la liste
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════ MODAL 3 : REMPLISSAGE AUTOMATIQUE DU PLANNING ════════════════ -->
    <div v-if="showApplyModal" class="modal-backdrop" @click.self="showApplyModal = false">
      <div class="modal-card modal-lg">
        <div class="modal-header">
          <div class="modal-title-box">
            <span class="modal-icon">⚡</span>
            <div>
              <h3>Remplissage Automatique par Semaine Type</h3>
              <p class="modal-sub">Générez automatiquement les ouvertures de salles sur le planning selon ce modèle enregistré.</p>
            </div>
          </div>
          <button type="button" class="close-btn" @click="showApplyModal = false">✕</button>
        </div>

        <div class="modal-form">
          <!-- 1. Période cible -->
          <div class="template-section">
            <h4>1. Période cible d'application</h4>
            
            <div class="template-period-options">
              <label class="radio-card" :class="{ active: applyPeriodPreset === 'current-week' }">
                <input type="radio" value="current-week" v-model="applyPeriodPreset" @change="onPeriodPresetChange" />
                <span class="radio-title">📅 Cette semaine</span>
                <span class="radio-desc">{{ formatPresetDates('current-week') }}</span>
              </label>

              <label class="radio-card" :class="{ active: applyPeriodPreset === 'next-week' }">
                <input type="radio" value="next-week" v-model="applyPeriodPreset" @change="onPeriodPresetChange" />
                <span class="radio-title">📆 Semaine prochaine</span>
                <span class="radio-desc">{{ formatPresetDates('next-week') }}</span>
              </label>

              <label class="radio-card" :class="{ active: applyPeriodPreset === 'current-month' }">
                <input type="radio" value="current-month" v-model="applyPeriodPreset" @change="onPeriodPresetChange" />
                <span class="radio-title">🗓️ Tout ce mois-ci</span>
                <span class="radio-desc">{{ formatPresetDates('current-month') }}</span>
              </label>

              <label class="radio-card" :class="{ active: applyPeriodPreset === 'next-month' }">
                <input type="radio" value="next-month" v-model="applyPeriodPreset" @change="onPeriodPresetChange" />
                <span class="radio-title">🗓️ Le mois prochain</span>
                <span class="radio-desc">{{ formatPresetDates('next-month') }}</span>
              </label>

              <label class="radio-card" :class="{ active: applyPeriodPreset === 'next-2-weeks' }">
                <input type="radio" value="next-2-weeks" v-model="applyPeriodPreset" @change="onPeriodPresetChange" />
                <span class="radio-title">⏩ 2 prochaines semaines</span>
                <span class="radio-desc">14 jours consécutifs</span>
              </label>

              <label class="radio-card" :class="{ active: applyPeriodPreset === 'custom' }">
                <input type="radio" value="custom" v-model="applyPeriodPreset" />
                <span class="radio-title">🎯 Période personnalisée</span>
                <span class="radio-desc">Choisir les dates précises</span>
              </label>
            </div>

            <!-- Custom date range pickers -->
            <div v-if="applyPeriodPreset === 'custom'" class="custom-date-range-box">
              <div class="date-field">
                <label>Date de début :</label>
                <input type="date" v-model="customStartDate" class="form-input" />
              </div>
              <span class="date-arrow">➔</span>
              <div class="date-field">
                <label>Date de fin :</label>
                <input type="date" v-model="customEndDate" class="form-input" />
              </div>
            </div>
          </div>

          <!-- 2. Jours de la semaine à valider -->
          <div class="template-section">
            <h4>2. Jours de la semaine à ouvrir</h4>
            <p class="section-desc">Cochez les jours pour lesquels générer les ouvertures de salle :</p>

            <div class="days-validation-row">
              <label 
                v-for="d in daysList" 
                :key="d.id"
                class="day-validate-card"
                :class="{ 
                  active: applyAllowedDays.includes(d.id),
                  'has-template': getDayOpeningsCount(d.id) > 0
                }"
              >
                <input 
                  type="checkbox" 
                  :value="d.id" 
                  v-model="applyAllowedDays"
                />
                <div class="day-val-info">
                  <strong class="day-val-name">{{ d.name }}</strong>
                  <span class="day-val-count">{{ getDayOpeningsCount(d.id) }} salle(s)</span>
                </div>
              </label>
            </div>

            <div class="quick-target-buttons mt-2">
              <button type="button" class="tag-btn" @click="applyAllowedDays = [1, 2, 3, 4, 5]">Jours ouvrés (Lun - Ven)</button>
              <button type="button" class="tag-btn" @click="applyAllowedDays = [1, 2, 3, 4, 5, 6, 7]">Tous les 7 jours</button>
              <button type="button" class="tag-btn" @click="applyAllowedDays = []">Tout décocher</button>
            </div>
          </div>

          <!-- 3. Aperçu & Options -->
          <div class="template-section">
            <h4>3. Options & Aperçu prévisionnel</h4>

            <div class="generation-preview-box">
              <div class="preview-metric">
                <span class="p-label">Dates cibles analysées :</span>
                <strong class="p-val">{{ calculatedTargetDates.length }} date(s)</strong>
              </div>
              <div class="preview-metric">
                <span class="p-label">Total ouvertures prévues :</span>
                <strong class="p-val highlight-val">{{ calculatedTotalOpenings }} session(s)</strong>
              </div>
            </div>

            <label class="checkbox-item mt-3">
              <input type="checkbox" v-model="applyOverwriteExisting" />
              <span>Écraser / remplacer les ouvertures existantes sur ces dates</span>
            </label>
          </div>

          <div class="modal-actions">
            <button type="button" class="secondary-btn" @click="showApplyModal = false">Annuler</button>
            <button 
              type="button" 
              class="action-btn primary-btn" 
              @click="executeApplyGeneration" 
              :disabled="calculatedTotalOpenings === 0 || applyingLoading"
            >
              {{ applyingLoading ? 'Génération en cours...' : `⚡ Générer les ${calculatedTotalOpenings} ouvertures` }}
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoomSessionTemplateStore } from '../stores/roomSessionTemplateStore';
import { useRoomSessionStore } from '../stores/roomSessionStore';
import { useGlobalStore } from '../stores/global';

const props = defineProps({
  locations: {
    type: Array,
    default: () => []
  },
  facilitators: {
    type: Array,
    default: () => []
  },
  participants: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['navigate', 'refresh']);

const templateStore = useRoomSessionTemplateStore();
const roomSessionStore = useRoomSessionStore();
const globalStore = useGlobalStore();

const currentViewTab = ref('day-by-day'); // 'day-by-day' | 'matrix'
const selectedDay = ref(1); // 1 = Lundi ... 7 = Dimanche

const daysList = [
  { id: 1, name: 'Lundi' },
  { id: 2, name: 'Mardi' },
  { id: 3, name: 'Mercredi' },
  { id: 4, name: 'Jeudi' },
  { id: 5, name: 'Vendredi' },
  { id: 6, name: 'Samedi' },
  { id: 7, name: 'Dimanche' }
];

// MODALS STATE
const showCopyModal = ref(false);
const copySourceDay = ref(1);
const copyTargetDays = ref([2, 3, 4, 5]);

const showPartsModal = ref(false);
const activePartsDay = ref(1);
const activePartsLocation = ref(null);
const activeModalSelectedParts = ref([]);
const participantSearch = ref('');

const showApplyModal = ref(false);
const applyPeriodPreset = ref('current-week');
const customStartDate = ref(new Date().toISOString().slice(0, 10));
const customEndDate = ref(new Date().toISOString().slice(0, 10));
const applyAllowedDays = ref([1, 2, 3, 4, 5]);
const applyOverwriteExisting = ref(false);
const applyingLoading = ref(false);

onMounted(async () => {
  await templateStore.fetchTemplates();
  initMissingLocationTemplates();
});

// If any locations are missing in template store, create default entries
function initMissingLocationTemplates() {
  if (!props.locations || !props.locations.length) return;

  daysList.forEach(day => {
    props.locations.forEach((loc, idx) => {
      const locId = loc.documentId || loc.id;
      const existing = templateStore.templates.find(t => 
        Number(t.dayOfWeek) === day.id && 
        (t.location?.documentId === locId || t.location?.id === locId || t.location === locId)
      );

      if (!existing) {
        const defaultFac = props.facilitators[idx % (props.facilitators.length || 1)] || null;
        templateStore.templates.push({
          dayOfWeek: day.id,
          location: loc,
          manager: defaultFac,
          participants: [],
          isActive: day.id <= 5, // Open Mon-Fri by default
          notes: ''
        });
      }
    });
  });
}

// METRICS
const totalActiveOpenings = computed(() => {
  return templateStore.templates.filter(t => t.isActive).length;
});

const activeDaysCount = computed(() => {
  const activeDays = new Set();
  templateStore.templates.forEach(t => {
    if (t.isActive) activeDays.add(Number(t.dayOfWeek));
  });
  return activeDays.size;
});

// TEMPLATE GETTERS / SETTERS FOR SLOTS
function getTemplateItem(dayId, loc) {
  const locId = loc.documentId || loc.id;
  return templateStore.templates.find(t => 
    Number(t.dayOfWeek) === Number(dayId) && 
    (t.location?.documentId === locId || t.location?.id === locId || t.location === locId)
  );
}

function isRoomActive(dayId, loc) {
  const item = getTemplateItem(dayId, loc);
  return item ? !!item.isActive : false;
}

function toggleRoomActive(dayId, loc, checked) {
  const locId = loc.documentId || loc.id;
  templateStore.setTemplateEntry(dayId, locId, {
    location: loc,
    isActive: checked
  });
}

function getRoomManagerId(dayId, loc) {
  const item = getTemplateItem(dayId, loc);
  if (!item || !item.manager) return '';
  return item.manager.documentId || item.manager.id || item.manager;
}

function getRoomManager(dayId, loc) {
  const item = getTemplateItem(dayId, loc);
  return item?.manager || null;
}

function setRoomManager(dayId, loc, managerId) {
  const locId = loc.documentId || loc.id;
  const fac = props.facilitators.find(f => (f.documentId || f.id) === managerId) || null;
  templateStore.setTemplateEntry(dayId, locId, {
    location: loc,
    manager: fac
  });
}

function getRoomNotes(dayId, loc) {
  const item = getTemplateItem(dayId, loc);
  return item?.notes || '';
}

function setRoomNotes(dayId, loc, notes) {
  const locId = loc.documentId || loc.id;
  templateStore.setTemplateEntry(dayId, locId, {
    location: loc,
    notes: notes
  });
}

function getRoomParticipants(dayId, loc) {
  const item = getTemplateItem(dayId, loc);
  return item?.participants || [];
}

function getDayOpeningsCount(dayId) {
  return templateStore.templates.filter(t => Number(t.dayOfWeek) === Number(dayId) && t.isActive).length;
}

function getSelectedDayName() {
  const d = daysList.find(day => day.id === selectedDay.value);
  return d ? d.name : '';
}

function setAllRoomsForDay(dayId, activeState) {
  props.locations.forEach(loc => {
    toggleRoomActive(dayId, loc, activeState);
  });
}

// SAVE ACTIONS
async function saveTemplate() {
  try {
    await templateStore.saveAllTemplates();
  } catch (err) {
    // Error handled by store
  }
}

async function confirmResetDefaults() {
  if (confirm('Voulez-vous vraiment réinitialiser la semaine type aux valeurs standard par défaut ?')) {
    await templateStore.resetToDefaults(props.locations, props.facilitators);
    initMissingLocationTemplates();
  }
}

// COPY MODAL
function openCopyModal(srcDay) {
  copySourceDay.value = srcDay;
  if (srcDay === 1) {
    copyTargetDays.value = [2, 3, 4, 5];
  } else {
    copyTargetDays.value = daysList.filter(d => d.id !== srcDay && d.id <= 5).map(d => d.id);
  }
  showCopyModal.value = true;
}

function setWorkDaysTarget() {
  copyTargetDays.value = [1, 2, 3, 4, 5].filter(d => d !== copySourceDay.value);
}

function setAllDaysTarget() {
  copyTargetDays.value = [1, 2, 3, 4, 5, 6, 7].filter(d => d !== copySourceDay.value);
}

function applyDayDuplication() {
  templateStore.duplicateDayToDays(copySourceDay.value, copyTargetDays.value);
  showCopyModal.value = false;
}

// PARTICIPANTS MODAL
const activePartsModalDayName = computed(() => {
  return daysList.find(d => d.id === activePartsDay.value)?.name || '';
});

const activePartsModalLocName = computed(() => {
  return activePartsLocation.value?.name || '';
});

const filteredParticipants = computed(() => {
  const q = participantSearch.value.trim().toLowerCase();
  if (!q) return props.participants;
  return props.participants.filter(p => 
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
    `${p.lastName} ${p.firstName}`.toLowerCase().includes(q) ||
    (p.email || '').toLowerCase().includes(q)
  );
});

function openParticipantsModal(dayId, loc) {
  activePartsDay.value = dayId;
  activePartsLocation.value = loc;
  participantSearch.value = '';
  const current = getRoomParticipants(dayId, loc);
  activeModalSelectedParts.value = current.map(p => p.documentId || p.id || p);
  showPartsModal.value = true;
}

function isParticipantSelected(part) {
  const pId = part.documentId || part.id;
  return activeModalSelectedParts.value.includes(pId);
}

function toggleParticipantSelection(part, checked) {
  const pId = part.documentId || part.id;
  if (checked) {
    if (!activeModalSelectedParts.value.includes(pId)) {
      activeModalSelectedParts.value.push(pId);
    }
  } else {
    activeModalSelectedParts.value = activeModalSelectedParts.value.filter(id => id !== pId);
  }
}

function saveParticipantsModal() {
  if (!activePartsLocation.value) return;
  const locId = activePartsLocation.value.documentId || activePartsLocation.value.id;
  
  const fullParts = activeModalSelectedParts.value.map(id => 
    props.participants.find(p => (p.documentId || p.id) === id) || { id }
  );

  templateStore.setTemplateEntry(activePartsDay.value, locId, {
    location: activePartsLocation.value,
    participants: fullParts
  });

  showPartsModal.value = false;
  globalStore.addSuccess('Liste des bénéficiaires récurrents mise à jour.', 'Bénéficiaires');
}

// APPLY MODAL CALCULATIONS & ACTIONS
function openApplyModal() {
  applyPeriodPreset.value = 'current-week';
  applyAllowedDays.value = [1, 2, 3, 4, 5];
  applyOverwriteExisting.value = false;
  onPeriodPresetChange();
  showApplyModal.value = true;
}

function onPeriodPresetChange() {
  const today = new Date();
  if (applyPeriodPreset.value === 'current-week') {
    const start = getStartOfWeek(today);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    customStartDate.value = start.toISOString().slice(0, 10);
    customEndDate.value = end.toISOString().slice(0, 10);
  } else if (applyPeriodPreset.value === 'next-week') {
    const start = getStartOfWeek(today);
    start.setDate(start.getDate() + 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    customStartDate.value = start.toISOString().slice(0, 10);
    customEndDate.value = end.toISOString().slice(0, 10);
  } else if (applyPeriodPreset.value === 'current-month') {
    const year = today.getFullYear();
    const month = today.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    customStartDate.value = start.toISOString().slice(0, 10);
    customEndDate.value = end.toISOString().slice(0, 10);
  } else if (applyPeriodPreset.value === 'next-month') {
    const year = today.getFullYear();
    const month = today.getMonth();
    const start = new Date(year, month + 1, 1);
    const end = new Date(year, month + 2, 0);
    customStartDate.value = start.toISOString().slice(0, 10);
    customEndDate.value = end.toISOString().slice(0, 10);
  } else if (applyPeriodPreset.value === 'next-2-weeks') {
    const start = new Date(today);
    const end = new Date(today);
    end.setDate(end.getDate() + 13);
    customStartDate.value = start.toISOString().slice(0, 10);
    customEndDate.value = end.toISOString().slice(0, 10);
  }
}

function formatPresetDates(preset) {
  const today = new Date();
  if (preset === 'current-week') {
    const start = getStartOfWeek(today);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
  } else if (preset === 'next-week') {
    const start = getStartOfWeek(today);
    start.setDate(start.getDate() + 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
  } else if (preset === 'current-month') {
    return today.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  } else if (preset === 'next-month') {
    const nextM = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return nextM.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }
  return '';
}

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const calculatedTargetDates = computed(() => {
  if (!customStartDate.value || !customEndDate.value) return [];
  const dates = [];
  const curr = new Date(customStartDate.value + 'T00:00:00');
  const end = new Date(customEndDate.value + 'T00:00:00');

  while (curr <= end) {
    const jsDay = curr.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;
    if (applyAllowedDays.value.includes(dayOfWeek)) {
      dates.push(curr.toISOString().slice(0, 10));
    }
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
});

const calculatedTotalOpenings = computed(() => {
  let total = 0;
  calculatedTargetDates.value.forEach(dateStr => {
    const d = new Date(dateStr + 'T00:00:00');
    const jsDay = d.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;
    const openingsForDay = getDayOpeningsCount(dayOfWeek);
    total += openingsForDay;
  });
  return total;
});

async function executeApplyGeneration() {
  if (calculatedTargetDates.value.length === 0) return;
  applyingLoading.value = true;
  try {
    // If there are unsaved changes, save them first
    if (templateStore.isDirty) {
      await templateStore.saveAllTemplates();
    }

    await roomSessionStore.applyTemplate(calculatedTargetDates.value, templateStore.templates, {
      overwrite: applyOverwriteExisting.value,
      allowedDays: applyAllowedDays.value
    });

    showApplyModal.value = false;
  } catch (err) {
    alert("Erreur lors de l'application : " + err.message);
  } finally {
    applyingLoading.value = false;
  }
}
</script>

<style scoped>
.week-template-root {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  background: var(--bg-primary, #121826);
  color: var(--text-primary, #f3f4f6);
  min-height: calc(100vh - 70px);
}

/* ════════ HEADER ════════ */
.view-header {
  background: var(--bg-surface, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1.25rem;
}

.header-title-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-icon-box {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  box-shadow: 0 4px 10px rgba(245, 158, 11, 0.3);
}

.title-with-pill {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.title-with-pill h2 {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-primary, #f8fafc);
  margin: 0;
}

.mode-tag-pill {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
  font-size: 0.75rem;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-weight: 600;
}

.unsaved-pill {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.4);
  font-size: 0.75rem;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-weight: 600;
  animation: pulseWarning 2s infinite;
}

@keyframes pulseWarning {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.subtitle {
  font-size: 0.85rem;
  color: var(--text-secondary, #94a3b8);
  margin-top: 0.3rem;
  max-width: 750px;
  line-height: 1.4;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.secondary-btn {
  background: var(--bg-surface-2, #2d3748);
  color: var(--text-primary, #e2e8f0);
  border: 1px solid var(--border-color, #4a5568);
}
.secondary-btn:hover:not(:disabled) {
  background: #3b4759;
}

.reset-btn {
  background: rgba(148, 163, 184, 0.15);
  color: #cbd5e1;
  border: 1px solid #475569;
}
.reset-btn:hover:not(:disabled) {
  background: rgba(148, 163, 184, 0.25);
}

.apply-btn {
  background: linear-gradient(135deg, #0284c7, #0369a1);
  color: #fff;
  box-shadow: 0 2px 8px rgba(2, 132, 199, 0.3);
}
.apply-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #0369a1, #075985);
}

.save-btn {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}
.save-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669, #047857);
}

.pulse-btn {
  animation: pulseGlow 1.5s infinite;
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6); }
  50% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
}

.header-toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color, #334155);
}

.template-metrics-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.t-metric {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
}

.t-metric-label {
  color: var(--text-secondary, #94a3b8);
}

.t-metric-val {
  color: #38bdf8;
  font-weight: 600;
}

.t-metric-divider {
  width: 1px;
  height: 14px;
  background: var(--border-color, #475569);
}

.view-switcher-pill {
  display: flex;
  background: var(--bg-surface-2, #0f172a);
  border: 1px solid var(--border-color, #334155);
  border-radius: 8px;
  padding: 3px;
  gap: 4px;
}

.view-pill-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-pill-btn.active {
  background: #3b82f6;
  color: #fff;
}

/* ════════ DAY NAVIGATION TABS ════════ */
.day-tabs-nav {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.day-tab-btn {
  background: var(--bg-surface, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 10px;
  padding: 0.75rem 0.5rem;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;
}

.day-tab-btn:hover {
  background: #273549;
  border-color: #475569;
}

.day-tab-btn.active {
  background: linear-gradient(135deg, #1e3a8a, #1e40af);
  border-color: #60a5fa;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.day-tab-btn.weekend:not(.active) {
  opacity: 0.75;
  background: rgba(15, 23, 42, 0.5);
}

.day-tab-inner {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  align-items: center;
}

.day-tab-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text-primary, #f8fafc);
}

.day-tab-count-badge {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 12px;
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  font-weight: 600;
}

.day-tab-count-badge.zero-count {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
}

/* ════════ SELECTED DAY HEADER ════════ */
.selected-day-header {
  background: var(--bg-surface, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.day-header-info h3 {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
  color: #60a5fa;
}

.day-header-sub {
  font-size: 0.85rem;
  color: var(--text-secondary, #94a3b8);
  margin: 0.2rem 0 0 0;
}

.day-quick-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.mini-action-btn {
  background: var(--bg-surface-2, #2d3748);
  border: 1px solid var(--border-color, #4a5568);
  color: var(--text-primary, #e2e8f0);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mini-action-btn:hover {
  background: #3b4759;
}

.copy-btn {
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
  border-color: rgba(59, 130, 246, 0.3);
}

.open-all-btn {
  background: rgba(16, 185, 129, 0.15);
  color: #6ee7b7;
  border-color: rgba(16, 185, 129, 0.3);
}

.close-all-btn {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.3);
}

/* ════════ ROOM CARDS GRID ════════ */
.day-rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 1.25rem;
}

.room-card {
  background: var(--bg-surface, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
}

.room-card.room-active {
  border-color: rgba(16, 185, 129, 0.4);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.08);
}

.room-card.room-inactive {
  opacity: 0.7;
  border-style: dashed;
}

.room-card-header {
  padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--border-color, #334155);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.room-title-area {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.room-icon {
  font-size: 1.3rem;
}

.room-name {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary, #f8fafc);
}

.room-meta {
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
}

/* Toggle Switch */
.toggle-switch-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.toggle-switch-wrapper input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.slider {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  background-color: #475569;
  border-radius: 20px;
  transition: .3s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: .3s;
}

input:checked + .slider {
  background-color: #10b981;
}

input:checked + .slider:before {
  transform: translateX(16px);
}

.toggle-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary, #94a3b8);
}

input:checked ~ .toggle-label {
  color: #34d399;
}

/* Card Body */
.room-card-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
}

.room-card-body.disabled {
  opacity: 0.4;
  pointer-events: none;
}

.form-group-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary, #cbd5e1);
  display: flex;
  justify-content: space-between;
}

.req-warn {
  color: #f59e0b;
  font-size: 0.75rem;
}

.form-select, .form-input {
  width: 100%;
  background: var(--bg-surface-2, #0f172a);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.18));
  border-radius: 8px;
  padding: 0.6rem 0.85rem;
  color: var(--text-primary, #f8fafc);
  font-size: 0.88rem;
  outline: none;
  color-scheme: dark;
  transition: all 0.2s;
}

.form-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%235eead4'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2.5' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-position: right 0.75rem center;
  background-repeat: no-repeat;
  background-size: 1.15rem 1.15rem;
  padding-right: 2.4rem;
  cursor: pointer;
}

.form-select option {
  background-color: #0f172a !important;
  color: #f8fafc !important;
  padding: 10px 14px;
}

.form-select:focus, .form-input:focus {
  border-color: #0d9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.25);
  background: rgba(15, 23, 42, 0.98);
}

.room-part-info {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid var(--border-color, #334155);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.part-count-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.part-label {
  font-size: 0.8rem;
  color: var(--text-secondary, #94a3b8);
}

.part-badge {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
  border-radius: 12px;
  font-weight: 600;
}

.manage-parts-btn {
  background: var(--bg-surface-2, #2d3748);
  border: 1px solid var(--border-color, #4a5568);
  color: var(--text-primary, #e2e8f0);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.4rem;
  border-radius: 6px;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;
}

.manage-parts-btn:hover:not(:disabled) {
  background: #3b4759;
}

/* ════════ MATRIX VIEW ════════ */
.matrix-view-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.matrix-info-banner {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.85rem;
  color: #93c5fd;
}

.matrix-table-wrapper {
  overflow-x: auto;
  background: var(--bg-surface, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 12px;
}

.week-matrix-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.week-matrix-table th, .week-matrix-table td {
  padding: 0.75rem 0.6rem;
  border-bottom: 1px solid var(--border-color, #334155);
  border-right: 1px solid var(--border-color, #334155);
}

.loc-col-header {
  width: 200px;
  min-width: 180px;
  background: rgba(15, 23, 42, 0.6);
  font-weight: 700;
  font-size: 0.85rem;
}

.day-col-header {
  min-width: 130px;
  text-align: center;
  background: rgba(15, 23, 42, 0.4);
}

.day-col-header.weekend-header {
  background: rgba(15, 23, 42, 0.7);
  opacity: 0.8;
}

.day-col-title {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  align-items: center;
  font-weight: 700;
  font-size: 0.9rem;
}

.day-col-sub {
  font-size: 0.7rem;
  font-weight: normal;
  color: #38bdf8;
}

.loc-name-cell {
  background: rgba(15, 23, 42, 0.3);
}

.loc-name-cell strong {
  display: block;
  font-size: 0.85rem;
}

.loc-cap {
  font-size: 0.7rem;
  color: var(--text-secondary, #94a3b8);
}

.matrix-slot-cell {
  text-align: center;
  transition: background 0.2s;
}

.matrix-slot-cell.active-slot {
  background: rgba(16, 185, 129, 0.04);
}

.matrix-slot-cell.inactive-slot {
  background: rgba(15, 23, 42, 0.2);
  opacity: 0.6;
}

.matrix-cell-content {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: center;
}

.matrix-checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
}

.slot-status-pill {
  font-size: 0.7rem;
  font-weight: 600;
}

.matrix-slot-cell.active-slot .slot-status-pill {
  color: #34d399;
}

.matrix-slot-cell.inactive-slot .slot-status-pill {
  color: #94a3b8;
}

.mini-matrix-select {
  width: 100%;
  max-width: 130px;
  background: var(--bg-surface-2, #0f172a);
  border: 1px solid var(--border-color, #334155);
  border-radius: 6px;
  padding: 0.25rem 0.4rem;
  color: var(--text-primary, #f8fafc);
  font-size: 0.75rem;
}

/* ════════ MODALS ════════ */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-card {
  background: var(--bg-surface, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 14px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 90vh;
}

.modal-card.modal-lg {
  max-width: 780px;
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color, #334155);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.modal-title-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.modal-icon {
  font-size: 1.5rem;
}

.modal-title-box h3 {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary, #f8fafc);
}

.modal-sub {
  font-size: 0.8rem;
  color: var(--text-secondary, #94a3b8);
  margin: 0.2rem 0 0 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary, #94a3b8);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.modal-form {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  overflow-y: auto;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color, #334155);
}

.primary-btn {
  background: #3b82f6;
  color: white;
}
.primary-btn:hover:not(:disabled) {
  background: #2563eb;
}

/* Copy Target Days Grid */
.target-days-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 0.6rem;
  margin: 0.75rem 0;
}

.target-day-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.8rem;
  background: var(--bg-surface-2, #0f172a);
  border: 1px solid var(--border-color, #334155);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.target-day-chip.selected {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
}

.target-day-chip.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.quick-target-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag-btn {
  background: var(--bg-surface-2, #0f172a);
  border: 1px solid var(--border-color, #334155);
  color: var(--text-secondary, #cbd5e1);
  font-size: 0.75rem;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
}

.tag-btn:hover {
  background: #1e293b;
  color: white;
}

/* Parts Selection in Modal */
.parts-selection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.6rem;
  max-height: 320px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.participant-check-card {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  background: var(--bg-surface-2, #0f172a);
  border: 1px solid var(--border-color, #334155);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.participant-check-card.selected {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.15);
}

.part-card-info {
  display: flex;
  flex-direction: column;
}

.part-name {
  font-size: 0.85rem;
}

.part-email {
  font-size: 0.7rem;
  color: var(--text-secondary, #94a3b8);
}

.selected-parts-count {
  font-size: 0.85rem;
  color: var(--text-secondary, #94a3b8);
  margin-right: auto;
}

/* Template Auto-Fill Sections */
.template-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.template-section h4 {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
  color: #38bdf8;
}

.section-desc {
  font-size: 0.8rem;
  color: var(--text-secondary, #94a3b8);
  margin: 0;
}

.template-period-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
}

.radio-card {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.8rem;
  background: var(--bg-surface-2, #0f172a);
  border: 1px solid var(--border-color, #334155);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.radio-card input {
  display: none;
}

.radio-card.active {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.15);
}

.radio-title {
  font-weight: 700;
  font-size: 0.85rem;
}

.radio-desc {
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
}

.custom-date-range-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid var(--border-color, #334155);
  border-radius: 8px;
  padding: 0.75rem;
}

.date-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1;
}

.date-field label {
  font-size: 0.75rem;
  color: var(--text-secondary, #cbd5e1);
}

.date-arrow {
  color: var(--text-secondary, #64748b);
  margin-top: 1rem;
}

.days-validation-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
}

.day-validate-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 0.4rem;
  background: var(--bg-surface-2, #0f172a);
  border: 1px solid var(--border-color, #334155);
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
}

.day-validate-card.active {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.15);
}

.day-val-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.day-val-name {
  font-size: 0.8rem;
}

.day-val-count {
  font-size: 0.7rem;
  color: #34d399;
}

.generation-preview-box {
  display: flex;
  gap: 1.5rem;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid var(--border-color, #334155);
  border-radius: 8px;
  padding: 0.8rem 1rem;
}

.preview-metric {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.p-label {
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
}

.p-val {
  font-size: 1.1rem;
  color: #f8fafc;
}

.highlight-val {
  color: #38bdf8;
  font-weight: 700;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  gap: 1rem;
  color: var(--text-secondary, #94a3b8);
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 900px) {
  .day-tabs-nav {
    grid-template-columns: repeat(4, 1fr);
  }
  .days-validation-row {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
