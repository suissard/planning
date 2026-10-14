<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="onBackdropClick">
    <div class="modal-card">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="header-title-block">
          <span class="header-icon">{{ isEditing ? '✏️' : '🪄' }}</span>
          <div>
            <h3>{{ isEditing ? 'Modifier l\'animation programmée' : 'Programmer une nouvelle animation' }}</h3>
            <p class="header-sub">
              Paramétrez l'atelier et placez-le dans le créneau d'une salle ouverte.
            </p>
          </div>
        </div>
        <button type="button" class="close-btn" @click="close" title="Fermer">✕</button>
      </div>

      <!-- Modal Body -->
      <form @submit.prevent="handleSubmit" class="modal-body">
        <!-- Error Banner -->
        <div v-if="validationError || storeError" class="alert-banner error">
          <span>⚠️</span>
          <p>{{ validationError || storeError }}</p>
        </div>

        <!-- Warning / Soft Conflict Banner -->
        <div v-if="softWarnings.length" class="alert-banner warning">
          <span>💡</span>
          <div>
            <p v-for="(warn, wIdx) in softWarnings" :key="'warn-' + wIdx">{{ warn }}</p>
          </div>
        </div>

        <!-- SECTION 1: NATURE & MODÈLE DE L'ACTIVITÉ -->
        <div class="form-section">
          <div class="section-header">
            <span class="section-icon">🎯</span>
            <h4>1. Modèle ou Titre de l'Animation</h4>
          </div>

          <!-- Mode selector: Template vs Custom -->
          <div class="mode-pills-row">
            <button
              type="button"
              class="mode-pill-btn"
              :class="{ active: creationMode === 'template' }"
              @click="setCreationMode('template')"
            >
              📚 Choisir un modèle d'activité existant
            </button>
            <button
              type="button"
              class="mode-pill-btn"
              :class="{ active: creationMode === 'custom' }"
              @click="setCreationMode('custom')"
            >
              ✨ Atelier sur-mesure / Animation libre
            </button>
          </div>

          <!-- Template selection dropdown -->
          <div v-if="creationMode === 'template'" class="form-group mt-3">
            <label>Modèle d'activité source *</label>
            <select
              v-model="form.activityTemplateId"
              class="form-select"
              @change="onTemplateChange"
              required
            >
              <option value="" disabled>-- Sélectionner un atelier prédéfini --</option>
              <option
                v-for="act in availableTemplates"
                :key="act.documentId || act.id"
                :value="act.documentId || act.id"
              >
                {{ act.name }} ({{ act.standardDuration || 60 }} min - max {{ act.maxParticipants }} pers.)
              </option>
            </select>
          </div>

          <!-- Animation Title -->
          <div class="form-group mt-3">
            <label for="animName">Nom de l'atelier affiché au planning *</label>
            <input
              type="text"
              id="animName"
              v-model="form.name"
              required
              class="form-input"
              placeholder="Ex: Gym Douce & Équilibre, Atelier Pâtisserie, Quiz Musical..."
            />
          </div>

          <!-- Description / Materials -->
          <div class="form-group mt-2">
            <label for="animDesc">Description & Matériel pédagogique requis (optionnel)</label>
            <textarea
              id="animDesc"
              v-model="form.description"
              rows="2"
              class="form-textarea"
              placeholder="Ex: Ballons souples, cerceaux, fiches mémoire grand format, musique douce..."
            ></textarea>
          </div>

          <!-- Category Tags -->
          <div class="form-group mt-2">
            <label>Étiquettes & Catégories</label>
            <div class="tags-chips-row">
              <button
                type="button"
                v-for="tag in presetTags"
                :key="tag"
                class="tag-chip-btn"
                :class="{ active: form.tags.includes(tag) }"
                @click="toggleTag(tag)"
              >
                {{ tag }}
              </button>
            </div>
          </div>
        </div>

        <!-- SECTION 2: DATE, SALLE OUVERTE & HORAIRES -->
        <div class="form-section">
          <div class="section-header">
            <span class="section-icon">🚪</span>
            <h4>2. Salle Ouverte & Créneau Horaire</h4>
          </div>

          <div class="form-row-2">
            <!-- Date -->
            <div class="form-group">
              <label for="animDate">Date *</label>
              <input
                type="date"
                id="animDate"
                v-model="form.date"
                required
                class="form-input"
                @change="onDateChanged"
              />
            </div>

            <!-- Open Room Selector -->
            <div class="form-group">
              <label for="animRoom">Salle Ouverte *</label>
              <select
                id="animRoom"
                v-model="form.roomSessionId"
                class="form-select"
                required
                @change="onRoomSessionChange"
              >
                <option value="" disabled>
                  {{ todayOpenRooms.length ? '-- Sélectionner une salle ouverte --' : '⚠️ Aucune salle ouverte ce jour' }}
                </option>
                <option
                  v-for="sess in todayOpenRooms"
                  :key="sess.documentId || sess.id"
                  :value="sess.documentId || sess.id"
                >
                  📍 {{ sess.location?.name }} (Ouverte {{ (sess.startTime || '10:00').slice(0, 5) }} - {{ (sess.endTime || '16:00').slice(0, 5) }})
                  — Référent : {{ managerName(sess) }}
                </option>
              </select>
            </div>
          </div>

          <!-- Selected Room Banner Summary -->
          <div v-if="selectedRoomSession" class="room-session-info-card">
            <div class="info-card-header">
              <span class="room-icon">📍</span>
              <strong>{{ selectedRoomSession.location?.name }}</strong>
              <span class="room-hours-badge">
                Ouverte de {{ selectedRoomHours.start }} à {{ selectedRoomHours.end }}
              </span>
              <span class="room-cap-badge">
                Capacité salle : {{ selectedRoomSession.location?.capacity || 20 }} places
              </span>
            </div>
            <div class="info-card-sub">
              <span>👨‍🏫 Référent salle : <strong>{{ managerName(selectedRoomSession) }}</strong></span>
              <span>👥 Bénéficiaires accueillis aujourd'hui : <strong>{{ (selectedRoomSession.participants || []).length }}</strong></span>
            </div>
          </div>

          <!-- Time Range with quick buttons -->
          <div class="form-row-2 mt-3">
            <div class="form-group">
              <label for="animStart">Heure de début *</label>
              <input
                type="time"
                id="animStart"
                v-model="form.startTime"
                required
                class="form-input"
                @change="onStartTimeChange"
              />
            </div>

            <div class="form-group">
              <label for="animEnd">Heure de fin *</label>
              <input
                type="time"
                id="animEnd"
                v-model="form.endTime"
                required
                class="form-input"
              />
            </div>
          </div>

          <!-- Quick Duration Helper Buttons -->
          <div class="duration-helper-row">
            <span class="helper-label">Durée calculée : <strong>{{ calculatedDurationText }}</strong></span>
            <div class="quick-duration-btns">
              <button type="button" class="dur-btn" @click="applyDuration(30)">+30 min</button>
              <button type="button" class="dur-btn" @click="applyDuration(45)">+45 min</button>
              <button type="button" class="dur-btn" @click="applyDuration(60)">+1h</button>
              <button type="button" class="dur-btn" @click="applyDuration(90)">+1h30</button>
              <button type="button" class="dur-btn" @click="applyDuration(120)">+2h</button>
            </div>
          </div>
        </div>

        <!-- SECTION 3: ANIMATRICES & INTERVENANTS -->
        <div class="form-section">
          <div class="section-header">
            <span class="section-icon">👩‍🏫</span>
            <h4>3. Animatrices & Intervenants</h4>
            <span class="section-badge">{{ form.facilitatorIds.length }} sélectionné(e)s</span>
          </div>

          <p class="section-hint">
            Cochez les personnes qui animent cet atelier. Vos disponibilités et éventuels conflits d'horaires sont analysés en temps réel.
          </p>

          <div class="facilitators-grid">
            <div
              v-for="fac in facilitators"
              :key="fac.documentId || fac.id"
              class="fac-card-select"
              :class="{
                selected: form.facilitatorIds.includes(fac.documentId || fac.id),
                'is-conflict': checkFacilitatorConflict(fac)
              }"
              @click="toggleFacilitator(fac.documentId || fac.id)"
            >
              <div class="fac-card-left">
                <input
                  type="checkbox"
                  :checked="form.facilitatorIds.includes(fac.documentId || fac.id)"
                  @click.stop
                  @change="toggleFacilitator(fac.documentId || fac.id)"
                />
                <span class="fac-avatar">{{ getInitials(fac) }}</span>
                <div class="fac-info">
                  <span class="fac-name">{{ fac.firstName }} {{ fac.lastName }}</span>
                  <span class="fac-skills" v-if="fac.skills" :title="fac.skills">{{ fac.skills }}</span>
                </div>
              </div>

              <div class="fac-card-right">
                <span v-if="checkFacilitatorConflict(fac)" class="status-badge conflict" title="Déjà programmé(e) sur une autre animation">
                  ⚠️ Conflit horaire
                </span>
                <span v-else-if="isFacilitatorUnavailable(fac)" class="status-badge unavailable" title="Hors des horaires réguliers ou en absence">
                  🏖️ Indisponible
                </span>
                <span v-else class="status-badge available">
                  ✓ Dispo
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 4: BÉNÉFICIAIRES / PARTICIPANTS -->
        <div class="form-section">
          <div class="section-header">
            <span class="section-icon">👥</span>
            <h4>4. Inscription des Bénéficiaires</h4>
            <span class="section-badge" :class="{ 'capacity-exceeded': isOverCapacity }">
              {{ form.participantIds.length }} inscrit(s) / max {{ maxAllowedParticipants }}
            </span>
          </div>

          <!-- Quick Action Buttons -->
          <div class="participants-actions-bar">
            <button
              v-if="selectedRoomSession"
              type="button"
              class="quick-action-btn primary"
              @click="enrollAllFromRoom"
            >
              ⚡ Inscrire tous les bénéficiaires de la salle ({{ (selectedRoomSession.participants || []).length }})
            </button>
            <button
              type="button"
              class="quick-action-btn"
              @click="selectAllParticipants"
            >
              Tous
            </button>
            <button
              type="button"
              class="quick-action-btn"
              @click="form.participantIds = []"
            >
              Aucun
            </button>

            <!-- Search box -->
            <input
              type="text"
              v-model="participantSearch"
              placeholder="Filtrer un bénéficiaire..."
              class="parts-search-input"
            />
          </div>

          <!-- Capacity Exceeded Warning -->
          <div v-if="isOverCapacity" class="alert-banner warning mt-2">
            <span>⚠️</span>
            <p>
              Le nombre d'inscrits ({{ form.participantIds.length }}) dépasse la capacité recommandée
              ({{ maxAllowedParticipants }} places).
            </p>
          </div>

          <!-- Participants Grid -->
          <div class="participants-scroll-list">
            <div
              v-for="part in filteredParticipants"
              :key="part.documentId || part.id"
              class="part-select-item"
              :class="{
                selected: form.participantIds.includes(part.documentId || part.id),
                'in-room': isParticipantInSelectedRoom(part)
              }"
              @click="toggleParticipant(part.documentId || part.id)"
            >
              <input
                type="checkbox"
                :checked="form.participantIds.includes(part.documentId || part.id)"
                @click.stop
                @change="toggleParticipant(part.documentId || part.id)"
              />
              <span class="part-avatar">{{ getInitials(part) }}</span>
              <div class="part-meta">
                <div class="part-name-row">
                  <span class="part-name">{{ part.firstName }} {{ part.lastName }}</span>
                  <span v-if="isParticipantInSelectedRoom(part)" class="room-member-pill" title="Assigné(e) à cette salle pour la journée">
                    📍 Dans la salle
                  </span>
                  <span v-if="part.transport" class="transport-pill" title="Prise en charge du transport">
                    🚐 Transport
                  </span>
                </div>
                <span v-if="part.other" class="part-notes" :title="part.other">
                  ⚕️ {{ part.other }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer Actions -->
        <div class="modal-footer">
          <button type="button" class="cancel-btn" @click="close" :disabled="saving">
            Annuler
          </button>
          <button type="submit" class="submit-btn" :disabled="saving">
            <span v-if="saving" class="spinner-small"></span>
            <span>{{ isEditing ? 'Enregistrer les modifications' : 'Programmer l\'animation' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import {
  idOf,
  pad,
  hhmm,
  atTime,
  diffMinutes,
  fmtDuration
} from '../../utils/facilitatorPlanningHelpers';
import { useFacilitatorWorkspaceStore } from '../../stores/facilitatorWorkspaceStore';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  editingAnimation: { type: Object, default: null },
  editingSlot: { type: Object, default: null },
  initialDate: { type: String, default: '' },
  initialRoomSession: { type: Object, default: null },
  initialStartTime: { type: String, default: '' },
  initialEndTime: { type: String, default: '' },
  openRooms: { type: Array, default: () => [] },
  activities: { type: Array, default: () => [] },
  facilitators: { type: Array, default: () => [] },
  participants: { type: Array, default: () => [] },
  timeslots: { type: Array, default: () => [] },
  currentFacilitatorId: { type: [String, Number], default: null }
});

const emit = defineEmits(['close', 'saved']);

const workspaceStore = useFacilitatorWorkspaceStore();

const saving = computed(() => workspaceStore.saving);
const storeError = ref('');
const validationError = ref('');

const creationMode = ref('template'); // 'template' | 'custom'
const participantSearch = ref('');

const presetTags = [
  'Cognitif',
  'Moteur',
  'Bien-être',
  'Social',
  'Créatif',
  'Musique',
  'Cuisine & Goûter',
  'Extérieur',
  'Relaxation',
  'Sensorielles'
];

const form = ref({
  activityTemplateId: '',
  name: '',
  description: '',
  tags: [],
  date: '',
  roomSessionId: '',
  startTime: '10:30',
  endTime: '11:30',
  facilitatorIds: [],
  participantIds: []
});

const isEditing = computed(() => !!props.editingAnimation);

// Templates available
const availableTemplates = computed(() => {
  return [...props.activities].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr'));
});

// Rooms open today
const todayOpenRooms = computed(() => {
  if (!form.value.date) return [];
  return props.openRooms.filter(r => r.date === form.value.date);
});

// Selected Room Session
const selectedRoomSession = computed(() => {
  if (!form.value.roomSessionId) return null;
  return todayOpenRooms.value.find(r => (r.documentId || r.id) === form.value.roomSessionId) || null;
});

const selectedRoomHours = computed(() => {
  if (!selectedRoomSession.value) return { start: '10:00', end: '16:00' };
  return {
    start: (selectedRoomSession.value.startTime || '10:00').slice(0, 5),
    end: (selectedRoomSession.value.endTime || '16:00').slice(0, 5)
  };
});

const calculatedDurationMin = computed(() => {
  if (!form.value.startTime || !form.value.endTime || !form.value.date) return 0;
  const s = atTime(form.value.date, form.value.startTime);
  const e = atTime(form.value.date, form.value.endTime);
  return diffMinutes(s, e);
});

const calculatedDurationText = computed(() => {
  const min = calculatedDurationMin.value;
  if (min <= 0) return 'Horaires invalides';
  return fmtDuration(min);
});

const maxAllowedParticipants = computed(() => {
  const roomCap = selectedRoomSession.value?.location?.capacity || 20;
  if (form.value.activityTemplateId) {
    const t = props.activities.find(a => (a.documentId || a.id) === form.value.activityTemplateId);
    if (t?.maxParticipants) {
      return Math.min(roomCap, t.maxParticipants);
    }
  }
  return roomCap;
});

const isOverCapacity = computed(() => {
  return form.value.participantIds.length > maxAllowedParticipants.value;
});

const filteredParticipants = computed(() => {
  const q = participantSearch.value.toLowerCase().trim();
  let list = [...props.participants];

  // Prioritize participants belonging to the selected room session
  if (selectedRoomSession.value) {
    const roomPartIds = new Set((selectedRoomSession.value.participants || []).map(idOf));
    list.sort((a, b) => {
      const aIn = roomPartIds.has(idOf(a)) ? 1 : 0;
      const bIn = roomPartIds.has(idOf(b)) ? 1 : 0;
      if (aIn !== bIn) return bIn - aIn;
      return `${a.lastName || ''}`.localeCompare(`${b.lastName || ''}`, 'fr');
    });
  }

  if (!q) return list;
  return list.filter(p => {
    const name = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
    const other = (p.other || '').toLowerCase();
    return name.includes(q) || other.includes(q);
  });
});

// Soft warnings (informative, non blocking)
const softWarnings = computed(() => {
  const warns = [];
  if (selectedRoomSession.value) {
    const { start: roomS, end: roomE } = selectedRoomHours.value;
    if (form.value.startTime < roomS) {
      warns.push(`L'animation démarre à ${form.value.startTime}, avant l'ouverture de la salle (${roomS}).`);
    }
    if (form.value.endTime > roomE) {
      warns.push(`L'animation se termine à ${form.value.endTime}, après la fermeture de la salle (${roomE}).`);
    }
  }
  return warns;
});

// Watch opening of modal to initialize form
watch(() => props.isOpen, (open) => {
  if (open) {
    initForm();
  }
}, { immediate: true });

function initForm() {
  storeError.value = '';
  validationError.value = '';
  participantSearch.value = '';

  if (props.editingAnimation) {
    // Mode EDIT
    const act = props.editingAnimation;
    const sDate = new Date(act.startDate);
    const eDate = new Date(act.endDate);
    const templateId = act.activityTemplate ? idOf(act.activityTemplate) : '';

    creationMode.value = templateId ? 'template' : 'custom';

    // Find parent room session
    let rsId = '';
    if (props.initialRoomSession) {
      rsId = idOf(props.initialRoomSession);
    } else {
      const dStr = act.startDate.slice(0, 10);
      const locId = idOf(act.location || props.editingSlot?.location);
      const matching = props.openRooms.find(r => r.date === dStr && idOf(r.location) === locId);
      if (matching) rsId = idOf(matching);
    }

    form.value = {
      activityTemplateId: templateId,
      name: act.name || '',
      description: act.description || '',
      tags: Array.isArray(act.tags) ? [...act.tags] : [],
      date: act.startDate ? act.startDate.slice(0, 10) : props.initialDate,
      roomSessionId: rsId || (todayOpenRooms.value[0] ? idOf(todayOpenRooms.value[0]) : ''),
      startTime: hhmm(sDate),
      endTime: hhmm(eDate),
      facilitatorIds: (act.facilitators || []).map(idOf),
      participantIds: (props.editingSlot?.participants || []).map(idOf)
    };
  } else {
    // Mode CREATE
    const defaultDate = props.initialDate || new Date().toISOString().slice(0, 10);
    const roomsOnDate = props.openRooms.filter(r => r.date === defaultDate);
    const defaultRoom = props.initialRoomSession || roomsOnDate[0] || null;

    let defaultFacs = [];
    if (props.currentFacilitatorId) {
      defaultFacs = [String(props.currentFacilitatorId)];
    } else if (defaultRoom?.manager) {
      defaultFacs = [String(idOf(defaultRoom.manager))];
    }

    creationMode.value = 'template';
    form.value = {
      activityTemplateId: availableTemplates.value[0] ? idOf(availableTemplates.value[0]) : '',
      name: availableTemplates.value[0]?.name || '',
      description: availableTemplates.value[0]?.description || '',
      tags: availableTemplates.value[0]?.tags ? [...availableTemplates.value[0].tags] : ['Convivialité'],
      date: defaultDate,
      roomSessionId: defaultRoom ? idOf(defaultRoom) : '',
      startTime: props.initialStartTime || '10:30',
      endTime: props.initialEndTime || '11:30',
      facilitatorIds: defaultFacs,
      participantIds: defaultRoom ? (defaultRoom.participants || []).map(idOf) : []
    };

    if (form.value.activityTemplateId) {
      onTemplateChange();
    }
  }
}

function setCreationMode(mode) {
  creationMode.value = mode;
  if (mode === 'template' && !form.value.activityTemplateId && availableTemplates.value.length > 0) {
    form.value.activityTemplateId = idOf(availableTemplates.value[0]);
    onTemplateChange();
  }
}

function onTemplateChange() {
  const t = props.activities.find(a => idOf(a) === form.value.activityTemplateId);
  if (t) {
    form.value.name = t.name;
    form.value.description = t.description || '';
    if (Array.isArray(t.tags) && t.tags.length) {
      form.value.tags = [...t.tags];
    }
    if (t.standardDuration && form.value.startTime && form.value.date) {
      const s = atTime(form.value.date, form.value.startTime);
      const e = new Date(s.getTime() + t.standardDuration * 60000);
      form.value.endTime = hhmm(e);
    }
  }
}

function onDateChanged() {
  const rooms = todayOpenRooms.value;
  if (rooms.length > 0) {
    if (!rooms.some(r => idOf(r) === form.value.roomSessionId)) {
      form.value.roomSessionId = idOf(rooms[0]);
      onRoomSessionChange();
    }
  } else {
    form.value.roomSessionId = '';
  }
}

function onRoomSessionChange() {
  const sess = selectedRoomSession.value;
  if (!sess) return;
  // If no participants selected, suggest enrolling room participants
  if (form.value.participantIds.length === 0 && (sess.participants || []).length > 0) {
    form.value.participantIds = sess.participants.map(idOf);
  }
  // Suggest manager as facilitator if empty
  if (form.value.facilitatorIds.length === 0 && sess.manager) {
    form.value.facilitatorIds = [idOf(sess.manager)];
  }
}

function onStartTimeChange() {
  if (!form.value.startTime || !form.value.date) return;
  const dur = calculatedDurationMin.value > 0 ? calculatedDurationMin.value : 60;
  const s = atTime(form.value.date, form.value.startTime);
  const e = new Date(s.getTime() + dur * 60000);
  form.value.endTime = hhmm(e);
}

function applyDuration(minutes) {
  if (!form.value.startTime || !form.value.date) return;
  const s = atTime(form.value.date, form.value.startTime);
  const e = new Date(s.getTime() + minutes * 60000);
  form.value.endTime = hhmm(e);
}

function toggleTag(tag) {
  const idx = form.value.tags.indexOf(tag);
  if (idx === -1) form.value.tags.push(tag);
  else form.value.tags.splice(idx, 1);
}

function toggleFacilitator(id) {
  const strId = String(id);
  const idx = form.value.facilitatorIds.findIndex(f => String(f) === strId);
  if (idx === -1) form.value.facilitatorIds.push(strId);
  else form.value.facilitatorIds.splice(idx, 1);
}

function toggleParticipant(id) {
  const strId = String(id);
  const idx = form.value.participantIds.findIndex(p => String(p) === strId);
  if (idx === -1) form.value.participantIds.push(strId);
  else form.value.participantIds.splice(idx, 1);
}

function enrollAllFromRoom() {
  if (!selectedRoomSession.value) return;
  const pIds = (selectedRoomSession.value.participants || []).map(idOf);
  form.value.participantIds = Array.from(new Set([...form.value.participantIds, ...pIds]));
}

function selectAllParticipants() {
  form.value.participantIds = props.participants.map(idOf);
}

function isParticipantInSelectedRoom(part) {
  if (!selectedRoomSession.value) return false;
  const pId = idOf(part);
  return (selectedRoomSession.value.participants || []).some(p => idOf(p) === pId);
}

function checkFacilitatorConflict(fac) {
  if (!fac || !form.value.date || !form.value.startTime || !form.value.endTime) return false;
  const fId = idOf(fac);
  const startMs = atTime(form.value.date, form.value.startTime).getTime();
  const endMs = atTime(form.value.date, form.value.endTime).getTime();

  return props.timeslots.some(slot => {
    // Ignore current slot being edited
    if (props.editingSlot && idOf(slot) === idOf(props.editingSlot)) return false;
    const sDate = new Date(slot.startDate).getTime();
    const eDate = new Date(slot.endDate).getTime();
    if (startMs < eDate && endMs > sDate) {
      return (slot.facilitators || []).some(f => idOf(f) === fId);
    }
    return false;
  });
}

function isFacilitatorUnavailable(fac) {
  if (!fac || !form.value.date) return false;
  // Specific absences
  const dStart = atTime(form.value.date, form.value.startTime || '10:00').getTime();
  const dEnd = atTime(form.value.date, form.value.endTime || '11:00').getTime();
  const unavails = Array.isArray(fac.specificUnavailabilities) ? fac.specificUnavailabilities : [];
  return unavails.some(u => {
    const s = new Date(u.startDate).getTime();
    const e = new Date(u.endDate).getTime();
    return dStart < e && dEnd > s;
  });
}

function managerName(sess) {
  if (!sess || !sess.manager) return 'Non assigné';
  const m = sess.manager;
  return `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Référent';
}

function getInitials(p) {
  return `${(p?.firstName || '?')[0] || ''}${(p?.lastName || '')[0] || ''}`.toUpperCase();
}

function onBackdropClick() {
  if (!saving.value) close();
}

function close() {
  emit('close');
}

async function handleSubmit() {
  validationError.value = '';
  storeError.value = '';

  if (!form.value.name.trim()) {
    validationError.value = 'Le nom de l\'animation est obligatoire.';
    return;
  }
  if (!form.value.date) {
    validationError.value = 'La date est requise.';
    return;
  }
  if (!form.value.roomSessionId) {
    validationError.value = 'Veuillez sélectionner une salle ouverte pour placer l\'animation.';
    return;
  }
  if (calculatedDurationMin.value <= 0) {
    validationError.value = 'L\'heure de début doit être strictement antérieure à l\'heure de fin.';
    return;
  }

  const sess = selectedRoomSession.value;
  if (!sess) {
    validationError.value = 'Salle ouverte introuvable.';
    return;
  }

  const sDate = atTime(form.value.date, form.value.startTime);
  const eDate = atTime(form.value.date, form.value.endTime);

  const locId = idOf(sess.location);

  // Find or craft parent time slot
  let existingSlotId = props.editingSlot ? idOf(props.editingSlot) : null;
  let newSlotData = null;

  if (!existingSlotId) {
    // Check if an existing slot in this room exactly matches or covers this range
    const coveringSlot = props.timeslots.find(ts => {
      if (idOf(ts.location) !== locId) return false;
      const tsS = new Date(ts.startDate).getTime();
      const tsE = new Date(ts.endDate).getTime();
      return tsS <= sDate.getTime() && tsE >= eDate.getTime();
    });

    if (coveringSlot) {
      existingSlotId = idOf(coveringSlot);
    } else {
      // Craft new slot spanning the animation
      newSlotData = {
        location: locId,
        startDate: sDate.toISOString(),
        endDate: eDate.toISOString(),
        roomSession: idOf(sess),
        participants: form.value.participantIds,
        facilitators: form.value.facilitatorIds
      };
    }
  }

  const payload = {
    name: form.value.name.trim(),
    description: form.value.description.trim(),
    startDate: sDate.toISOString(),
    endDate: eDate.toISOString(),
    activityTemplate: form.value.activityTemplateId || null,
    facilitators: form.value.facilitatorIds,
    location: locId,
    tags: form.value.tags,
    timeSlotId: existingSlotId,
    newSlot: newSlotData
  };

  try {
    const existingAnimId = props.editingAnimation ? idOf(props.editingAnimation) : null;
    await workspaceStore.saveAnimation(payload, existingAnimId);
    emit('saved');
    close();
  } catch (err) {
    storeError.value = err.message || 'Erreur lors de l\'enregistrement.';
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.modal-card {
  width: 100%;
  max-width: 820px;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  background: var(--card-bg, #0f172a);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: modalEnter 0.25s ease-out;
}

@keyframes modalEnter {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Modal Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1.4rem;
  border-bottom: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.02);
}

.header-title-block {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon {
  font-size: 1.5rem;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  background: var(--primary-light);
  border: 1px solid var(--primary-border);
}

.header-title-block h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
}

.header-sub {
  margin: 0.2rem 0 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 1.25rem;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.35rem 0.6rem;
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

/* Modal Body */
.modal-body {
  padding: 1.25rem 1.4rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Alert Banner */
.alert-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
}

.alert-banner.error {
  background: var(--danger-light);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
}

.alert-banner.warning {
  background: var(--warm-light);
  border: 1px solid var(--warm-border);
  color: var(--warm-text);
}

.alert-banner p {
  margin: 0.15rem 0;
}

/* Form Sections */
.form-section {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color-subtle);
  border-radius: var(--radius-md);
  padding: 1rem 1.15rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
}

.section-icon {
  font-size: 1.05rem;
}

.section-header h4 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.section-badge {
  margin-left: auto;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.15rem 0.55rem;
  border-radius: var(--radius-pill);
  background: var(--primary-light);
  color: var(--primary-text);
  border: 1px solid var(--primary-border);
}

.section-badge.capacity-exceeded {
  background: var(--danger-light);
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.4);
}

.section-hint {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: -0.35rem 0 0.85rem;
}

/* Mode Pills */
.mode-pills-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.mode-pill-btn {
  background: var(--panel-bg-subtle);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  padding: 0.55rem 0.75rem;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-pill-btn:hover {
  border-color: var(--border-color-hover);
  color: var(--text-primary);
}

.mode-pill-btn.active {
  background: var(--primary-light);
  color: var(--primary-text);
  border-color: var(--primary);
  box-shadow: 0 0 10px rgba(13, 148, 136, 0.25);
}

/* Form inputs */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.form-input,
.form-select,
.form-textarea {
  background: rgba(10, 16, 28, 0.8);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 0.55rem 0.75rem;
  color: var(--text-primary);
  font-size: 0.88rem;
  transition: all 0.2s ease;
  width: 100%;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.2);
}

.form-textarea {
  resize: vertical;
}

/* Tags Chips */
.tags-chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.tag-chip-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: var(--radius-pill);
  padding: 0.2rem 0.6rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tag-chip-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}

.tag-chip-btn.active {
  background: var(--accent-light);
  color: var(--accent-text);
  border-color: var(--accent);
  font-weight: 600;
}

/* Room Session Info Card */
.room-session-info-card {
  margin-top: 0.75rem;
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.12), rgba(2, 132, 199, 0.08));
  border: 1px solid var(--primary-border);
  border-radius: var(--radius-sm);
  padding: 0.65rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.info-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 0.86rem;
  color: var(--text-primary);
}

.room-hours-badge,
.room-cap-badge {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  border-radius: var(--radius-pill);
  background: rgba(0, 0, 0, 0.3);
  color: var(--primary-text);
}

.info-card-sub {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  font-size: 0.76rem;
  color: var(--text-secondary);
}

.info-card-sub strong {
  color: var(--text-primary);
}

/* Duration Helper */
.duration-helper-row {
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.helper-label {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.helper-label strong {
  color: var(--accent-text);
}

.quick-duration-btns {
  display: flex;
  gap: 0.35rem;
}

.dur-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  padding: 0.2rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
}

.dur-btn:hover {
  background: var(--primary-light);
  color: var(--primary-text);
  border-color: var(--primary-border);
}

/* Facilitators Grid */
.facilitators-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.5rem;
}

.fac-card-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.7rem;
  border-radius: var(--radius-sm);
  background: var(--panel-bg-subtle);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.fac-card-select:hover {
  border-color: var(--border-color-hover);
  background: rgba(255, 255, 255, 0.04);
}

.fac-card-select.selected {
  background: rgba(13, 148, 136, 0.15);
  border-color: var(--primary);
}

.fac-card-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.fac-avatar {
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 50%;
  background: var(--accent-light);
  color: var(--accent-text);
  border: 1px solid var(--accent-border);
  font-size: 0.68rem;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.fac-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.fac-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fac-skills {
  font-size: 0.68rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: var(--radius-pill);
  flex-shrink: 0;
}

.status-badge.available {
  background: var(--success-light);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.status-badge.unavailable {
  background: rgba(245, 158, 11, 0.15);
  color: var(--warm-text);
  border: 1px solid var(--warm-border);
}

.status-badge.conflict {
  background: var(--danger-light);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

/* Participants Bar */
.participants-actions-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.quick-action-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  padding: 0.3rem 0.65rem;
  font-size: 0.74rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.quick-action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.quick-action-btn.primary {
  background: var(--primary-light);
  color: var(--primary-text);
  border-color: var(--primary-border);
}

.quick-action-btn.primary:hover {
  background: var(--primary);
  color: #fff;
}

.parts-search-input {
  margin-left: auto;
  background: rgba(10, 16, 28, 0.8);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 0.3rem 0.65rem;
  font-size: 0.76rem;
  color: var(--text-primary);
  width: 180px;
}

.parts-search-input:focus {
  outline: none;
  border-color: var(--primary);
}

.participants-scroll-list {
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid var(--border-color-subtle);
  border-radius: var(--radius-sm);
  background: rgba(10, 16, 28, 0.4);
  padding: 0.4rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.4rem;
}

.part-select-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.55rem;
  border-radius: var(--radius-sm);
  background: var(--panel-bg-subtle);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.part-select-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.part-select-item.selected {
  background: rgba(13, 148, 136, 0.15);
  border-color: var(--primary-border);
}

.part-select-item.in-room {
  border-left: 3px solid var(--accent);
}

.part-avatar {
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
  font-size: 0.62rem;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.part-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.part-name-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.part-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-primary);
}

.room-member-pill {
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--accent-text);
  background: var(--accent-light);
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
}

.transport-pill {
  font-size: 0.62rem;
  font-weight: 700;
  color: #fde047;
  background: rgba(234, 179, 8, 0.2);
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
}

.part-notes {
  font-size: 0.66rem;
  color: var(--warm-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Modal Footer */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.4rem;
  border-top: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.02);
}

.cancel-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  padding: 0.55rem 1.1rem;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.submit-btn {
  background: var(--primary);
  border: none;
  color: #fff;
  border-radius: var(--radius-sm);
  padding: 0.55rem 1.35rem;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);
}

.submit-btn:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(13, 148, 136, 0.5);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner-small {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .form-row-2 {
    grid-template-columns: 1fr;
  }
  .mode-pills-row {
    grid-template-columns: 1fr;
  }
}
</style>
