<template>
  <div class="facilitator-workspace-root">
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- TOP WORKSPACE HERO & IDENTITY BAR -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <header class="workspace-hero">
      <div class="hero-main-row">
        <div class="hero-title-box">
          <div class="hero-icon-badge">🎨</div>
          <div>
            <div class="title-row">
              <h2>Espace Animatrice & Ateliers</h2>
              <span class="hub-pill">Parcours Animation</span>
            </div>
            <p class="hero-sub">
              Consultez les salles ouvertes, les bénéficiaires accueillis et programmez vos ateliers dans les créneaux disponibles.
            </p>
          </div>
        </div>

        <!-- Animatrice Persona & Mode Selector -->
        <div class="facilitator-selector-box">
          <label class="selector-label">Animatrice active :</label>
          <div class="fac-select-wrapper">
            <span class="fac-mini-avatar">👩‍🏫</span>
            <select v-model="selectedFacilitatorId" class="fac-dropdown" @change="onFacilitatorChange">
              <option v-for="fac in facilitators" :key="fac.documentId || fac.id" :value="fac.documentId || fac.id">
                {{ fac.firstName }} {{ fac.lastName }} ({{ fac.email }})
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- DATE NAVIGATION & FILTER TOOLBAR -->
      <div class="workspace-toolbar">
        <!-- Date controls -->
        <div class="date-controls-group">
          <button type="button" class="nav-btn" @click="navigateDay(-1)" title="Jour précédent">
            ◀ Jour préc.
          </button>
          <button type="button" class="today-btn" @click="goToToday" :class="{ 'is-today': isToday }">
            Aujourd'hui
          </button>
          <button type="button" class="nav-btn" @click="navigateDay(1)" title="Jour suivant">
            Jour suiv. ▶
          </button>

          <div class="date-picker-wrapper">
            <input
              type="date"
              v-model="selectedDate"
              class="date-input"
              @change="onDateManualChange"
              title="Choisir une date précise"
            />
          </div>

          <div class="current-date-display">
            <span class="date-text-primary">{{ formattedDateFull }}</span>
            <span v-if="isToday" class="today-badge">Aujourd'hui</span>
          </div>
        </div>

        <!-- Right Side: Filter & Primary Action Button -->
        <div class="toolbar-actions">
          <div class="filter-toggle-pill">
            <button
              type="button"
              class="filter-pill-btn"
              :class="{ active: filterMode === 'all' }"
              @click="filterMode = 'all'"
            >
              Toutes les salles
            </button>
            <button
              type="button"
              class="filter-pill-btn"
              :class="{ active: filterMode === 'mine' }"
              @click="filterMode = 'mine'"
            >
              Mes animations
            </button>
          </div>

          <button
            type="button"
            class="action-btn-primary"
            @click="openCreateModal()"
            title="Créer et placer un nouvel atelier"
          >
            <span>➕</span> Nouvelle Animation
          </button>
        </div>
      </div>
    </header>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- KPI / STATS BAR -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <section class="stats-strip">
      <div class="stat-card">
        <span class="stat-icon">🚪</span>
        <div class="stat-content">
          <span class="stat-value">{{ dayOpenRooms.length }}</span>
          <span class="stat-label">Salle{{ dayOpenRooms.length > 1 ? 's' : '' }} ouverte{{ dayOpenRooms.length > 1 ? 's' : '' }}</span>
        </div>
      </div>

      <div class="stat-card">
        <span class="stat-icon">👥</span>
        <div class="stat-content">
          <span class="stat-value">{{ dayTotalParticipants.length }}</span>
          <span class="stat-label">Bénéficiaires accueillis</span>
        </div>
        <span v-if="dayTransportCount > 0" class="stat-sub-badge transport" title="Transport assuré par le centre">
          🚐 {{ dayTransportCount }} transport{{ dayTransportCount > 1 ? 's' : '' }}
        </span>
      </div>

      <div class="stat-card">
        <span class="stat-icon">🎯</span>
        <div class="stat-content">
          <span class="stat-value">{{ dayAnimations.length }}</span>
          <span class="stat-label">Animation{{ dayAnimations.length > 1 ? 's' : '' }} programmée{{ dayAnimations.length > 1 ? 's' : '' }}</span>
        </div>
        <span class="stat-sub-badge mine" title="Animations où vous êtes référente ou co-animatrice">
          ★ {{ myDayAnimations.length }} animée{{ myDayAnimations.length > 1 ? 's' : '' }} par vous
        </span>
      </div>

      <div class="stat-card">
        <span class="stat-icon">✨</span>
        <div class="stat-content">
          <span class="stat-value">{{ dayTotalFreeMinutes > 0 ? fmtDuration(dayTotalFreeMinutes) : 'Complet' }}</span>
          <span class="stat-label">Créneaux libres cumulés</span>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- MAIN CONTENT VIEW -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <div class="workspace-main-content">
      <!-- Loading indicator -->
      <div v-if="loadingRooms" class="loading-state-card">
        <div class="spinner"></div>
        <p>Recherche des salles ouvertes pour le {{ formattedDateShort }}...</p>
      </div>

      <!-- No Open Rooms State on this date -->
      <div v-else-if="dayOpenRooms.length === 0" class="empty-state-card">
        <span class="empty-icon">🚪💤</span>
        <h3>Aucune salle ouverte pour le {{ formattedDateFull }}</h3>
        <p>
          Aucune ouverture journalière de salle n'est déclarée pour cette date dans l'accueil de jour.
        </p>
        <div class="empty-actions-row">
          <button v-if="nearestDateWithRooms" type="button" class="btn-secondary" @click="goToNearestDate">
            📅 Consulter le prochain jour ouvert ({{ nearestDateWithRooms }})
          </button>
          <button type="button" class="btn-secondary" @click="navigateTo('room-sessions')">
            🚪 Gérer les ouvertures de salles
          </button>
        </div>
      </div>

      <!-- OPEN ROOMS LIST WITH TIMELINES & WORKSHOP PLACEMENT -->
      <div v-else class="rooms-container">
        <!-- Room Session Card -->
        <article
          v-for="roomSess in visibleOpenRooms"
          :key="roomSess.documentId || roomSess.id"
          class="room-card"
        >
          <!-- Room Header Bar -->
          <div class="room-card-header">
            <div class="room-title-block">
              <span class="room-card-icon">📍</span>
              <div>
                <div class="room-name-row">
                  <h3 class="room-name">{{ roomSess.location?.name || 'Salle' }}</h3>
                  <span class="room-capacity-pill">
                    Capacité max : {{ roomSess.location?.capacity || 20 }} personnes
                  </span>
                </div>
                <div class="room-details-row">
                  <span class="room-hours-tag">
                    ⏰ {{ (roomSess.startTime || '10:00').slice(0, 5) }} - {{ (roomSess.endTime || '16:00').slice(0, 5) }}
                  </span>
                  <span class="room-manager-tag">
                    👨‍🏫 Référent : <strong>{{ managerName(roomSess) }}</strong>
                  </span>
                  <span class="room-cohort-tag">
                    👥 <strong>{{ (roomSess.participants || []).length }}</strong> bénéficiaire{{ (roomSess.participants || []).length > 1 ? 's' : '' }} affecté{{ (roomSess.participants || []).length > 1 ? 's' : '' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Header Actions -->
            <div class="room-card-actions">
              <button
                type="button"
                class="room-action-btn secondary"
                :class="{ active: isBeneficiariesOpen(roomSess) }"
                @click="toggleBeneficiaries(roomSess)"
                title="Afficher la liste des bénéficiaires et leurs particularités (santé, transport)"
              >
                <span>👥</span>
                <span>{{ isBeneficiariesOpen(roomSess) ? 'Masquer la cohorte' : 'Voir les bénéficiaires' }}</span>
                <span class="badge-count">{{ (roomSess.participants || []).length }}</span>
              </button>

              <button
                type="button"
                class="room-action-btn primary"
                @click="openCreateModal({ roomSession: roomSess, location: roomSess.location, date: selectedDate })"
                title="Placer un atelier dans cette salle"
              >
                <span>➕</span> Placer une animation
              </button>
            </div>
          </div>

          <!-- Beneficiaries Drawer / Accordion with transport & medical notes -->
          <transition name="expand">
            <div v-if="isBeneficiariesOpen(roomSess)" class="beneficiaries-drawer">
              <div class="drawer-header">
                <span class="drawer-title">
                  📋 Cohorte des bénéficiaires présents en salle — {{ roomSess.location?.name }}
                </span>
                <span class="drawer-hint">
                  Les bénéficiaires ci-dessous sont affectés à la salle pour la journée. Ils peuvent être inscrits en 1 clic dans vos ateliers.
                </span>
              </div>
              <ParticipantInfoList :participants="roomSess.participants || []" />
            </div>
          </transition>

          <!-- Interactive Room Timeline Component -->
          <div class="timeline-wrapper">
            <RoomTimeline
              :session="roomSess"
              :animations="getAnimationsForRoom(roomSess)"
              :time-slots="timeslots"
              :current-facilitator-id="selectedFacilitatorId"
              :current-facilitator-email="currentFacilitatorEmail"
              @create-in-room="openCreateModal"
              @select-free-slot="openCreateModal"
              @edit-animation="onEditAnimation"
              @delete-animation="onDeleteAnimation"
              @checkin-animation="onCheckinAnimation"
            />
          </div>
        </article>
      </div>

      <!-- ═══════════════════════════════════════════════════════════════════════ -->
      <!-- DAY'S ANIMATIONS PROGRAM (DETAILED CARDS) -->
      <!-- ═══════════════════════════════════════════════════════════════════════ -->
      <section class="day-program-section" v-if="visibleAnimations.length > 0">
        <div class="section-title-bar">
          <div class="section-title-left">
            <span class="section-title-icon">📋</span>
            <div>
              <h3>Programme détaillé des ateliers du jour</h3>
              <p class="section-subtitle">
                Accédez rapidement aux fiches de vos ateliers, modifiez les horaires ou effectuez le pointage des présences.
              </p>
            </div>
          </div>
          <span class="section-count-badge">
            {{ visibleAnimations.length }} atelier{{ visibleAnimations.length > 1 ? 's' : '' }}
          </span>
        </div>

        <div class="animations-grid">
          <div
            v-for="act in visibleAnimations"
            :key="act.documentId || act.id"
            class="anim-summary-card"
            :class="{ 'mine-card': isMyAnimation(act) }"
          >
            <!-- Card Header -->
            <div class="card-header-line">
              <span class="card-time-pill">
                ⏰ {{ formatTime(act.startDate) }} - {{ formatTime(act.endDate) }}
              </span>
              <span v-if="isMyAnimation(act)" class="mine-badge">
                ★ Mon atelier
              </span>
              <div class="card-actions-quick">
                <button
                  type="button"
                  class="card-tool-btn checkin"
                  @click="onCheckinAnimation({ animation: act })"
                  title="Pointer les présences des participants"
                >
                  ✅ Pointer
                </button>
                <button
                  type="button"
                  class="card-tool-btn edit"
                  @click="onEditAnimation({ animation: act })"
                  title="Modifier l'animation"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  class="card-tool-btn delete"
                  @click="onDeleteAnimation({ animation: act })"
                  title="Supprimer du planning"
                >
                  🗑️
                </button>
              </div>
            </div>

            <!-- Card Title & Location -->
            <div class="card-main">
              <h4 class="card-title">{{ act.name }}</h4>
              <p class="card-location">📍 {{ getLocationName(act) }}</p>
              <p v-if="act.description" class="card-desc">{{ act.description }}</p>
            </div>

            <!-- Tags -->
            <div v-if="Array.isArray(act.tags) && act.tags.length" class="card-tags-row">
              <span v-for="tag in act.tags" :key="tag" class="card-tag">🏷️ {{ tag }}</span>
            </div>

            <!-- Card Footer -->
            <div class="card-footer-line">
              <div class="card-facs">
                <span class="facs-label">Intervenant(s) :</span>
                <strong>{{ getFacilitatorsNames(act) }}</strong>
              </div>
              <div class="card-enrollment">
                👥 <strong>{{ getSlotParticipantsCount(act) }}</strong> inscrit(s)
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- ANIMATION CREATION & PARAMETERIZATION MODAL -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <AnimationEditorModal
      :is-open="showModal"
      :editing-animation="editingAnimationData"
      :editing-slot="editingSlotData"
      :initial-date="modalInitialDate"
      :initial-room-session="modalInitialRoomSession"
      :initial-start-time="modalInitialStartTime"
      :initial-end-time="modalInitialEndTime"
      :open-rooms="openRooms"
      :activities="activities"
      :facilitators="facilitators"
      :participants="participants"
      :timeslots="timeslots"
      :current-facilitator-id="selectedFacilitatorId"
      @close="closeModal"
      @saved="onAnimationSaved"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import {
  idOf,
  pad,
  dateKey,
  parseKey,
  atTime,
  hhmm,
  addDays,
  fmtDuration,
  fmtDayLong,
  fmtDayShort,
  subtractIntervals
} from '../../utils/facilitatorPlanningHelpers';
import { useFacilitatorWorkspaceStore } from '../../stores/facilitatorWorkspaceStore';
import { useActiveSchedulerStore } from '../../stores/activeScheduler';
import { useAuthStore } from '../../stores/auth';
import { useGlobalStore } from '../../stores/global';
import RoomTimeline from '../../components/facilitator/RoomTimeline.vue';
import ParticipantInfoList from '../../components/facilitator/ParticipantInfoList.vue';
import AnimationEditorModal from '../../components/facilitator/AnimationEditorModal.vue';

const props = defineProps({
  locations: { type: Array, default: () => [] },
  activities: { type: Array, default: () => [] },
  facilitators: { type: Array, default: () => [] },
  participants: { type: Array, default: () => [] },
  timeslots: { type: Array, default: () => [] },
  currentUserPersona: { type: Object, default: null }
});

const emit = defineEmits(['navigate']);

const workspaceStore = useFacilitatorWorkspaceStore();
const schedulerStore = useActiveSchedulerStore();
const authStore = useAuthStore();
const globalStore = useGlobalStore();

// Date State
const todayStr = dateKey(new Date());
const selectedDate = ref(todayStr);

// Facilitator Persona State
const selectedFacilitatorId = ref(null);

// Open Rooms for current loaded window
const openRooms = ref([]);
const loadingRooms = ref(false);
const nearestDateWithRooms = ref(null);

// UI Filter Mode: 'all' | 'mine'
const filterMode = ref('all');

// Expanded beneficiaries drawers map: { [roomSessionId]: boolean }
const expandedBeneficiaries = ref({});

// Modal State
const showModal = ref(false);
const editingAnimationData = ref(null);
const editingSlotData = ref(null);
const modalInitialDate = ref('');
const modalInitialRoomSession = ref(null);
const modalInitialStartTime = ref('');
const modalInitialEndTime = ref('');

// Computed Dates
const isToday = computed(() => selectedDate.value === todayStr);

const formattedDateFull = computed(() => {
  return fmtDayLong(selectedDate.value);
});

const formattedDateShort = computed(() => {
  return fmtDayShort(selectedDate.value);
});

const currentFacilitator = computed(() => {
  if (!selectedFacilitatorId.value) return null;
  return props.facilitators.find(f => String(idOf(f)) === String(selectedFacilitatorId.value)) || null;
});

const currentFacilitatorEmail = computed(() => {
  return currentFacilitator.value?.email || '';
});

// Rooms open on selected date
const dayOpenRooms = computed(() => {
  return openRooms.value.filter(r => r.date === selectedDate.value);
});

// Visible rooms based on filter
const visibleOpenRooms = computed(() => {
  if (filterMode.value !== 'mine') return dayOpenRooms.value;
  // If 'mine', show rooms where I am manager OR where I have an animation scheduled
  const myId = String(selectedFacilitatorId.value || '');
  const myEmail = (currentFacilitatorEmail.value || '').toLowerCase();

  return dayOpenRooms.value.filter(room => {
    const isManager = room.manager && (String(idOf(room.manager)) === myId || (room.manager.email || '').toLowerCase() === myEmail);
    const hasMyAnim = getAnimationsForRoom(room).some(act => isMyAnimation(act));
    return isManager || hasMyAnim;
  });
});

// All scheduled activities on selected date
const dayAnimations = computed(() => {
  const datePfx = selectedDate.value;
  const list = [];
  props.timeslots.forEach(ts => {
    if (ts.startDate && ts.startDate.slice(0, 10) === datePfx) {
      (ts.scheduledActivities || []).forEach(sa => {
        list.push({ ...sa, _parentSlot: ts });
      });
    }
  });
  return list.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
});

// My animations on selected date
const myDayAnimations = computed(() => {
  return dayAnimations.value.filter(act => isMyAnimation(act));
});

// Visible animations based on filter mode
const visibleAnimations = computed(() => {
  if (filterMode.value === 'mine') return myDayAnimations.value;
  return dayAnimations.value;
});

// Total beneficiaries in all rooms open today
const dayTotalParticipants = computed(() => {
  const set = new Map();
  dayOpenRooms.value.forEach(r => {
    (r.participants || []).forEach(p => {
      const pid = idOf(p);
      if (pid && !set.has(pid)) set.set(pid, p);
    });
  });
  return Array.from(set.values());
});

const dayTransportCount = computed(() => {
  return dayTotalParticipants.value.filter(p => !!p.transport).length;
});

// Total free minutes across all rooms open today
const dayTotalFreeMinutes = computed(() => {
  let total = 0;
  dayOpenRooms.value.forEach(r => {
    const sStart = atTime(r.date, r.startTime || '10:00').getTime();
    const sEnd = atTime(r.date, r.endTime || '16:00').getTime();
    if (sEnd <= sStart) return;

    const anims = getAnimationsForRoom(r);
    const cuts = anims.map(a => ({
      s: Math.max(sStart, new Date(a.startDate).getTime()),
      e: Math.min(sEnd, new Date(a.endDate).getTime())
    }));

    const remaining = subtractIntervals([{ s: sStart, e: sEnd }], cuts);
    remaining.forEach(rem => {
      if ((rem.e - rem.s) >= 15 * 60000) {
        total += Math.round((rem.e - rem.s) / 60000);
      }
    });
  });
  return total;
});

// ═══════════════════════════════════════════════════════════════════════════
// LIFECYCLE & WATCHERS
// ═══════════════════════════════════════════════════════════════════════════

onMounted(async () => {
  initPersona();
  await loadRoomsForSurroundingPeriod();
});

watch(() => props.facilitators, () => {
  if (!selectedFacilitatorId.value && props.facilitators.length > 0) {
    initPersona();
  }
}, { deep: true });

function initPersona() {
  const savedFacId = localStorage.getItem('fwIdentityFacId');
  if (savedFacId && props.facilitators.some(f => String(idOf(f)) === String(savedFacId))) {
    selectedFacilitatorId.value = savedFacId;
    return;
  }

  // Auto-detect from currentUserPersona
  if (props.currentUserPersona?.facId) {
    selectedFacilitatorId.value = String(props.currentUserPersona.facId);
    return;
  }

  // Or from authStore user email
  const userEmail = (authStore.user?.email || '').toLowerCase();
  const matched = props.facilitators.find(f => (f.email || '').toLowerCase() === userEmail);
  if (matched) {
    selectedFacilitatorId.value = String(idOf(matched));
    return;
  }

  // Fallback to first facilitator
  if (props.facilitators[0]) {
    selectedFacilitatorId.value = String(idOf(props.facilitators[0]));
  }
}

function onFacilitatorChange() {
  if (selectedFacilitatorId.value) {
    localStorage.setItem('fwIdentityFacId', selectedFacilitatorId.value);
    globalStore.addInfo(`Profil animatrice actif : ${currentFacilitator.value?.firstName || ''} ${currentFacilitator.value?.lastName || ''}`, 'Profil');
  }
}

async function loadRoomsForSurroundingPeriod() {
  loadingRooms.value = true;
  try {
    const cur = parseKey(selectedDate.value);
    const startRange = dateKey(addDays(cur, -14));
    const endRange = dateKey(addDays(cur, 30));

    openRooms.value = await workspaceStore.fetchOpenRooms(startRange, endRange);

    // If no rooms open today, look for nearest date
    if (dayOpenRooms.value.length === 0) {
      nearestDateWithRooms.value = await workspaceStore.findNearestOpenRoomDate(selectedDate.value);
    } else {
      nearestDateWithRooms.value = null;
    }
  } finally {
    loadingRooms.value = false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DATE NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════

function navigateDay(offset) {
  const cur = parseKey(selectedDate.value);
  const next = addDays(cur, offset);
  selectedDate.value = dateKey(next);
  loadRoomsForSurroundingPeriod();
}

function goToToday() {
  selectedDate.value = todayStr;
  loadRoomsForSurroundingPeriod();
}

function onDateManualChange() {
  loadRoomsForSurroundingPeriod();
}

function goToNearestDate() {
  if (nearestDateWithRooms.value) {
    selectedDate.value = nearestDateWithRooms.value;
    loadRoomsForSurroundingPeriod();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ROOM & ANIMATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getAnimationsForRoom(roomSess) {
  const locId = idOf(roomSess.location);
  const datePfx = roomSess.date;

  return dayAnimations.value.filter(act => {
    const actLocId = idOf(act.location || act._parentSlot?.location);
    const actDate = act.startDate ? act.startDate.slice(0, 10) : '';
    return actLocId === locId && actDate === datePfx;
  });
}

function isMyAnimation(act) {
  if (!act) return false;
  const myId = String(selectedFacilitatorId.value || '');
  const myEmail = (currentFacilitatorEmail.value || '').toLowerCase().trim();

  const facs = act.facilitators || [];
  return facs.some(f => {
    if (!f) return false;
    const fId = String(idOf(f));
    const fEmail = (f.email || '').toLowerCase().trim();
    return (myId && fId === myId) || (myEmail && fEmail === myEmail);
  });
}

function isBeneficiariesOpen(roomSess) {
  const id = idOf(roomSess);
  return !!expandedBeneficiaries.value[id];
}

function toggleBeneficiaries(roomSess) {
  const id = idOf(roomSess);
  expandedBeneficiaries.value[id] = !expandedBeneficiaries.value[id];
}

function managerName(sess) {
  if (!sess || !sess.manager) return 'Non assigné';
  const m = sess.manager;
  return `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Référent';
}

function formatTime(isoStr) {
  if (!isoStr) return '--:--';
  return hhmm(new Date(isoStr));
}

function getLocationName(act) {
  return act.location?.name || act._parentSlot?.location?.name || 'Salle d\'activité';
}

function getFacilitatorsNames(act) {
  const list = act.facilitators || [];
  if (!list.length) return 'Aucun intervenant';
  return list.map(f => `${f.firstName || ''} ${f.lastName || ''}`.trim()).filter(Boolean).join(', ');
}

function getSlotParticipantsCount(act) {
  const slot = act._parentSlot || props.timeslots.find(ts => (ts.scheduledActivities || []).some(sa => idOf(sa) === idOf(act)));
  return (slot?.participants || []).length;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL & ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

function openCreateModal(options = {}) {
  editingAnimationData.value = null;
  editingSlotData.value = null;

  modalInitialDate.value = options.date || selectedDate.value;
  modalInitialRoomSession.value = options.roomSession || dayOpenRooms.value[0] || null;
  modalInitialStartTime.value = options.startTime || '10:30';
  modalInitialEndTime.value = options.endTime || '11:30';

  showModal.value = true;
}

function onEditAnimation({ animation, slot, roomSession }) {
  editingAnimationData.value = animation;
  editingSlotData.value = slot || animation._parentSlot || null;

  modalInitialDate.value = animation.startDate ? animation.startDate.slice(0, 10) : selectedDate.value;
  modalInitialRoomSession.value = roomSession || null;
  modalInitialStartTime.value = animation.startDate ? hhmm(new Date(animation.startDate)) : '10:30';
  modalInitialEndTime.value = animation.endDate ? hhmm(new Date(animation.endDate)) : '11:30';

  showModal.value = true;
}

async function onDeleteAnimation({ animation, slot }) {
  const parentSlot = slot || animation._parentSlot || null;
  const confirmed = window.confirm(`Voulez-vous vraiment retirer l'animation « ${animation.name} » du créneau de salle ?`);
  if (!confirmed) return;

  try {
    await workspaceStore.deleteAnimation(animation, parentSlot);
    await schedulerStore.fetchData();
  } catch (err) {
    globalStore.addError(err.message, 'Erreur de suppression');
  }
}

function onCheckinAnimation({ animation, slot }) {
  // Direct access to check-in page
  emit('navigate', 'check-in');
}

function closeModal() {
  showModal.value = false;
  editingAnimationData.value = null;
  editingSlotData.value = null;
}

async function onAnimationSaved() {
  await schedulerStore.fetchData();
  await loadRoomsForSurroundingPeriod();
}

function navigateTo(page) {
  emit('navigate', page);
}
</script>

<style scoped>
.facilitator-workspace-root {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.25rem;
  max-width: 1480px;
  margin: 0 auto;
  width: 100%;
}

/* ════════════════ HERO & TOOLBAR ════════════════ */
.workspace-hero {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(13, 148, 136, 0.12));
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 1.25rem 1.5rem;
  box-shadow: var(--shadow-md);
}

.hero-main-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.hero-title-box {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.hero-icon-badge {
  font-size: 1.75rem;
  width: 3.2rem;
  height: 3.2rem;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  background: var(--primary-light);
  border: 1px solid var(--primary-border);
  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.3);
}

.title-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.title-row h2 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--text-primary);
}

.hub-pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.15rem 0.55rem;
  border-radius: var(--radius-pill);
  background: var(--accent-light);
  color: var(--accent-text);
  border: 1px solid var(--accent-border);
}

.hero-sub {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Facilitator Persona Selector */
.facilitator-selector-box {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.45rem 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color-subtle);
}

.selector-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
}

.fac-select-wrapper {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.fac-mini-avatar {
  font-size: 1rem;
}

.fac-dropdown {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
  outline: none;
}

.fac-dropdown option {
  background: var(--card-bg, #0f172a);
  color: var(--text-primary);
}

/* Toolbar */
.workspace-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.85rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color-subtle);
}

.date-controls-group {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.nav-btn,
.today-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  padding: 0.45rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-btn:hover,
.today-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border-color: var(--border-color-hover);
}

.today-btn.is-today {
  background: var(--primary-light);
  color: var(--primary-text);
  border-color: var(--primary-border);
}

.date-picker-wrapper {
  position: relative;
}

.date-input {
  background: rgba(10, 16, 28, 0.85);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.65rem;
  font-size: 0.82rem;
  cursor: pointer;
}

.current-date-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: 0.35rem;
}

.date-text-primary {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.today-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.1rem 0.45rem;
  border-radius: var(--radius-pill);
  background: var(--primary);
  color: #fff;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.filter-toggle-pill {
  display: flex;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  padding: 0.2rem;
}

.filter-pill-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.3rem 0.75rem;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-pill-btn.active {
  background: var(--panel-bg-solid);
  color: var(--text-primary);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.action-btn-primary {
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  padding: 0.5rem 1.15rem;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);
}

.action-btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(13, 148, 136, 0.5);
}

/* ════════════════ STATS STRIP ════════════════ */
.stats-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 0.85rem;
}

.stat-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  background: var(--card-bg, #0f172a);
  border: 1px solid var(--border-color-subtle);
  border-radius: var(--radius-md);
  padding: 0.85rem 1.1rem;
  box-shadow: var(--shadow-sm);
}

.stat-icon {
  font-size: 1.5rem;
  width: 2.8rem;
  height: 2.8rem;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.03);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.1;
}

.stat-label {
  font-size: 0.76rem;
  color: var(--text-secondary);
}

.stat-sub-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.6rem;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.1rem 0.45rem;
  border-radius: var(--radius-pill);
}

.stat-sub-badge.transport {
  background: rgba(234, 179, 8, 0.2);
  color: #fde047;
  border: 1px solid rgba(234, 179, 8, 0.35);
}

.stat-sub-badge.mine {
  background: var(--primary-light);
  color: var(--primary-text);
  border: 1px solid var(--primary-border);
}

/* ════════════════ ROOMS CONTAINER ════════════════ */
.workspace-main-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.loading-state-card,
.empty-state-card {
  text-align: center;
  padding: 3rem 1.5rem;
  background: var(--card-bg, #0f172a);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-lg);
}

.empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 0.75rem;
}

.empty-state-card h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
}

.empty-state-card p {
  color: var(--text-secondary);
  font-size: 0.88rem;
  margin: 0.4rem 0 1.25rem;
}

.empty-actions-row {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--primary);
}

.rooms-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.room-card {
  background: var(--card-bg, #0f172a);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1.1rem 1.3rem;
  transition: border-color 0.2s ease;
}

.room-card:hover {
  border-color: var(--border-color-hover);
}

.room-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.85rem;
}

.room-title-block {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.room-card-icon {
  font-size: 1.35rem;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color-subtle);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.room-name-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.room-name {
  margin: 0;
  font-size: 1.12rem;
  font-weight: 700;
  color: var(--text-primary);
}

.room-capacity-pill {
  font-size: 0.7rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
  padding: 0.15rem 0.45rem;
  border-radius: var(--radius-pill);
}

.room-details-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex-wrap: wrap;
  margin-top: 0.25rem;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.room-hours-tag {
  color: var(--primary-text);
  font-weight: 600;
}

.room-manager-tag strong,
.room-cohort-tag strong {
  color: var(--text-primary);
}

.room-card-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.room-action-btn {
  border-radius: var(--radius-sm);
  padding: 0.45rem 0.85rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.2s ease;
}

.room-action-btn.secondary {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.room-action-btn.secondary:hover,
.room-action-btn.secondary.active {
  background: var(--accent-light);
  color: var(--accent-text);
  border-color: var(--accent-border);
}

.room-action-btn.primary {
  background: var(--primary);
  border: none;
  color: #fff;
}

.room-action-btn.primary:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.badge-count {
  font-size: 0.68rem;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-pill);
}

/* Beneficiaries Drawer */
.beneficiaries-drawer {
  background: rgba(10, 16, 28, 0.75);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.drawer-header {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.drawer-title {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--text-primary);
}

.drawer-hint {
  font-size: 0.74rem;
  color: var(--text-muted);
}

/* ════════════════ DAY'S ANIMATION PROGRAM ════════════════ */
.day-program-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: var(--card-bg, #0f172a);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 1.25rem 1.4rem;
}

.section-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.section-title-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.section-title-icon {
  font-size: 1.35rem;
}

.section-title-left h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
}

.section-subtitle {
  margin: 0.2rem 0 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.section-count-badge {
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--panel-bg-subtle);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-pill);
}

.animations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 0.85rem;
}

.anim-summary-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.65rem;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid var(--border-color-subtle);
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem;
  transition: all 0.2s ease;
}

.anim-summary-card:hover {
  border-color: var(--border-color-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.anim-summary-card.mine-card {
  border-color: rgba(13, 148, 136, 0.4);
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.1), rgba(15, 23, 42, 0.8));
}

.card-header-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.card-time-pill {
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--text-primary);
  background: rgba(0, 0, 0, 0.4);
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-sm);
}

.mine-badge {
  font-size: 0.68rem;
  font-weight: 700;
  color: #fef08a;
  background: rgba(234, 179, 8, 0.25);
  border: 1px solid rgba(234, 179, 8, 0.4);
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
}

.card-actions-quick {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-left: auto;
}

.card-tool-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: 4px;
  padding: 0.2rem 0.45rem;
  font-size: 0.74rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.card-tool-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: var(--text-primary);
}

.card-tool-btn.checkin {
  background: var(--success-light);
  color: #6ee7b7;
  border-color: rgba(16, 185, 129, 0.35);
  font-weight: 700;
}

.card-tool-btn.checkin:hover {
  background: var(--success);
  color: #fff;
}

.card-main {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.card-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.card-location {
  margin: 0;
  font-size: 0.76rem;
  color: var(--accent-text);
}

.card-desc {
  margin: 0.2rem 0 0;
  font-size: 0.76rem;
  color: var(--text-secondary);
  line-height: 1.3;
}

.card-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.card-tag {
  font-size: 0.68rem;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-muted);
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-pill);
}

.card-footer-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--border-color-subtle);
  padding-top: 0.5rem;
  font-size: 0.74rem;
  color: var(--text-secondary);
}

.card-facs {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 65%;
}

.card-facs strong {
  color: var(--text-primary);
}

.card-enrollment strong {
  color: var(--text-primary);
}

/* Expand transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 400px;
}
</style>
