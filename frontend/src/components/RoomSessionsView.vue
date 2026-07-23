<template>
  <div class="room-sessions-container">
    <!-- Header Controls -->
    <div class="view-header">
      <div class="header-title">
        <h2>🚪 Gestion des Ouvertures de Salles</h2>
        <p class="subtitle">Gérez les ouvertures de salles, les gestionnaires référents et les affectations de bénéficiaires.</p>
      </div>

      <div class="header-actions">
        <div class="date-picker-wrapper">
          <label>📅 Date :</label>
          <input type="date" v-model="selectedDate" @change="onDateChange" class="form-input date-input" />
        </div>
        <button class="action-btn primary-btn" @click="openCreateModal">
          ➕ Ouvrir une Salle
        </button>
      </div>
    </div>

    <!-- Loading / Error States -->
    <div v-if="roomSessionStore.loading" class="state-container">
      <div class="spinner"></div>
      <p>Chargement des sessions de salle...</p>
    </div>

    <div v-else-if="roomSessionStore.error" class="state-container error">
      <span class="error-icon">⚠️</span>
      <p>{{ roomSessionStore.error }}</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="sessions.length === 0" class="empty-state">
      <span class="empty-icon">🏢</span>
      <h3>Aucune salle ouverte le {{ formatDate(selectedDate) }}</h3>
      <p>Cliquez sur "Ouvrir une Salle" pour désigner un gestionnaire et affecter des bénéficiaires.</p>
      <button class="action-btn primary-btn mt-2" @click="openCreateModal">
        ➕ Ouvrir une Salle
      </button>
    </div>

    <!-- Room Sessions Grid -->
    <div v-else class="sessions-grid">
      <div v-for="session in sessions" :key="session.documentId || session.id" class="session-card">
        <div class="card-header">
          <div class="room-info">
            <span class="room-icon">📍</span>
            <h3>{{ getRoomName(session) }}</h3>
          </div>
          <span class="capacity-badge" :class="getCapacityClass(session)">
            👥 {{ getParticipantCount(session) }} / {{ getRoomCapacity(session) }}
          </span>
        </div>

        <div class="card-body">
          <!-- Manager Info -->
          <div class="manager-banner">
            <span class="manager-icon">👨‍💼</span>
            <div>
              <span class="label">Gestionnaire de salle :</span>
              <strong class="manager-name">{{ getManagerName(session) }}</strong>
            </div>
          </div>

          <!-- Capacity Progress Bar -->
          <div class="progress-container">
            <div class="progress-bar" :style="{ width: getCapacityPercentage(session) + '%' }" :class="getCapacityClass(session)"></div>
          </div>

          <!-- Participants List -->
          <div class="participants-section">
            <h4>Bénéficiaires Présents ({{ getParticipantCount(session) }})</h4>
            <div v-if="getParticipants(session).length === 0" class="no-participants">
              Aucun bénéficiaire affecté
            </div>
            <div v-else class="participants-pills">
              <span v-for="p in getParticipants(session)" :key="p.id" class="participant-pill">
                👤 {{ p.firstName }} {{ p.lastName }}
              </span>
            </div>
          </div>

          <!-- Scheduled Activities Count -->
          <div class="activities-summary">
            <span>🎯 {{ getTimeSlots(session).length }} activité(s) programmée(s)</span>
          </div>
        </div>

        <div class="card-footer">
          <button class="icon-btn edit-btn" @click="editSession(session)" title="Modifier">
            ✏️ Modifier
          </button>
          <button class="icon-btn delete-btn" @click="confirmDelete(session)" title="Fermer / Supprimer">
            🗑️ Fermer la salle
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Form (Create / Edit Session) -->
    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>{{ isEditing ? '✏️ Modifier la Session de Salle' : '🚪 Ouvrir une Salle' }}</h3>
          <button class="close-btn" @click="closeModal">✕</button>
        </div>

        <form @submit.prevent="saveSession" class="modal-form">
          <div class="form-group">
            <label>📅 Date</label>
            <input type="date" v-model="form.date" required class="form-input" />
          </div>

          <div class="form-group">
            <label>📍 Salle / Lieu</label>
            <select v-model="form.location" required class="form-input">
              <option value="" disabled>-- Sélectionner une salle --</option>
              <option v-for="loc in locations" :key="loc.documentId || loc.id" :value="loc.documentId || loc.id">
                {{ loc.name }} (Capacité max: {{ loc.capacity }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>👨‍💼 Gestionnaire de Salle (Professionnel Référent)</label>
            <select v-model="form.manager" required class="form-input">
              <option value="" disabled>-- Sélectionner un gestionnaire --</option>
              <option v-for="fac in facilitators" :key="fac.documentId || fac.id" :value="fac.documentId || fac.id">
                {{ fac.firstName }} {{ fac.lastName }} ({{ fac.skills || 'Animateur/Soignant' }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <div class="participants-header">
              <label>👥 Bénéficiaires Affectés</label>
              <span class="capacity-warning" v-if="selectedLocationCapacity > 0" :class="{ 'warning-exceeded': form.participants.length > selectedLocationCapacity }">
                {{ form.participants.length }} / {{ selectedLocationCapacity }} max
              </span>
            </div>
            <div class="participants-checkbox-list">
              <label v-for="p in participants" :key="p.documentId || p.id" class="checkbox-item">
                <input type="checkbox" :value="p.documentId || p.id" v-model="form.participants" />
                <span>{{ p.firstName }} {{ p.lastName }}</span>
              </label>
            </div>
            <p v-if="selectedLocationCapacity > 0 && form.participants.length > selectedLocationCapacity" class="exceeded-msg">
              ⚠️ Attention : Le nombre de bénéficiaires dépasse la capacité maximale de la salle ({{ selectedLocationCapacity }}).
            </p>
          </div>

          <div v-if="formError" class="form-error">
            {{ formError }}
          </div>

          <div class="modal-actions">
            <button type="button" class="secondary-btn" @click="closeModal">Annuler</button>
            <button type="submit" class="action-btn primary-btn" :disabled="saving">
              {{ saving ? 'Enregistrement...' : (isEditing ? 'Mettre à jour' : 'Ouvrir la salle') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoomSessionStore } from '../stores/roomSessionStore';

const props = defineProps({
  locations: { type: Array, default: () => [] },
  facilitators: { type: Array, default: () => [] },
  participants: { type: Array, default: () => [] }
});

const roomSessionStore = useRoomSessionStore();

const selectedDate = ref(new Date().toISOString().slice(0, 10));
const showModal = ref(false);
const isEditing = ref(false);
const saving = ref(false);
const formError = ref('');
const currentEditingId = ref(null);

const form = ref({
  date: selectedDate.value,
  location: '',
  manager: '',
  participants: []
});

const sessions = computed(() => roomSessionStore.sessions);

const selectedLocationCapacity = computed(() => {
  if (!form.value.location) return 0;
  const loc = props.locations.find(l => (l.documentId || l.id) === form.value.location);
  return loc ? loc.capacity : 0;
});

onMounted(() => {
  roomSessionStore.fetchSessions(selectedDate.value);
});

function onDateChange() {
  roomSessionStore.fetchSessions(selectedDate.value);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function getRoomName(session) {
  return session.location?.name || 'Salle non spécifiée';
}

function getRoomCapacity(session) {
  return session.location?.capacity || 10;
}

function getManagerName(session) {
  if (!session.manager) return 'Non désigné';
  return `${session.manager.firstName || ''} ${session.manager.lastName || ''}`.trim();
}

function getParticipants(session) {
  return session.participants || [];
}

function getParticipantCount(session) {
  return getParticipants(session).length;
}

function getTimeSlots(session) {
  return session.timeSlots || [];
}

function getCapacityPercentage(session) {
  const cap = getRoomCapacity(session);
  const count = getParticipantCount(session);
  return Math.min(Math.round((count / cap) * 100), 100);
}

function getCapacityClass(session) {
  const cap = getRoomCapacity(session);
  const count = getParticipantCount(session);
  if (count > cap) return 'exceeded';
  if (count === cap) return 'full';
  if (count >= cap * 0.8) return 'warning';
  return 'normal';
}

function openCreateModal() {
  isEditing.value = false;
  currentEditingId.value = null;
  formError.value = '';
  form.value = {
    date: selectedDate.value,
    location: props.locations.length > 0 ? (props.locations[0].documentId || props.locations[0].id) : '',
    manager: props.facilitators.length > 0 ? (props.facilitators[0].documentId || props.facilitators[0].id) : '',
    participants: []
  };
  showModal.value = true;
}

function editSession(session) {
  isEditing.value = true;
  currentEditingId.value = session.documentId || session.id;
  formError.value = '';
  form.value = {
    date: session.date || selectedDate.value,
    location: session.location?.documentId || session.location?.id || '',
    manager: session.manager?.documentId || session.manager?.id || '',
    participants: (session.participants || []).map(p => p.documentId || p.id)
  };
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
}

async function saveSession() {
  formError.value = '';
  if (!form.value.location || !form.value.manager || !form.value.date) {
    formError.value = 'Veuillez remplir tous les champs obligatoires.';
    return;
  }

  saving.value = true;
  try {
    if (isEditing.value && currentEditingId.value) {
      await roomSessionStore.updateSession(currentEditingId.value, form.value);
    } else {
      await roomSessionStore.createSession(form.value);
    }
    closeModal();
  } catch (err) {
    formError.value = err.message || "Erreur lors de l'enregistrement.";
  } finally {
    saving.value = false;
  }
}

async function confirmDelete(session) {
  if (confirm(`Êtes-vous sûr de vouloir fermer la salle "${getRoomName(session)}" pour la journée du ${formatDate(session.date)} ?`)) {
    try {
      await roomSessionStore.deleteSession(session.documentId || session.id);
    } catch (err) {
      alert("Erreur lors de la fermeture : " + err.message);
    }
  }
}
</script>

<style scoped>
.room-sessions-container {
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

.header-title h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary, #ffffff);
}

.subtitle {
  margin: 0.25rem 0 0 0;
  font-size: 0.9rem;
  color: var(--text-secondary, #94a3b8);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.date-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-input {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
  background: rgba(15, 23, 42, 0.6);
  color: #ffffff;
}

.sessions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.5rem;
}

.session-card {
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 1rem;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  backdrop-filter: blur(10px);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.session-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.room-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.room-info h3 {
  margin: 0;
  font-size: 1.15rem;
  color: #f8fafc;
}

.capacity-badge {
  padding: 0.35rem 0.75rem;
  border-radius: 2rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.capacity-badge.normal {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.capacity-badge.warning {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.capacity-badge.full {
  background: rgba(99, 102, 241, 0.25);
  color: #a5b4fc;
}

.capacity-badge.exceeded {
  background: rgba(239, 68, 68, 0.25);
  color: #f87171;
}

.manager-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(99, 102, 241, 0.1);
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.manager-name {
  color: #818cf8;
  font-size: 1rem;
}

.progress-container {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  transition: width 0.3s ease;
}

.progress-bar.normal { background: #10b981; }
.progress-bar.warning { background: #f59e0b; }
.progress-bar.full { background: #6366f1; }
.progress-bar.exceeded { background: #ef4444; }

.participants-section h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: #94a3b8;
}

.participants-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.participant-pill {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.3rem 0.60rem;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  color: #cbd5e1;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.icon-btn {
  padding: 0.4rem 0.8rem;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  cursor: pointer;
  border: none;
  transition: background 0.2s;
}

.edit-btn { background: rgba(255, 255, 255, 0.1); color: #fff; }
.edit-btn:hover { background: rgba(255, 255, 255, 0.2); }

.delete-btn { background: rgba(239, 68, 68, 0.15); color: #f87171; }
.delete-btn:hover { background: rgba(239, 68, 68, 0.3); }

/* Modal Styles */
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-card {
  background: #1e293b;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
  border-radius: 1rem;
  width: 90%;
  max-width: 550px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 1.5rem;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.25rem;
  cursor: pointer;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-input {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(15, 23, 42, 0.8);
  color: #ffffff;
}

.participants-checkbox-list {
  max-height: 180px;
  overflow-y: auto;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.5rem;
  cursor: pointer;
}

.warning-exceeded {
  color: #ef4444;
  font-weight: bold;
}

.exceeded-msg {
  color: #f87171;
  font-size: 0.85rem;
  margin: 0.25rem 0 0 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
}
</style>
