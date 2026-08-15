<template>
  <div class="client-planning-wrapper">
    <!-- ════════════════ USER WELCOME & SUMMARY BAR ════════════════ -->
    <div class="user-welcome-bar no-print">
      <div class="user-greeting-info">
        <div class="user-avatar-circle">
          {{ personaIcon }}
        </div>
        <div class="user-greeting-text">
          <h1 class="user-greeting-title">
            {{ userGreetingTitle }}
          </h1>
          <p class="user-greeting-subtitle">
            <span class="user-persona-tag">{{ personaRoleLabel }}</span>
            <span class="user-stats-text" v-if="activeBaseSlots.length > 0">
              • <strong>{{ upcomingSlotsCount }}</strong> activité(s) à venir ({{ activeBaseSlots.length }} au total)
            </span>
            <span class="user-stats-text" v-else>
              • Aucun créneau planifié pour le moment
            </span>
          </p>
        </div>
      </div>
    </div>

    <!-- ════════════════ NEXT ACTIVITY HERO CARD ════════════════ -->
    <div class="next-activity-hero no-print" v-if="nextSlot">
      <div class="hero-glow"></div>
      <div class="hero-content">
        <div class="hero-left">
          <div class="hero-badge-row">
            <span class="hero-label">⚡ Prochaine activité</span>
            <span class="hero-status-pill" :class="getNextSlotStatusClass(nextSlot)">
              {{ getNextSlotStatusLabel(nextSlot) }}
            </span>
          </div>
          <h2 class="hero-activity-name">{{ nextSlot.activityTemplate?.name || 'Activité' }}</h2>
          <p class="hero-activity-desc" v-if="nextSlot.activityTemplate?.description">
            {{ nextSlot.activityTemplate.description }}
          </p>
          <div class="hero-meta">
            <span class="hero-date-badge">
              📅 {{ formatHeroDate(nextSlot.startDate) }}
            </span>
            <span class="hero-time-badge">
              🕒 {{ formatTimeOnly(nextSlot.startDate) }} — {{ formatTimeOnly(nextSlot.endDate) }}
              <span class="hero-duration">({{ getDurationMinutes(nextSlot) }} min)</span>
            </span>
            <span class="hero-location-badge" v-if="nextSlot.location">
              📍 {{ nextSlot.location.name }}
            </span>
          </div>
          <div class="hero-people" v-if="nextSlot.facilitators?.length">
            <span class="hero-fac" v-for="fac in nextSlot.facilitators" :key="fac.documentId || fac.id">
              👨‍🏫 {{ fac.firstName }} {{ fac.lastName }}
            </span>
          </div>
        </div>
        <div class="hero-right">
          <div class="hero-countdown">
            <span class="countdown-label">Début prévu :</span>
            <span class="countdown-value">{{ countdownText }}</span>
          </div>
          <button class="hero-see-btn" @click="jumpToSlot(nextSlot)">
            Voir dans le planning →
          </button>
        </div>
      </div>
    </div>

    <!-- No upcoming hero fallback -->
    <div class="next-activity-hero hero-empty no-print" v-else-if="!loading">
      <div class="hero-content">
        <div class="hero-left">
          <span class="hero-label">📅 Planning</span>
          <h3 class="hero-empty-title">Aucune activité à venir</h3>
          <p class="hero-empty-text">Toutes les activités prévues sont terminées, ou aucun créneau n'est planifié pour le moment.</p>
        </div>
      </div>
    </div>

    <!-- ════════════════ REFERENCE AVAILABILITIES BANNER ════════════════ -->
    <div v-if="weeklyAvailabilityList.length > 0" class="weekly-avail-bar no-print">
      <span class="avail-title">🗓️ Disponibilités de référence :</span>
      <div class="avail-pills">
        <span 
          v-for="day in weeklyAvailabilityList" 
          :key="day.key" 
          class="avail-pill" 
          :class="{ 'avail-yes': day.isAvailable, 'avail-no': !day.isAvailable }"
        >
          <strong class="day-abbr">{{ day.name.slice(0, 3) }} :</strong>
          <span class="day-hours" v-if="day.isAvailable">{{ day.periods.map(p => `${p.start}-${p.end}`).join(', ') }}</span>
          <span class="day-hours off" v-else>Indispo.</span>
        </span>
      </div>
    </div>

    <!-- ════════════════ MAIN VIEW MODE SWITCHER ════════════════ -->
    <div class="planning-main-switcher no-print">
      <div class="view-mode-tabs">
        <button 
          class="view-mode-tab-btn" 
          :class="{ active: viewMode === 'day' }" 
          @click="viewMode = 'day'"
        >
          <span class="tab-btn-icon">☀️</span>
          <span class="tab-btn-text">Vue Journée</span>
        </button>
        <button 
          class="view-mode-tab-btn" 
          :class="{ active: viewMode === 'week' }" 
          @click="viewMode = 'week'"
        >
          <span class="tab-btn-icon">📅</span>
          <span class="tab-btn-text">Vue Semaine</span>
        </button>
      </div>

      <!-- Quick Search Bar -->
      <div class="planning-search-box">
        <span class="search-icon">🔍</span>
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Rechercher une activité, un lieu, un animateur..." 
          class="search-input"
        />
        <button v-if="searchQuery" class="clear-search-btn" @click="searchQuery = ''">✕</button>
      </div>

      <!-- Action Controls (En haut à droite du composant) -->
      <div class="planning-actions">
        <button 
          class="action-btn print-btn" 
          @click="printPlanning" 
          :title="`Imprimer ${viewMode === 'day' ? 'la journée' : 'la semaine'}`"
        >
          🖨️ {{ viewMode === 'day' ? 'Imprimer la journée' : 'Imprimer la semaine' }}
        </button>
      </div>
    </div>

    <!-- ════════════════ FILTER TOOLBAR (EPURÉE) ════════════════ -->
    <div class="planning-filter-bar no-print" v-if="userRelevantSlots && userRelevantSlots.length > 0 && timeslots.length > userRelevantSlots.length">
      <!-- Scope Filter: Mon Planning vs Toutes les activités (si plusieurs) -->
      <div class="filter-tabs scope-filter-tabs">
        <button 
          class="filter-tab scope-btn" 
          :class="{ active: scopeFilter === 'mine' }" 
          @click="scopeFilter = 'mine'"
        >
          👤 {{ scopeFilterLabel }} ({{ userRelevantSlots.length }})
        </button>
        <button 
          class="filter-tab scope-btn" 
          :class="{ active: scopeFilter === 'all' }" 
          @click="scopeFilter = 'all'"
        >
          🌐 Toutes les activités ({{ timeslots.length }})
        </button>
      </div>
    </div>

    <!-- ════════════════ 1. VUE JOURNÉE (AFFICHAGE PAR DÉFAUT ÉPURÉ & NAVIGATION JOUR PAR JOUR) ════════════════ -->
    <div v-if="viewMode === 'day'" class="day-view-section printable-day-area">
      <!-- Day Navigation & Pagination Card -->
      <div class="day-navigator-card no-print">
        <!-- Main Day Navigation Bar -->
        <div class="day-nav-main-bar">
          <button class="nav-day-btn prev-btn" @click="goToPreviousDay" title="Afficher la journée précédente">
            <span class="btn-arrow">←</span>
            <span class="btn-label">Jour précédent</span>
          </button>

          <div class="day-center-info">
            <div class="day-badge-row">
              <span class="day-relative-pill" :class="{ 'is-today': isSelectedDayToday }">
                {{ selectedDayRelativeLabel }}
              </span>
              <button 
                v-if="!isSelectedDayToday" 
                class="jump-today-btn" 
                @click="goToToday" 
                title="Revenir à la date d'aujourd'hui"
              >
                Revenir à Aujourd'hui
              </button>
            </div>

            <div class="day-date-heading-row">
              <h2 class="day-formatted-heading">{{ selectedDayFormattedFull }}</h2>
              
              <!-- Quick Date Picker Button -->
              <label class="date-picker-button-label" title="Choisir une date précise dans le calendrier">
                <span class="date-picker-icon">📅</span>
                <span class="date-picker-text">Changer</span>
                <input 
                  type="date" 
                  v-model="selectedDayDateStr" 
                  class="hidden-native-date-input"
                />
              </label>
            </div>

            <div class="day-stat-summary">
              <span v-if="selectedDaySlots.length > 0" class="stat-has-activities">
                🎯 <strong>{{ selectedDaySlots.length }}</strong> activité{{ selectedDaySlots.length > 1 ? 's' : '' }} • Durée cumulée : <strong>{{ selectedDayTotalDurationFormatted }}</strong>
              </span>
              <span v-else class="stat-empty">
                🍃 Aucune activité programmée sur cette journée
              </span>
            </div>
          </div>

          <button class="nav-day-btn next-btn" @click="goToNextDay" title="Afficher la journée suivante">
            <span class="btn-label">Jour suivant</span>
            <span class="btn-arrow">→</span>
          </button>
        </div>

        <!-- Day Carousel Strip (Mini Calendar Pager) -->
        <div class="day-strip-container">
          <div class="day-strip-scroll">
            <button 
              v-for="d in dayStripList" 
              :key="d.dateKey" 
              class="day-strip-pill"
              :class="{ 
                'is-active': d.dateKey === selectedDayDateStr,
                'is-today': d.isToday,
                'has-events': d.slotCount > 0
              }"
              @click="goToDay(d.dateKey)"
              :title="`Aller au ${d.dayName} ${d.dayNumber} ${d.monthName}`"
            >
              <span class="pill-weekday">{{ d.dayName }}</span>
              <span class="pill-daynum">{{ d.dayNumber }}</span>
              <span class="pill-month">{{ d.monthName }}</span>
              <span v-if="d.slotCount > 0" class="pill-badge" :title="`${d.slotCount} activité(s)`">
                {{ d.slotCount }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Printable A4 Header -->
      <div class="print-only-header">
        <div class="print-brand-badge">EHPAD LES ÉCRIVAINS — ACCUEIL DE JOUR • GUÉRANDE</div>
        <h2>📋 Planning de la journée du {{ selectedDayFormattedFull }}</h2>
        <p class="print-sub-info">
          <strong>Bénéficiaire / Résident :</strong> {{ displayUserName }} • 
          <strong>Rôle / Statut :</strong> {{ personaRoleLabel }} • 
          <strong>Édité le :</strong> {{ currentFormattedDate }}
        </p>
      </div>

      <!-- Day Empty State -->
      <div v-if="selectedDaySlots.length === 0" class="empty-day-state">
        <div class="empty-day-card">
          <span class="empty-day-icon">☀️</span>
          <h3>Aucune activité prévue pour le {{ selectedDayFormattedFull }}</h3>
          <p v-if="searchQuery">
            Aucun créneau ne correspond à votre recherche "<strong>{{ searchQuery }}</strong>".
          </p>
          <p v-else>
            Cette journée est libre dans votre planning.
          </p>

          <div class="empty-day-actions no-print">
            <button 
              v-if="nextDayWithActivities" 
              class="action-btn jump-next-active-btn" 
              @click="goToDay(nextDayWithActivities.dateKey)"
            >
              Passer au prochain jour avec activités ({{ nextDayWithActivities.formattedDate }}) ⏩
            </button>
            <button 
              v-else-if="!isSelectedDayToday" 
              class="action-btn today-jump-btn" 
              @click="goToToday"
            >
              Revenir à Aujourd'hui
            </button>
          </div>
        </div>
      </div>

      <!-- Single Day Slot Cards List -->
      <div v-else class="day-slots-list">
        <div 
          v-for="slot in selectedDaySlots" 
          :key="slot.documentId || slot.id" 
          class="planning-slot-card day-slot-card"
          :class="{ 
            'is-past-card': isSlotPast(slot),
            'is-current-card': isSlotCurrent(slot)
          }"
          :style="getSlotCardAccentStyle(slot)"
          @click="openDetailPanel(slot)"
        >
          <!-- Left Time Box -->
          <div class="slot-time-box">
            <div class="time-main">
              <span class="time-start">{{ formatTimeOnly(slot.startDate) }}</span>
              <span class="time-sep">↓</span>
              <span class="time-end">{{ formatTimeOnly(slot.endDate) }}</span>
            </div>
            <div class="time-duration">
              ⏱️ {{ getDurationMinutes(slot) }} min
            </div>
            <div class="slot-status-indicator" :class="getSlotStatusClass(slot)">
              {{ getSlotStatusLabel(slot) }}
            </div>
          </div>

          <!-- Main Slot Content -->
          <div class="slot-content-box">
            <div class="slot-content-header">
              <h4 class="slot-activity-title">
                {{ slot.activityTemplate?.name || 'Activité sans nom' }}
              </h4>
            </div>

            <p class="slot-desc-text" v-if="slot.activityTemplate?.description">
              {{ slot.activityTemplate.description }}
            </p>

            <!-- Metadata Row: Location & Facilitators -->
            <div class="slot-meta-row">
              <div class="meta-item location-item" v-if="slot.location">
                <span class="meta-icon">📍</span>
                <span class="meta-text location-name">{{ slot.location.name }}</span>
                <span class="location-cap" v-if="slot.location.capacity">({{ slot.location.capacity }} pl.)</span>
              </div>

              <div class="meta-item fac-item" v-if="slot.facilitators?.length">
                <span class="meta-icon">👨‍🏫</span>
                <span class="meta-text">
                  {{ slot.facilitators.map(f => `${f.firstName} ${f.lastName}`).join(', ') }}
                </span>
              </div>

              <div class="meta-item part-item" v-if="slot.participants?.length">
                <span class="meta-icon">👥</span>
                <span class="meta-text">{{ slot.participants.length }} participant(s)</span>
              </div>
            </div>
          </div>

          <!-- Right Action Arrow -->
          <div class="slot-card-arrow no-print">
            <span class="arrow-btn" title="Voir les détails">→</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════ 2. VUE HEBDOMADAIRE (CALENDRIER SEMAINE) ════════════════ -->
    <div v-else-if="viewMode === 'week'" class="weekly-calendar-section">
      <CalendarView 
        :timeslots="calendarSlots" 
        :target-date="calendarTargetDate"
        :default-view="'week'"
        :hide-view-switchers="true"
        @select-slot="openDetailPanel"
      />
    </div>

    <!-- ════════════════ DETAIL SIDE PANEL (DRAWER) ════════════════ -->
    <Transition name="slide-panel">
      <div class="detail-panel-overlay no-print" v-if="selectedSlot" @click.self="closeDetailPanel">
        <div class="detail-panel">
          <div class="panel-header">
            <h3>Détails du créneau</h3>
            <button class="panel-close-btn" @click="closeDetailPanel" title="Fermer">✕</button>
          </div>

          <div class="panel-body">
            <!-- Activity Title & Description -->
            <div class="panel-section">
              <div class="panel-activity-name" :style="getSlotAccentBg(selectedSlot)">
                {{ selectedSlot.activityTemplate?.name || 'Activité' }}
              </div>
              <p class="panel-desc" v-if="selectedSlot.activityTemplate?.description">
                {{ selectedSlot.activityTemplate.description }}
              </p>
            </div>

            <!-- Date & Time -->
            <div class="panel-section">
              <div class="panel-section-title">📅 Date & Horaires</div>
              <div class="panel-datetime">
                <div class="panel-date">{{ formatFullDate(selectedSlot.startDate) }}</div>
                <div class="panel-time">
                  <span class="panel-time-start">{{ formatTimeOnly(selectedSlot.startDate) }}</span>
                  <span class="panel-time-sep">→</span>
                  <span class="panel-time-end">{{ formatTimeOnly(selectedSlot.endDate) }}</span>
                </div>
                <div class="panel-duration">
                  ⏱️ Durée : {{ getDurationMinutes(selectedSlot) }} minutes
                </div>
                <div class="panel-relative-status" :class="getSlotStatusClass(selectedSlot)">
                  Statut : {{ getSlotStatusLabel(selectedSlot) }}
                </div>
              </div>
            </div>

            <!-- Location -->
            <div class="panel-section" v-if="selectedSlot.location">
              <div class="panel-section-title">📍 Lieu / Salle</div>
              <div class="panel-location-card">
                <div class="loc-main">
                  <span class="panel-location-name">{{ selectedSlot.location.name }}</span>
                  <span class="panel-location-address" v-if="selectedSlot.location.address">
                    {{ selectedSlot.location.address }}
                  </span>
                </div>
                <span class="panel-location-capacity" v-if="selectedSlot.location.capacity">
                  Capacité : {{ selectedSlot.location.capacity }} pers.
                </span>
              </div>
            </div>

            <!-- Facilitators -->
            <div class="panel-section" v-if="selectedSlot.facilitators?.length">
              <div class="panel-section-title">👨‍🏫 Animateurs ({{ selectedSlot.facilitators.length }})</div>
              <div class="panel-people-list">
                <div 
                  v-for="fac in selectedSlot.facilitators" 
                  :key="fac.documentId || fac.id" 
                  class="panel-person-card fac"
                >
                  <span class="person-avatar">👨‍🏫</span>
                  <div class="person-info">
                    <span class="person-name">{{ fac.firstName }} {{ fac.lastName }}</span>
                    <span class="person-email" v-if="fac.email">✉️ {{ fac.email }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Participants -->
            <div class="panel-section" v-if="selectedSlot.participants?.length">
              <div class="panel-section-title">👥 Participants ({{ selectedSlot.participants.length }})</div>
              <div class="panel-people-list">
                <div 
                  v-for="part in selectedSlot.participants" 
                  :key="part.documentId || part.id" 
                  class="panel-person-card part"
                >
                  <span class="person-avatar">👤</span>
                  <div class="person-info">
                    <span class="person-name">{{ part.firstName }} {{ part.lastName }}</span>
                    <span class="person-email" v-if="part.email">✉️ {{ part.email }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions inside Drawer -->
            <div class="panel-actions-section">
              <button class="action-btn download-ics-btn" @click="downloadSlotIcs(selectedSlot)">
                📅 Exporter au calendrier (.ics)
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
import CalendarView from '../components/CalendarView.vue';

function hashStringToHSL(str, saturation = 65, lightness = 52) {
  if (!str) return { h: 235, s: 65, l: 52 };
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const hue = Math.abs(hash) % 360;
  return { h: hue, s: saturation, l: lightness };
}

function getColorForSlot(slot) {
  const name = slot?.activityTemplate?.name || 'Activité';
  return hashStringToHSL(name);
}

export default {
  name: 'ClientPlanningView',
  components: { CalendarView },
  props: {
    timeslots: {
      type: Array,
      default: () => []
    },
    userRelevantSlots: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    user: {
      type: Object,
      default: null
    },
    currentUserPersona: {
      type: Object,
      default: null
    },
    isAdminPreview: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      viewMode: 'day', // 'day' (Vue Journée par défaut) or 'week' (Vue Hebdomadaire)
      selectedDayDateStr: '',
      scopeFilter: 'mine', // 'mine' (Mon planning) or 'all' (Toutes les activités)
      searchQuery: '',
      selectedSlot: null,
      calendarTargetDate: null,
      countdownText: '',
      countdownTimer: null
    };
  },
  computed: {
    displayUserName() {
      if (this.currentUserPersona?.partName) return this.currentUserPersona.partName;
      if (this.currentUserPersona?.facName) return this.currentUserPersona.facName;
      if (this.currentUserPersona?.locName) return this.currentUserPersona.locName;
      if (this.user?.username) return this.user.username;
      return 'Utilisateur';
    },
    userGreetingTitle() {
      if (this.isAdminPreview) {
        if (this.currentUserPersona?.location) return `Planning de la salle : ${this.displayUserName}`;
        return `Planning de ${this.displayUserName}`;
      }
      return `Bonjour, ${this.displayUserName} ! 👋`;
    },
    personaRoleLabel() {
      if (this.currentUserPersona?.facilitator) return '👨‍🏫 Équipe d\'Animation & Soins';
      if (this.currentUserPersona?.participant) return '🌸 Bénéficiaire Accueil de Jour';
      if (this.currentUserPersona?.location) return '📍 Salle / Espace d\'activité';
      return '👤 Espace Personnel';
    },
    personaIcon() {
      if (this.currentUserPersona?.facilitator) return '👨‍🏫';
      if (this.currentUserPersona?.participant) return '🌸';
      if (this.currentUserPersona?.location) return '📍';
      return '👤';
    },
    scopeFilterLabel() {
      if (this.currentUserPersona?.partName) return `Planning de ${this.currentUserPersona.partName}`;
      if (this.currentUserPersona?.facName) return `Planning de ${this.currentUserPersona.facName}`;
      if (this.currentUserPersona?.locName) return `Planning : ${this.currentUserPersona.locName}`;
      return 'Mon planning';
    },
    weeklyAvailabilityList() {
      const p = this.currentUserPersona?.participant || this.currentUserPersona?.facilitator;
      if (!p || !p.weeklyAvailabilities || typeof p.weeklyAvailabilities !== 'object') return [];
      const WEEKDAYS = [
        { key: '1', name: 'Lundi' },
        { key: '2', name: 'Mardi' },
        { key: '3', name: 'Mercredi' },
        { key: '4', name: 'Jeudi' },
        { key: '5', name: 'Vendredi' },
        { key: '6', name: 'Samedi' },
        { key: '0', name: 'Dimanche' }
      ];
      const hasAny = Object.values(p.weeklyAvailabilities).some(periods => Array.isArray(periods) && periods.length > 0);
      if (!hasAny) return [];
      return WEEKDAYS.map(day => {
        const periods = p.weeklyAvailabilities[day.key] || [];
        return {
          ...day,
          periods: Array.isArray(periods) ? periods : [],
          isAvailable: Array.isArray(periods) && periods.length > 0
        };
      });
    },
    activeBaseSlots() {
      if (this.scopeFilter === 'mine') {
        return this.userRelevantSlots || [];
      }
      return this.timeslots || [];
    },
    upcomingSlotsCount() {
      const now = new Date();
      return this.activeBaseSlots.filter(s => new Date(s.endDate || s.startDate) >= now).length;
    },
    calendarSlots() {
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase().trim();
        return this.activeBaseSlots.filter(s => {
          const actName = (s.activityTemplate?.name || '').toLowerCase();
          const actDesc = (s.activityTemplate?.description || '').toLowerCase();
          const locName = (s.location?.name || '').toLowerCase();
          const facNames = (s.facilitators || []).map(f => `${f.firstName} ${f.lastName}`.toLowerCase()).join(' ');
          const partNames = (s.participants || []).map(p => `${p.firstName} ${p.lastName}`.toLowerCase()).join(' ');
          return actName.includes(q) || actDesc.includes(q) || locName.includes(q) || facNames.includes(q) || partNames.includes(q);
        });
      }
      return this.activeBaseSlots;
    },
    displayedSlots() {
      let slots = this.activeBaseSlots;

      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase().trim();
        slots = slots.filter(s => {
          const actName = (s.activityTemplate?.name || '').toLowerCase();
          const actDesc = (s.activityTemplate?.description || '').toLowerCase();
          const locName = (s.location?.name || '').toLowerCase();
          const facNames = (s.facilitators || []).map(f => `${f.firstName} ${f.lastName}`.toLowerCase()).join(' ');
          const partNames = (s.participants || []).map(p => `${p.firstName} ${p.lastName}`.toLowerCase()).join(' ');
          return actName.includes(q) || actDesc.includes(q) || locName.includes(q) || facNames.includes(q) || partNames.includes(q);
        });
      }

      return slots.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    },
    nextSlot() {
      const now = new Date();
      const upcoming = this.activeBaseSlots
        .filter(s => new Date(s.startDate) > now)
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      return upcoming[0] || null;
    },
    selectedDayDate() {
      if (!this.selectedDayDateStr) return new Date();
      const [y, m, d] = this.selectedDayDateStr.split('-').map(Number);
      return new Date(y, m - 1, d, 12, 0, 0); // Use noon to prevent DST offsets
    },
    selectedDayFormattedFull() {
      const d = this.selectedDayDate;
      const full = d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      return full.charAt(0).toUpperCase() + full.slice(1);
    },
    selectedDayFormattedShort() {
      const d = this.selectedDayDate;
      return d.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });
    },
    isSelectedDayToday() {
      return this.selectedDayDateStr === this.toDateKey(new Date());
    },
    selectedDayRelativeLabel() {
      const todayStr = this.toDateKey(new Date());
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      if (this.selectedDayDateStr === todayStr) return "Aujourd'hui";
      if (this.selectedDayDateStr === this.toDateKey(tomorrow)) return "Demain";
      if (this.selectedDayDateStr === this.toDateKey(yesterday)) return "Hier";

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const target = new Date(this.selectedDayDate.getFullYear(), this.selectedDayDate.getMonth(), this.selectedDayDate.getDate());
      const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
      if (diffDays > 1) return `Dans ${diffDays} jours`;
      if (diffDays < -1) return `Il y a ${Math.abs(diffDays)} jours`;
      const dayName = this.selectedDayDate.toLocaleDateString('fr-FR', { weekday: 'long' });
      return dayName.charAt(0).toUpperCase() + dayName.slice(1);
    },
    selectedDaySlots() {
      const dayKey = this.selectedDayDateStr;
      return this.displayedSlots.filter(slot => {
        if (!slot.startDate) return false;
        return this.toDateKey(slot.startDate) === dayKey;
      }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    },
    selectedDayTotalDurationFormatted() {
      let totalMins = 0;
      this.selectedDaySlots.forEach(slot => {
        if (slot.startDate && slot.endDate) {
          const diff = (new Date(slot.endDate) - new Date(slot.startDate)) / 60000;
          if (diff > 0) totalMins += diff;
        }
      });
      if (totalMins === 0) return '0 min';
      const hours = Math.floor(totalMins / 60);
      const mins = Math.round(totalMins % 60);
      if (hours > 0 && mins > 0) return `${hours}h${mins > 9 ? mins : '0' + mins}`;
      if (hours > 0) return `${hours}h`;
      return `${mins} min`;
    },
    dayStripList() {
      const list = [];
      const current = new Date(this.selectedDayDate);
      // Window of 7 days around the selected day (-3 to +3)
      for (let i = -3; i <= 3; i++) {
        const d = new Date(current);
        d.setDate(d.getDate() + i);
        const dateKey = this.toDateKey(d);
        const dayName = d.toLocaleDateString('fr-FR', { weekday: 'short' });
        const dayNumber = d.getDate();
        const monthName = d.toLocaleDateString('fr-FR', { month: 'short' });
        const isToday = dateKey === this.toDateKey(new Date());

        const slotCount = this.activeBaseSlots.filter(s => {
          if (!s.startDate) return false;
          return this.toDateKey(s.startDate) === dateKey;
        }).length;

        list.push({
          dateKey,
          dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
          dayNumber,
          monthName,
          isToday,
          slotCount
        });
      }
      return list;
    },
    nextDayWithActivities() {
      const currentKey = this.selectedDayDateStr;
      const futureSlots = this.activeBaseSlots.filter(s => {
        if (!s.startDate) return false;
        return this.toDateKey(s.startDate) > currentKey;
      }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

      if (futureSlots.length === 0) return null;
      const nextDateKey = this.toDateKey(futureSlots[0].startDate);
      const nextDate = new Date(futureSlots[0].startDate);
      const fullDateStr = nextDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
      return {
        dateKey: nextDateKey,
        formattedDate: fullDateStr.charAt(0).toUpperCase() + fullDateStr.slice(1)
      };
    },
    currentFormattedDate() {
      return new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  },
  watch: {
    nextSlot: {
      immediate: true,
      handler(slot) {
        this.updateCountdown();
        if (slot?.startDate) {
          this.calendarTargetDate = new Date(slot.startDate);
          if (!this.selectedDayDateStr) {
            this.selectedDayDateStr = this.toDateKey(slot.startDate);
          }
        }
      }
    },
    activeBaseSlots: {
      immediate: true,
      handler(slots) {
        if (!this.selectedDayDateStr) {
          const todayKey = this.toDateKey(new Date());
          const todayHasSlots = (slots || []).some(s => s.startDate && this.toDateKey(s.startDate) === todayKey);
          if (todayHasSlots) {
            this.selectedDayDateStr = todayKey;
          } else if (this.nextSlot?.startDate) {
            this.selectedDayDateStr = this.toDateKey(this.nextSlot.startDate);
          } else if (slots && slots.length > 0 && slots[0].startDate) {
            this.selectedDayDateStr = this.toDateKey(slots[0].startDate);
          } else {
            this.selectedDayDateStr = todayKey;
          }
        }
      }
    }
  },
  mounted() {
    if (this.nextSlot?.startDate) {
      this.calendarTargetDate = new Date(this.nextSlot.startDate);
      if (!this.selectedDayDateStr) {
        this.selectedDayDateStr = this.toDateKey(this.nextSlot.startDate);
      }
    } else if (!this.selectedDayDateStr) {
      this.selectedDayDateStr = this.toDateKey(new Date());
    }
    this.countdownTimer = setInterval(() => this.updateCountdown(), 30000);
    this.updateCountdown();
    window.addEventListener('keydown', this.handleKeyDown);
  },
  beforeUnmount() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    window.removeEventListener('keydown', this.handleKeyDown);
  },
  methods: {
    goToPreviousDay() {
      const d = new Date(this.selectedDayDate);
      d.setDate(d.getDate() - 1);
      this.selectedDayDateStr = this.toDateKey(d);
    },
    goToNextDay() {
      const d = new Date(this.selectedDayDate);
      d.setDate(d.getDate() + 1);
      this.selectedDayDateStr = this.toDateKey(d);
    },
    goToToday() {
      this.selectedDayDateStr = this.toDateKey(new Date());
    },
    goToDay(dateKey) {
      if (dateKey) {
        this.selectedDayDateStr = dateKey;
      }
    },
    handleKeyDown(e) {
      if (e.key === 'Escape' && this.selectedSlot) {
        this.closeDetailPanel();
      }
    },
    toDateKey(date) {
      if (!date) return '';
      const d = new Date(date);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    },
    updateCountdown() {
      if (!this.nextSlot) {
        this.countdownText = '';
        return;
      }
      const now = new Date();
      const target = new Date(this.nextSlot.startDate);
      const diffMs = target - now;
      if (diffMs <= 0) {
        this.countdownText = 'En cours / Maintenant !';
        return;
      }
      const diffMinutes = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) {
        this.countdownText = `dans ${diffDays}j ${diffHours % 24}h`;
      } else if (diffHours > 0) {
        this.countdownText = `dans ${diffHours}h ${diffMinutes % 60}min`;
      } else {
        this.countdownText = `dans ${diffMinutes}min`;
      }
    },
    formatTimeOnly(isoString) {
      if (!isoString) return '';
      const d = new Date(isoString);
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    },
    formatFullDate(isoString) {
      if (!isoString) return '';
      const d = new Date(isoString);
      const formatted = d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    },
    formatHeroDate(isoString) {
      if (!isoString) return '';
      const d = new Date(isoString);
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const isToday = d.toDateString() === now.toDateString();
      const isTomorrow = d.toDateString() === tomorrow.toDateString();

      if (isToday) return "Aujourd'hui";
      if (isTomorrow) return 'Demain';
      return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    },
    getDurationMinutes(slot) {
      if (!slot?.startDate || !slot?.endDate) return '—';
      const diff = new Date(slot.endDate) - new Date(slot.startDate);
      return Math.round(diff / 60000);
    },
    isSlotPast(slot) {
      if (!slot?.endDate && !slot?.startDate) return false;
      return new Date(slot.endDate || slot.startDate) < new Date();
    },
    isSlotCurrent(slot) {
      if (!slot?.startDate || !slot?.endDate) return false;
      const now = new Date();
      return new Date(slot.startDate) <= now && new Date(slot.endDate) >= now;
    },
    getSlotStatusClass(slot) {
      if (this.isSlotCurrent(slot)) return 'status-current';
      if (this.isSlotPast(slot)) return 'status-past';
      return 'status-upcoming';
    },
    getSlotStatusLabel(slot) {
      if (this.isSlotCurrent(slot)) return '🟢 En cours';
      if (this.isSlotPast(slot)) return '⏳ Terminé';
      return '🔮 À venir';
    },
    getNextSlotStatusClass(slot) {
      if (this.isSlotCurrent(slot)) return 'hero-status-live';
      return 'hero-status-upcoming';
    },
    getNextSlotStatusLabel(slot) {
      if (this.isSlotCurrent(slot)) return '🟢 En cours';
      return 'À venir';
    },
    truncateText(str, len = 140) {
      if (!str) return '';
      if (str.length <= len) return str;
      return str.substring(0, len) + '...';
    },
    jumpToSlot(slot) {
      if (slot?.startDate) {
        this.calendarTargetDate = new Date(slot.startDate);
        this.viewMode = 'week';
        this.openDetailPanel(slot);
      }
    },
    openDetailPanel(slot) {
      this.selectedSlot = slot;
    },
    closeDetailPanel() {
      this.selectedSlot = null;
    },
    resetFilters() {
      this.searchQuery = '';
    },
    printPlanning() {
      window.print();
    },
    getSlotAccentBg(slot) {
      const color = getColorForSlot(slot);
      return {
        background: `linear-gradient(135deg, hsla(${color.h}, ${color.s}%, ${color.l}%, 0.25), hsla(${color.h}, ${color.s}%, ${color.l - 10}%, 0.12))`,
        borderLeft: `4px solid hsl(${color.h}, ${color.s}%, ${color.l}%)`
      };
    },
    getSlotCardAccentStyle(slot) {
      const color = getColorForSlot(slot);
      return {
        borderLeft: `4px solid hsl(${color.h}, ${color.s}%, ${color.l}%)`
      };
    },
    downloadSlotIcs(slot) {
      if (!slot?.startDate || !slot?.endDate) return;
      const start = new Date(slot.startDate).toISOString().replace(/-|:|\.\d+/g, '');
      const end = new Date(slot.endDate).toISOString().replace(/-|:|\.\d+/g, '');
      const title = slot.activityTemplate?.name || 'Activité';
      const description = slot.activityTemplate?.description || '';
      const location = slot.location?.name || '';

      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//EHPAD Les Ecrivains//Accueil de Jour Guerande//FR',
        'BEGIN:VEVENT',
        `UID:${slot.documentId || slot.id || Date.now()}@ehpad-les-ecrivains-guerande.fr`,
        `DTSTAMP:${start}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${title}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${location}`,
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${title.replace(/\s+/g, '_')}_creneau.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
};
</script>

<style scoped>
/* ════════════════ WRAPPER ════════════════ */
.client-planning-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ════════════════ USER WELCOME BAR ════════════════ */
.user-welcome-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  background: linear-gradient(135deg, rgba(16, 28, 44, 0.88), rgba(11, 20, 31, 0.85));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1.15rem;
  padding: 1.15rem 1.6rem;
  backdrop-filter: blur(14px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.user-greeting-info {
  display: flex;
  align-items: center;
  gap: 1.1rem;
}

.user-avatar-circle {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.35), rgba(2, 132, 199, 0.45));
  border: 2px solid rgba(45, 212, 191, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  flex-shrink: 0;
  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.25);
}

.user-greeting-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: #ffffff;
  margin: 0;
  line-height: 1.2;
}

.user-greeting-subtitle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #94a3b8;
  margin-top: 0.25rem;
}

.user-persona-tag {
  background: rgba(13, 148, 136, 0.2);
  color: #5eead4;
  padding: 0.2rem 0.6rem;
  border-radius: 0.45rem;
  font-weight: 600;
  font-size: 0.78rem;
  border: 1px solid rgba(13, 148, 136, 0.35);
}

.planning-actions {
  display: flex;
  align-items: center;
}

.print-btn {
  background: linear-gradient(135deg, #0d9488, #059669);
  color: white;
  border: none;
  padding: 0.55rem 1.15rem;
  border-radius: 0.55rem;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  white-space: nowrap;
}

.print-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(13, 148, 136, 0.4);
}

/* ════════════════ HERO NEXT ACTIVITY ════════════════ */
.next-activity-hero {
  position: relative;
  background: linear-gradient(135deg, rgba(16, 28, 44, 0.95), rgba(11, 20, 31, 0.92));
  border: 1px solid rgba(13, 148, 136, 0.35);
  border-radius: 1.15rem;
  padding: 1.6rem;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
}

.hero-glow {
  position: absolute;
  top: -30%;
  right: -10%;
  width: 260px;
  height: 260px;
  background: radial-gradient(circle, rgba(13, 148, 136, 0.25) 0%, transparent 70%);
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
}

.hero-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.hero-badge-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.hero-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #5eead4;
}

.hero-status-pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.15rem 0.55rem;
  border-radius: 1rem;
}

.hero-status-live {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.hero-status-upcoming {
  background: rgba(13, 148, 136, 0.2);
  color: #5eead4;
  border: 1px solid rgba(13, 148, 136, 0.35);
}

.hero-activity-name {
  font-size: 1.5rem;
  font-weight: 800;
  color: #ffffff;
  margin: 0;
  line-height: 1.3;
}

.hero-activity-desc {
  font-size: 0.88rem;
  color: #94a3b8;
  margin: 0;
  line-height: 1.4;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.25rem;
}

.hero-date-badge,
.hero-time-badge,
.hero-location-badge {
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.35rem 0.75rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.07);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.hero-date-badge {
  background: rgba(13, 148, 136, 0.18);
  color: #5eead4;
  border-color: rgba(13, 148, 136, 0.35);
}

.hero-duration {
  font-size: 0.78rem;
  color: #94a3b8;
  margin-left: 0.25rem;
}

.hero-people {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.hero-fac {
  font-size: 0.8rem;
  color: #99f6e4;
  background: rgba(13, 148, 136, 0.14);
  padding: 0.2rem 0.6rem;
  border-radius: 0.35rem;
  border: 1px solid rgba(13, 148, 136, 0.25);
}

.hero-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
}

.hero-countdown {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
}

.countdown-label {
  font-size: 0.75rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.countdown-value {
  font-size: 1.15rem;
  font-weight: 800;
  color: #5eead4;
  background: rgba(13, 148, 136, 0.2);
  padding: 0.4rem 1rem;
  border-radius: 0.6rem;
  border: 1px solid rgba(13, 148, 136, 0.4);
  white-space: nowrap;
}

.hero-see-btn {
  background: linear-gradient(135deg, #0d9488, #059669);
  color: #ffffff;
  border: none;
  padding: 0.65rem 1.3rem;
  border-radius: 0.55rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35);
}

.hero-see-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(13, 148, 136, 0.5);
  background: linear-gradient(135deg, #0f766e, #047857);
}

.hero-empty {
  border-color: rgba(255, 255, 255, 0.08);
}

.hero-empty-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
}

.hero-empty-text {
  color: #94a3b8;
  font-size: 0.9rem;
  margin: 0;
}

/* ════════════════ MAIN VIEW MODE SWITCHER ════════════════ */
.planning-main-switcher {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.view-mode-tabs {
  display: flex;
  gap: 0.5rem;
  background: rgba(15, 23, 42, 0.8);
  padding: 0.35rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.view-mode-tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 0.55rem 1.25rem;
  border-radius: 0.5rem;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-mode-tab-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.05);
}

.view-mode-tab-btn.active {
  background: linear-gradient(135deg, #0d9488, #059669);
  color: #ffffff;
  border: 1px solid rgba(94, 234, 212, 0.5);
  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35);
}

.tab-btn-icon {
  font-size: 1.1rem;
}

/* ════════════════ REFERENCE AVAILABILITY BAR ════════════════ */
.weekly-avail-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  background: rgba(16, 28, 44, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.9rem;
  font-size: 0.85rem;
}

.avail-title {
  font-weight: 700;
  color: #94a3b8;
  font-size: 0.82rem;
}

.avail-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.avail-pill {
  padding: 0.25rem 0.6rem;
  border-radius: 0.45rem;
  font-size: 0.78rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.avail-pill.avail-yes {
  background: rgba(13, 148, 136, 0.18);
  color: #5eead4;
  border: 1px solid rgba(13, 148, 136, 0.35);
}

.avail-pill.avail-no {
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.day-abbr {
  font-weight: 700;
}

.planning-search-box {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 260px;
  flex: 1;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 0.85rem;
  color: #64748b;
  font-size: 0.9rem;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.6rem 2.2rem 0.6rem 2.4rem;
  background: rgba(16, 28, 44, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.65rem;
  color: #ffffff;
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.search-input:focus {
  border-color: rgba(13, 148, 136, 0.6);
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.2);
}

.clear-search-btn {
  position: absolute;
  right: 0.75rem;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.2rem;
}

/* ════════════════ FILTER TOOLBAR ════════════════ */
.planning-filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.85rem;
  padding: 0.65rem 1rem;
  background: rgba(17, 24, 39, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0.75rem;
  backdrop-filter: blur(12px);
}

.filter-tabs {
  display: flex;
  gap: 0.3rem;
  background: rgba(15, 23, 42, 0.6);
  padding: 0.25rem;
  border-radius: 0.5rem;
}

.filter-tab {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 0.4rem 0.85rem;
  border-radius: 0.4rem;
  font-size: 0.83rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-tab:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.05);
}

.filter-tab.active {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.45), rgba(79, 70, 229, 0.5));
  color: #ffffff;
  border: 1px solid rgba(129, 140, 248, 0.5);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

.planning-slot-card {
  display: flex;
  align-items: stretch;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.7));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.75rem;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  backdrop-filter: blur(8px);
}

.planning-slot-card:hover {
  transform: translateY(-2px);
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.85));
}

.planning-slot-card.is-current-card {
  border-color: rgba(16, 185, 129, 0.5);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(15, 23, 42, 0.8));
}

.planning-slot-card.is-past-card {
  opacity: 0.75;
}

/* Time box column */
.slot-time-box {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 1rem 1.25rem;
  background: rgba(15, 23, 42, 0.6);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  min-width: 130px;
  flex-shrink: 0;
  gap: 0.25rem;
}

.time-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.15;
}

.time-start {
  font-size: 1.15rem;
  font-weight: 800;
  color: #818cf8;
}

.time-sep {
  font-size: 0.7rem;
  color: #64748b;
  margin: 0.1rem 0;
}

.time-end {
  font-size: 1.15rem;
  font-weight: 800;
  color: #a5b4fc;
}

.time-duration {
  font-size: 0.72rem;
  color: #94a3b8;
  font-weight: 600;
  margin-top: 0.2rem;
}

.slot-status-indicator {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 0.35rem;
  margin-top: 0.25rem;
}

.slot-status-indicator.status-current {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.slot-status-indicator.status-upcoming {
  background: rgba(99, 102, 241, 0.15);
  color: #c7d2fe;
}

.slot-status-indicator.status-past {
  background: rgba(255, 255, 255, 0.08);
  color: #94a3b8;
}

/* Content box */
.slot-content-box {
  flex: 1;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.45rem;
}

.slot-content-header {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.slot-activity-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.slot-desc-text {
  font-size: 0.84rem;
  color: #94a3b8;
  margin: 0;
  line-height: 1.4;
}

.slot-meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  margin-top: 0.25rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: #cbd5e1;
}

.location-name {
  color: #34d399;
  font-weight: 600;
}

.location-cap {
  color: #64748b;
  font-size: 0.75rem;
}

/* Card arrow */
.slot-card-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 1.25rem;
}

.arrow-btn {
  color: #64748b;
  font-size: 1.25rem;
  font-weight: 700;
  transition: transform 0.2s ease, color 0.2s ease;
}

.planning-slot-card:hover .arrow-btn {
  transform: translateX(4px);
  color: #818cf8;
}

/* ════════════════ DETAIL SIDE PANEL (DRAWER) ════════════════ */
.detail-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(5px);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.detail-panel {
  width: 440px;
  max-width: 90vw;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.5);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.6);
}

.panel-header h3 {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
}

.panel-close-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #94a3b8;
  width: 32px;
  height: 32px;
  border-radius: 0.4rem;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.panel-close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.3);
}

.panel-body {
  flex: 1;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
}

.panel-section {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.panel-section-title {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #a5b4fc;
}

.panel-activity-name {
  font-size: 1.25rem;
  font-weight: 800;
  color: #ffffff;
  padding: 0.9rem 1.1rem;
  border-radius: 0.6rem;
}

.panel-desc {
  font-size: 0.88rem;
  color: #94a3b8;
  line-height: 1.5;
  margin: 0;
}

.panel-datetime {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  background: rgba(15, 23, 42, 0.5);
  padding: 0.9rem 1.1rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.panel-date {
  font-size: 0.95rem;
  font-weight: 700;
  color: #f8fafc;
}

.panel-time {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.panel-time-start {
  font-size: 1.25rem;
  font-weight: 800;
  color: #818cf8;
}

.panel-time-sep {
  color: #475569;
  font-size: 0.9rem;
}

.panel-time-end {
  font-size: 1.25rem;
  font-weight: 800;
  color: #a5b4fc;
}

.panel-duration {
  font-size: 0.82rem;
  color: #94a3b8;
}

.panel-relative-status {
  font-size: 0.78rem;
  font-weight: 600;
  margin-top: 0.25rem;
}

.panel-location-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
}

.loc-main {
  display: flex;
  flex-direction: column;
}

.panel-location-name {
  font-weight: 700;
  color: #34d399;
  font-size: 1rem;
}

.panel-location-address {
  font-size: 0.8rem;
  color: #94a3b8;
}

.panel-location-capacity {
  font-size: 0.78rem;
  color: #cbd5e1;
  background: rgba(255, 255, 255, 0.06);
  padding: 0.2rem 0.5rem;
  border-radius: 0.35rem;
  align-self: flex-start;
}

.panel-people-list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.panel-person-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0.85rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.panel-person-card.fac {
  background: rgba(99, 102, 241, 0.08);
}

.panel-person-card.part {
  background: rgba(236, 72, 153, 0.06);
}

.person-avatar {
  font-size: 1.25rem;
}

.person-info {
  display: flex;
  flex-direction: column;
}

.person-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #f3f4f6;
}

.person-email {
  font-size: 0.75rem;
  color: #64748b;
}

.panel-actions-section {
  margin-top: auto;
  padding-top: 1rem;
}

.download-ics-btn {
  width: 100%;
  background: linear-gradient(135deg, #4f46e5, #4338ca);
  color: #ffffff;
  border: none;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.download-ics-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
}

/* ════════════════ PANEL TRANSITIONS ════════════════ */
.slide-panel-enter-active {
  transition: all 0.3s ease;
}
.slide-panel-leave-active {
  transition: all 0.25s ease;
}

.slide-panel-enter-from .detail-panel,
.slide-panel-leave-to .detail-panel {
  transform: translateX(100%);
}

.slide-panel-enter-from,
.slide-panel-leave-to {
  opacity: 0;
}

/* ════════════════ DAY VIEW SECTION ════════════════ */
.day-view-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.day-navigator-card {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.75), rgba(15, 23, 42, 0.85));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.15rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  backdrop-filter: blur(16px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
}

.day-nav-main-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.nav-day-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--text-primary, #f8fafc);
  padding: 0.65rem 1.1rem;
  border-radius: 0.65rem;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}

.nav-day-btn:hover {
  background: rgba(13, 148, 136, 0.2);
  border-color: rgba(13, 148, 136, 0.4);
  color: #5eead4;
  transform: translateY(-1px);
}

.nav-day-btn .btn-arrow {
  font-size: 1.1rem;
  font-weight: 700;
}

.day-center-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.35rem;
  flex: 1;
  min-width: 260px;
}

.day-badge-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  justify-content: center;
}

.day-relative-pill {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.2rem 0.65rem;
  border-radius: 2rem;
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.35);
}

.day-relative-pill.is-today {
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.3), rgba(5, 150, 105, 0.25));
  color: #2dd4bf;
  border-color: rgba(45, 212, 191, 0.45);
  box-shadow: 0 0 12px rgba(13, 148, 136, 0.25);
}

.jump-today-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #94a3b8;
  font-size: 0.72rem;
  padding: 0.15rem 0.5rem;
  border-radius: 1rem;
  cursor: pointer;
  transition: all 0.15s;
}

.jump-today-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.day-date-heading-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

.day-formatted-heading {
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--text-primary, #ffffff);
  margin: 0;
  letter-spacing: -0.01em;
}

.date-picker-button-label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #94a3b8;
  font-size: 0.78rem;
  font-weight: 500;
  padding: 0.3rem 0.6rem;
  border-radius: 0.5rem;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.15s;
}

.date-picker-button-label:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  border-color: rgba(255, 255, 255, 0.25);
}

.hidden-native-date-input {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.day-stat-summary {
  font-size: 0.85rem;
  color: var(--text-secondary, #94a3b8);
}

.stat-has-activities strong {
  color: #38bdf8;
}

.stat-empty {
  color: #64748b;
  font-style: italic;
}

/* Day Strip Carousel / Pager */
.day-strip-container {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 1rem;
}

.day-strip-scroll {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding: 0.25rem 0.1rem;
  scrollbar-width: thin;
}

.day-strip-scroll::-webkit-scrollbar {
  height: 4px;
}

.day-strip-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}

.day-strip-pill {
  flex: 1;
  min-width: 72px;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.75rem;
  padding: 0.6rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  color: var(--text-secondary, #94a3b8);
}

.day-strip-pill:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.day-strip-pill.is-active {
  background: linear-gradient(135deg, #0d9488 0%, #059669 100%);
  border-color: #2dd4bf;
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);
  transform: translateY(-2px);
}

.day-strip-pill.is-today:not(.is-active) {
  border-color: rgba(45, 212, 191, 0.5);
  background: rgba(13, 148, 136, 0.12);
}

.pill-weekday {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.85;
}

.pill-daynum {
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1;
}

.pill-month {
  font-size: 0.65rem;
  opacity: 0.75;
}

.pill-badge {
  font-size: 0.65rem;
  font-weight: 700;
  background: rgba(56, 189, 248, 0.25);
  color: #38bdf8;
  border-radius: 1rem;
  padding: 0.1rem 0.35rem;
  margin-top: 0.2rem;
}

.day-strip-pill.is-active .pill-badge {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

/* Day Empty State */
.empty-day-state {
  display: flex;
  justify-content: center;
  padding: 2rem 1rem;
}

.empty-day-card {
  max-width: 560px;
  width: 100%;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  padding: 2.5rem 1.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.empty-day-icon {
  font-size: 3rem;
  opacity: 0.8;
}

.empty-day-card h3 {
  font-size: 1.15rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
}

.empty-day-card p {
  color: #94a3b8;
  font-size: 0.9rem;
  margin: 0;
}

.empty-day-actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
}

.jump-next-active-btn {
  background: linear-gradient(135deg, #0d9488 0%, #059669 100%);
  color: white;
  border: none;
  padding: 0.65rem 1.25rem;
  border-radius: 0.5rem;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
}

.jump-next-active-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(13, 148, 136, 0.45);
}

.today-jump-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #f8fafc;
  padding: 0.65rem 1.1rem;
  border-radius: 0.5rem;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
}

.today-jump-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

/* Day slots list */
.day-slots-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.day-slot-card {
  cursor: pointer;
}

/* ════════════════ PRINT STYLES ════════════════ */
.print-only-header {
  display: none;
}

@media print {
  @page {
    margin: 1.2cm 1cm;
    size: A4 portrait;
  }

  .no-print,
  .user-welcome-bar,
  .next-activity-hero,
  .weekly-avail-bar,
  .planning-main-switcher,
  .planning-filter-bar,
  .detail-panel-overlay,
  .slot-card-arrow,
  .day-navigator-card,
  .day-bottom-print-bar {
    display: none !important;
  }

  .print-only-header {
    display: block !important;
    margin-bottom: 1.5rem;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid #000;
  }

  .print-brand-badge {
    font-size: 0.85rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    color: #111;
    margin-bottom: 0.25rem;
  }

  .print-only-header h2 {
    color: #000;
    font-size: 1.4rem;
    margin-bottom: 0.25rem;
    font-weight: 800;
  }

  .print-sub-info {
    color: #444;
    font-size: 0.85rem;
    margin: 0;
  }

  .client-planning-wrapper,
  .day-view-section {
    background: #ffffff !important;
    color: #000000 !important;
    display: block !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .planning-slot-card {
    background: #ffffff !important;
    border: 1px solid #999999 !important;
    color: #000000 !important;
    break-inside: avoid;
    page-break-inside: avoid;
    box-shadow: none !important;
    margin-bottom: 0.75rem !important;
    display: flex !important;
    flex-direction: row !important;
  }

  .slot-activity-title,
  .day-header-title,
  .time-start,
  .time-end {
    color: #000000 !important;
    font-weight: 700 !important;
  }

  .slot-time-box {
    background: #f1f5f9 !important;
    border-right: 1px solid #cbd5e1 !important;
    color: #000000 !important;
    min-width: 110px !important;
  }

  .slot-desc-text,
  .meta-item {
    color: #334155 !important;
  }

  .day-header-badge {
    background: #e2e8f0 !important;
    color: #000000 !important;
  }
}

/* ════════════════ RESPONSIVE ════════════════ */
@media (max-width: 768px) {
  .user-welcome-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .planning-actions {
    width: 100%;
  }

  .print-btn {
    width: 100%;
    justify-content: center;
  }

  .hero-content {
    flex-direction: column;
    gap: 1rem;
  }

  .hero-right {
    align-items: flex-start;
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
  }

  .hero-activity-name {
    font-size: 1.2rem;
  }

  .planning-main-switcher {
    flex-direction: column;
    align-items: stretch;
  }

  .view-mode-tabs {
    width: 100%;
  }

  .view-mode-tab-btn {
    flex: 1;
    justify-content: center;
    padding: 0.5rem 0.6rem;
    font-size: 0.8rem;
  }

  .day-nav-main-bar {
    flex-direction: column;
    gap: 0.75rem;
  }

  .nav-day-btn {
    width: 100%;
    justify-content: center;
  }

  .planning-search-box {
    max-width: 100%;
  }

  .planning-filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .planning-slot-card {
    flex-direction: column;
  }

  .slot-time-box {
    flex-direction: row;
    justify-content: space-between;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding: 0.75rem 1rem;
    min-width: unset;
  }

  .time-main {
    flex-direction: row;
    gap: 0.4rem;
  }

  .time-sep {
    transform: rotate(-90deg);
  }

  .slot-card-arrow {
    display: none;
  }

  .detail-panel {
    width: 100vw;
    max-width: 100vw;
  }
}
</style>
