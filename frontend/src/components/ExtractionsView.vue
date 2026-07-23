<template>
  <div class="extractions-container">
    <!-- Header with Tab Switcher & Date Picker -->
    <div class="view-header">
      <div class="header-title">
        <h2>📋 Extractions & Récapitulatifs</h2>
        <p class="subtitle">Genérez les fiches individuelles pour les bénéficiaires et les feuilles de route pour les gestionnaires de salle.</p>
      </div>

      <div class="header-controls">
        <div class="date-picker-wrapper">
          <label>📅 Date :</label>
          <input type="date" v-model="selectedDate" @change="fetchData" class="form-input date-input" />
        </div>

        <button class="action-btn secondary-btn" @click="printExtraction">
          🖨️ Imprimer la fiche
        </button>
      </div>
    </div>

    <!-- Mode Tabs -->
    <div class="mode-tabs">
      <button 
        class="tab-btn" 
        :class="{ active: mode === 'participant' }" 
        @click="mode = 'participant'"
      >
        👤 Extraction par Bénéficiaire
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: mode === 'manager' }" 
        @click="mode = 'manager'"
      >
        👨‍💼 Extraction par Gestionnaire de Salle
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="state-container">
      <div class="spinner"></div>
      <p>Chargement des données pour l'extraction...</p>
    </div>

    <div v-else class="extraction-body printable-area">
      <!-- ════════════════ MODE 1: PAR BÉNÉFICIAIRE ════════════════ -->
      <div v-if="mode === 'participant'" class="extraction-mode-wrapper">
        <div class="selector-card no-print">
          <label>Sélectionner un Bénéficiaire :</label>
          <select v-model="selectedParticipantId" class="form-input select-large">
            <option value="" disabled>-- Choisir un bénéficiaire --</option>
            <option v-for="p in participants" :key="p.documentId || p.id" :value="p.documentId || p.id">
              {{ p.firstName }} {{ p.lastName }} ({{ p.email }})
            </option>
          </select>
        </div>

        <div v-if="!selectedParticipant" class="empty-state">
          <span class="empty-icon">👤</span>
          <p>Veuillez sélectionner un bénéficiaire ci-dessus pour générer sa fiche d'activités.</p>
        </div>

        <div v-else class="report-card">
          <!-- Person Header -->
          <div class="report-header">
            <div class="person-badge">
              <span class="badge-avatar">👤</span>
              <div>
                <h3>{{ selectedParticipant.firstName }} {{ selectedParticipant.lastName }}</h3>
                <span class="date-label">Planning du {{ formatDate(selectedDate) }}</span>
              </div>
            </div>
            
            <div class="room-assignment-box" v-if="participantRoomSession">
              <span class="label">Accueil & Salle attribuée :</span>
              <strong>📍 {{ participantRoomSession.location?.name || 'Salle d\'accueil' }}</strong>
              <div class="sub-label">
                Gestionnaire de salle : 
                <span>👨‍💼 {{ getFacilitatorName(participantRoomSession.manager) }}</span>
              </div>
            </div>
            <div class="room-assignment-box warning" v-else>
              ⚠️ Ce bénéficiaire n'est pas encore inscrit dans une salle pour cette journée.
            </div>
          </div>

          <!-- Schedule Timeline / Table -->
          <div class="report-section">
            <h4>🎯 Programme des Activités de la Journée</h4>

            <div v-if="participantActivities.length === 0" class="no-activities">
              Aucune activité programmée pour ce bénéficiaire le {{ formatDate(selectedDate) }}.
            </div>

            <div v-else class="activities-timeline">
              <div v-for="act in participantActivities" :key="act.id" class="activity-timeline-item">
                <div class="time-col">
                  <span class="time-start">{{ formatTime(act.startDate) }}</span>
                  <span class="time-end">{{ formatTime(act.endDate) }}</span>
                </div>

                <div class="activity-card">
                  <div class="act-title-row">
                    <h5>{{ act.activityTemplate?.name || act.name || 'Activité sans titre' }}</h5>
                    <span class="location-tag">📍 {{ act.location?.name || participantRoomSession?.location?.name || 'Salle' }}</span>
                  </div>

                  <p class="act-desc" v-if="act.activityTemplate?.description">
                    {{ act.activityTemplate.description }}
                  </p>

                  <div class="act-animator">
                    <span class="anim-label">Animateur / Facilitateur :</span>
                    <strong class="anim-name">
                      👨‍🏫 {{ getEffectiveAnimatorName(act, participantRoomSession) }}
                    </strong>
                    <span v-if="isDefaultManagerAnimator(act, participantRoomSession)" class="default-badge">
                      (Gestionnaire de salle par défaut)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ════════════════ MODE 2: PAR GESTIONNAIRE DE SALLE ════════════════ -->
      <div v-else class="extraction-mode-wrapper">
        <div class="selector-card no-print">
          <label>Sélectionner un Gestionnaire / Animateur :</label>
          <select v-model="selectedFacilitatorId" class="form-input select-large">
            <option value="" disabled>-- Choisir un professionnel --</option>
            <option v-for="f in facilitators" :key="f.documentId || f.id" :value="f.documentId || f.id">
              {{ f.firstName }} {{ f.lastName }} ({{ f.email }})
            </option>
          </select>
        </div>

        <div v-if="!selectedFacilitator" class="empty-state">
          <span class="empty-icon">👨‍💼</span>
          <p>Veuillez sélectionner un gestionnaire de salle ci-dessus pour générer sa feuille de route.</p>
        </div>

        <div v-else class="report-card">
          <!-- Manager Header -->
          <div class="report-header manager-theme">
            <div class="person-badge">
              <span class="badge-avatar">👨‍💼</span>
              <div>
                <h3>{{ selectedFacilitator.firstName }} {{ selectedFacilitator.lastName }}</h3>
                <span class="role-subtitle">Feuille de Route & Gestion de Salle — {{ formatDate(selectedDate) }}</span>
              </div>
            </div>

            <div class="managed-rooms-box" v-if="managerRoomSessions.length > 0">
              <span class="label">Salle(s) sous votre responsabilité :</span>
              <div class="room-tags">
                <span v-for="s in managerRoomSessions" :key="s.id" class="room-tag">
                  📍 {{ s.location?.name }} (Capacité: {{ s.location?.capacity }})
                </span>
              </div>
            </div>
            <div class="managed-rooms-box warning" v-else>
              ℹ️ Aucune ouverture de salle attribuée à ce professionnel le {{ formatDate(selectedDate) }}.
            </div>
          </div>

          <!-- Section 1: Present Beneficiaries -->
          <div class="report-section">
            <div class="section-title-row">
              <h4>👥 Bénéficiaires Présents dans la Salle ({{ managerParticipants.length }})</h4>
            </div>

            <div v-if="managerParticipants.length === 0" class="no-participants">
              Aucun bénéficiaire affecté à la salle ce jour-là.
            </div>

            <div v-else class="participants-grid">
              <div v-for="p in managerParticipants" :key="p.id" class="participant-card">
                <span class="p-avatar">👤</span>
                <div class="p-info">
                  <strong>{{ p.firstName }} {{ p.lastName }}</strong>
                  <span class="p-email">{{ p.email }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 2: Room Activities Schedule -->
          <div class="report-section mt-4">
            <div class="section-title-row">
              <h4>🎯 Programme des Activités de la Salle</h4>
            </div>

            <div v-if="managerActivities.length === 0" class="no-activities">
              Aucune activité programmée dans votre salle pour cette journée.
            </div>

            <div v-else class="activities-table-wrapper">
              <table class="activities-table">
                <thead>
                  <tr>
                    <th>Horaire</th>
                    <th>Activité</th>
                    <th>Lieu</th>
                    <th>Animateur Effectif</th>
                    <th>Participants</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="act in managerActivities" :key="act.id">
                    <td class="time-cell">
                      {{ formatTime(act.startDate) }} - {{ formatTime(act.endDate) }}
                    </td>
                    <td class="act-name-cell">
                      <strong>{{ act.activityTemplate?.name || act.name }}</strong>
                    </td>
                    <td>{{ act.location?.name || 'Salle' }}</td>
                    <td>
                      <span class="animator-status" :class="getAnimatorStatusClass(act)">
                        {{ getAnimatorStatusText(act) }}
                      </span>
                    </td>
                    <td>
                      {{ (act.participants || []).length }} participant(s)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoomSessionStore } from '../stores/roomSessionStore';
import api from '../services/api';

const props = defineProps({
  participants: { type: Array, default: () => [] },
  facilitators: { type: Array, default: () => [] }
});

const roomSessionStore = useRoomSessionStore();

const mode = ref('participant'); // 'participant' | 'manager'
const selectedDate = ref(new Date().toISOString().slice(0, 10));
const selectedParticipantId = ref('');
const selectedFacilitatorId = ref('');
const loading = ref(false);
const allTimeSlots = ref([]);

onMounted(async () => {
  if (props.participants.length > 0) {
    selectedParticipantId.value = props.participants[0].documentId || props.participants[0].id;
  }
  if (props.facilitators.length > 0) {
    selectedFacilitatorId.value = props.facilitators[0].documentId || props.facilitators[0].id;
  }
  await fetchData();
});

watch([selectedDate], () => {
  fetchData();
});

async function fetchData() {
  loading.value = true;
  try {
    await roomSessionStore.fetchSessions(selectedDate.value);
    
    // Fetch time slots for the date
    const startOfDay = `${selectedDate.value}T00:00:00.000Z`;
    const endOfDay = `${selectedDate.value}T23:59:59.000Z`;

    const res = await api.get('/time-slots', {
      params: {
        'filters[startDate][$gte]': startOfDay,
        'filters[startDate][$lte]': endOfDay,
        'populate[0]': 'activityTemplate',
        'populate[1]': 'location',
        'populate[2]': 'facilitators',
        'populate[3]': 'participants',
        'populate[4]': 'roomSession',
        'populate[5]': 'roomSession.manager'
      }
    });
    allTimeSlots.value = res.data.data || [];
  } catch (err) {
    console.error('Erreur chargement extractions:', err);
  } finally {
    loading.value = false;
  }
}

// ─── COMPUTED DATA FOR MODE 1: BÉNÉFICIAIRE ───
const selectedParticipant = computed(() => {
  if (!selectedParticipantId.value) return null;
  return props.participants.find(p => (p.documentId || p.id) === selectedParticipantId.value);
});

const participantRoomSession = computed(() => {
  if (!selectedParticipantId.value) return null;
  return roomSessionStore.sessions.find(session => {
    const parts = session.participants || [];
    return parts.some(p => (p.documentId || p.id) === selectedParticipantId.value);
  });
});

const participantActivities = computed(() => {
  if (!selectedParticipantId.value) return [];
  return allTimeSlots.value.filter(slot => {
    const parts = slot.participants || [];
    return parts.some(p => (p.documentId || p.id) === selectedParticipantId.value);
  });
});

// ─── COMPUTED DATA FOR MODE 2: GESTIONNAIRE DE SALLE ───
const selectedFacilitator = computed(() => {
  if (!selectedFacilitatorId.value) return null;
  return props.facilitators.find(f => (f.documentId || f.id) === selectedFacilitatorId.value);
});

const managerRoomSessions = computed(() => {
  if (!selectedFacilitatorId.value) return [];
  return roomSessionStore.sessions.filter(session => {
    const mgrId = session.manager?.documentId || session.manager?.id;
    return mgrId === selectedFacilitatorId.value;
  });
});

const managerParticipants = computed(() => {
  const result = [];
  const addedIds = new Set();
  managerRoomSessions.value.forEach(session => {
    (session.participants || []).forEach(p => {
      const pid = p.documentId || p.id;
      if (!addedIds.has(pid)) {
        addedIds.add(pid);
        result.push(p);
      }
    });
  });
  return result;
});

const managerActivities = computed(() => {
  if (managerRoomSessions.value.length === 0) return [];
  const roomSessionIds = new Set(managerRoomSessions.value.map(s => s.documentId || s.id));
  const locationIds = new Set(managerRoomSessions.value.map(s => s.location?.documentId || s.location?.id).filter(Boolean));

  return allTimeSlots.value.filter(slot => {
    const slotSessionId = slot.roomSession?.documentId || slot.roomSession?.id;
    const slotLocationId = slot.location?.documentId || slot.location?.id;
    return (slotSessionId && roomSessionIds.has(slotSessionId)) || (slotLocationId && locationIds.has(slotLocationId));
  });
});

// ─── HELPERS ───
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function getFacilitatorName(f) {
  if (!f) return 'Non désigné';
  return `${f.firstName || ''} ${f.lastName || ''}`.trim();
}

function getEffectiveAnimatorName(act, session) {
  if (act.facilitators && act.facilitators.length > 0) {
    return getFacilitatorName(act.facilitators[0]);
  }
  if (session && session.manager) {
    return getFacilitatorName(session.manager);
  }
  return 'Non attribué';
}

function isDefaultManagerAnimator(act, session) {
  return (!act.facilitators || act.facilitators.length === 0) && session && session.manager;
}

function getAnimatorStatusClass(act) {
  const facilitators = act.facilitators || [];
  if (facilitators.length === 0) return 'status-default';
  const isMe = facilitators.some(f => (f.documentId || f.id) === selectedFacilitatorId.value);
  return isMe ? 'status-me' : 'status-external';
}

function getAnimatorStatusText(act) {
  const facilitators = act.facilitators || [];
  if (facilitators.length === 0) {
    return '✨ Vous (Gestionnaire par défaut)';
  }
  const isMe = facilitators.some(f => (f.documentId || f.id) === selectedFacilitatorId.value);
  if (isMe) {
    return '✨ Vous (Animateur désigné)';
  }
  const extName = getFacilitatorName(facilitators[0]);
  return `👥 ${extName} (Intervenant externe)`;
}

function printExtraction() {
  window.print();
}
</script>

<style scoped>
.extractions-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.03);
  padding: 1.25rem 1.5rem;
  border-radius: 1rem;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
}

.header-title h2 { margin: 0; font-size: 1.5rem; color: #fff; }
.subtitle { margin: 0.25rem 0 0 0; font-size: 0.9rem; color: #94a3b8; }

.header-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.date-picker-wrapper { display: flex; align-items: center; gap: 0.5rem; }

.date-input {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(15, 23, 42, 0.6);
  color: #fff;
}

.mode-tabs {
  display: flex;
  gap: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.5rem;
}

.tab-btn {
  background: none;
  border: none;
  color: #94a3b8;
  padding: 0.6rem 1.25rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: rgba(99, 102, 241, 0.2);
  color: #818cf8;
  border: 1px solid rgba(99, 102, 241, 0.4);
}

.selector-card {
  background: rgba(30, 41, 59, 0.6);
  padding: 1.25rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.select-large {
  font-size: 1rem;
  padding: 0.65rem 1rem;
}

.report-card {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 1rem;
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  backdrop-filter: blur(10px);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.25rem;
  background: rgba(15, 23, 42, 0.6);
  padding: 1.25rem 1.5rem;
  border-radius: 0.75rem;
  border-left: 4px solid #6366f1;
}

.report-header.manager-theme {
  border-left-color: #10b981;
}

.person-badge {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.badge-avatar { font-size: 2.2rem; }
.person-badge h3 { margin: 0; font-size: 1.35rem; color: #f8fafc; }
.date-label, .role-subtitle { font-size: 0.9rem; color: #94a3b8; }

.room-assignment-box, .managed-rooms-box {
  background: rgba(99, 102, 241, 0.12);
  padding: 0.75rem 1.25rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(99, 102, 241, 0.3);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.room-assignment-box.warning, .managed-rooms-box.warning {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.3);
  color: #fbbf24;
}

.activities-timeline {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.activity-timeline-item {
  display: flex;
  gap: 1.25rem;
  background: rgba(15, 23, 42, 0.5);
  padding: 1rem 1.25rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.time-col {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-width: 80px;
  background: rgba(99, 102, 241, 0.15);
  border-radius: 0.5rem;
  padding: 0.5rem;
  font-weight: bold;
  color: #818cf8;
}

.activity-card {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
}

.act-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.act-title-row h5 { margin: 0; font-size: 1.1rem; color: #f1f5f9; }

.location-tag {
  background: rgba(255, 255, 255, 0.08);
  padding: 0.25rem 0.6rem;
  border-radius: 0.4rem;
  font-size: 0.85rem;
  color: #cbd5e1;
}

.act-desc { margin: 0; font-size: 0.9rem; color: #94a3b8; }

.act-animator {
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.25rem;
}

.default-badge {
  font-size: 0.8rem;
  color: #a5b4fc;
  font-style: italic;
}

.participants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.participant-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(15, 23, 42, 0.6);
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.p-avatar { font-size: 1.2rem; }
.p-info { display: flex; flex-direction: column; }
.p-info strong { color: #f8fafc; font-size: 0.95rem; }
.p-email { font-size: 0.8rem; color: #94a3b8; }

.activities-table-wrapper {
  overflow-x: auto;
  margin-top: 0.75rem;
}

.activities-table {
  width: 100%;
  border-collapse: collapse;
}

.activities-table th, .activities-table td {
  padding: 0.8rem 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.activities-table th {
  background: rgba(15, 23, 42, 0.8);
  color: #94a3b8;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.animator-status {
  padding: 0.3rem 0.6rem;
  border-radius: 0.4rem;
  font-size: 0.85rem;
  font-weight: 500;
}

.status-me, .status-default {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.status-external {
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
}

@media print {
  body, html, .extractions-container {
    background: #ffffff !important;
    color: #000000 !important;
  }
  .no-print, .app-header, .app-nav, .mode-tabs, .view-header, .header-controls {
    display: none !important;
  }
  .report-card {
    background: #ffffff !important;
    color: #000000 !important;
    box-shadow: none !important;
    border: 1px solid #cbd5e1 !important;
    padding: 1rem !important;
  }
  .report-header {
    background: #f1f5f9 !important;
    color: #000000 !important;
    border-bottom: 2px solid #000000 !important;
    padding: 1rem !important;
  }
  .person-badge h3, .room-assignment-box, .report-section h4, .act-title-row h5, .anim-name {
    color: #000000 !important;
  }
  .activity-card {
    background: #ffffff !important;
    border: 1px solid #cbd5e1 !important;
    color: #000000 !important;
  }
  .time-col {
    background: #f1f5f9 !important;
    color: #000000 !important;
    border: 1px solid #cbd5e1 !important;
  }
  .time-start, .time-end {
    color: #000000 !important;
  }
}
</style>
