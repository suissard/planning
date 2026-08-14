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

      <!-- Quick Action Controls -->
      <div class="user-bar-actions">
        <button class="action-btn print-quick-btn" @click="printPlanning" title="Imprimer le planning">
          🖨️ Imprimer le planning
        </button>
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
          :class="{ active: viewMode === 'week' }" 
          @click="viewMode = 'week'"
        >
          <span class="tab-btn-icon">📅</span>
          <span class="tab-btn-text">Vue Hebdomadaire</span>
        </button>
        <button 
          class="view-mode-tab-btn" 
          :class="{ active: viewMode === 'planning' }" 
          @click="viewMode = 'planning'"
        >
          <span class="tab-btn-icon">📋</span>
          <span class="tab-btn-text">Vue Planning (Agenda)</span>
        </button>
      </div>

      <!-- Time Filter tabs for agenda -->
      <div class="time-filter-tabs" v-if="viewMode === 'planning'">
        <button 
          class="time-tab-btn" 
          :class="{ active: timeFilter === 'all' }" 
          @click="timeFilter = 'all'"
        >
          Tous ({{ activeBaseSlots.length }})
        </button>
        <button 
          class="time-tab-btn" 
          :class="{ active: timeFilter === 'upcoming' }" 
          @click="timeFilter = 'upcoming'"
        >
          À venir ({{ upcomingSlotsCount }})
        </button>
        <button 
          class="time-tab-btn" 
          :class="{ active: timeFilter === 'past' }" 
          @click="timeFilter = 'past'"
        >
          Passés ({{ activeBaseSlots.length - upcomingSlotsCount }})
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

    <!-- ════════════════ 1. VUE HEBDOMADAIRE (CALENDRIER SEMAINE) ════════════════ -->
    <div v-if="viewMode === 'week'" class="weekly-calendar-section">
      <CalendarView 
        :timeslots="calendarSlots" 
        :target-date="calendarTargetDate"
        :default-view="'week'"
        :hide-view-switchers="true"
        @select-slot="openDetailPanel"
      />
    </div>

    <!-- ════════════════ 2. VUE PLANNING (AGENDA CHRONOLOGIQUE PAR JOUR) ════════════════ -->
    <div v-else-if="viewMode === 'planning'" class="planning-agenda-section">
      <!-- Print Title Header -->
      <div class="print-only-header">
        <div class="print-brand-badge">EHPAD LES ÉCRIVAINS — ACCUEIL DE JOUR • GUÉRANDE</div>
        <h2>📋 Planning des Activités — {{ displayUserName }}</h2>
        <p>Document d'accueil & d'accompagnement • Imprimé le {{ currentFormattedDate }}</p>
      </div>

      <!-- Empty State -->
      <div v-if="groupedPlanningSlotsByDay.length === 0" class="empty-planning-state">
        <div class="empty-state-card">
          <span class="empty-icon">📁</span>
          <h3>Aucune activité trouvée</h3>
          <p v-if="searchQuery || timeFilter !== 'all'">
            Aucun créneau ne correspond à vos filtres actuels.
          </p>
          <p v-else>
            Aucun créneau n'est planifié dans votre planning.
          </p>
          <button 
            v-if="searchQuery || timeFilter !== 'all'" 
            class="action-btn reset-filter-btn" 
            @click="resetFilters"
          >
            Réinitialiser les filtres
          </button>
        </div>
      </div>

      <!-- Day Groups Timeline -->
      <div v-else class="planning-days-timeline">
        <div 
          v-for="(dayGroup, index) in groupedPlanningSlotsByDay" 
          :key="dayGroup.dateKey" 
          class="planning-day-group"
          :class="{ 'is-today-group': dayGroup.isToday, 'is-past-group': dayGroup.isPast }"
        >
          <!-- Countdown banner above first proposed activity date -->
          <div v-if="index === 0 && dayGroup.daysFromTodayLabel" class="first-activity-countdown-banner">
            <span class="countdown-sparkle">⏳</span>
            <span class="countdown-text">
              La première activité a lieu <strong>{{ dayGroup.daysFromTodayLabel }}</strong> ({{ dayGroup.formattedDate }})
            </span>
          </div>

          <!-- Day Header -->
          <div class="day-group-header">
            <div class="day-header-left">
              <span class="day-header-badge" :class="{ 'badge-today': dayGroup.isToday }">
                {{ dayGroup.relativeLabel }}
              </span>
              <h3 class="day-header-title">{{ dayGroup.formattedDate }}</h3>
            </div>
            <div class="day-header-right">
              <span class="day-slots-counter">
                {{ dayGroup.slots.length }} activité{{ dayGroup.slots.length > 1 ? 's' : '' }}
              </span>
            </div>
          </div>

          <!-- Slots Cards for this day -->
          <div class="day-slots-grid">
            <div 
              v-for="slot in dayGroup.slots" 
              :key="slot.documentId || slot.id" 
              class="planning-slot-card"
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
                  {{ truncateText(slot.activityTemplate.description, 160) }}
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
              <div class="slot-card-arrow">
                <span class="arrow-btn" title="Voir les détails">→</span>
              </div>
            </div>
          </div>
        </div>
      </div>
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
      viewMode: 'week', // 'week' (Vue Hebdomadaire) or 'planning' (Vue Planning / Agenda)
      scopeFilter: 'mine', // 'mine' (Mon planning) or 'all' (Toutes les activités)
      timeFilter: 'all', // 'all', 'upcoming', 'past'
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
      if (this.scopeFilter === 'mine' && Array.isArray(this.userRelevantSlots) && this.userRelevantSlots.length > 0) {
        return this.userRelevantSlots;
      }
      if (this.scopeFilter === 'mine' && (!this.userRelevantSlots || this.userRelevantSlots.length === 0)) {
        return this.timeslots || [];
      }
      return this.timeslots || [];
    },
    upcomingSlotsCount() {
      const now = new Date();
      return this.activeBaseSlots.filter(s => new Date(s.endDate || s.startDate) >= now).length;
    },
    filteredByTime() {
      const now = new Date();
      if (this.timeFilter === 'upcoming') {
        return this.activeBaseSlots.filter(s => new Date(s.endDate || s.startDate) >= now);
      }
      if (this.timeFilter === 'past') {
        return this.activeBaseSlots.filter(s => new Date(s.endDate || s.startDate) < now);
      }
      return this.activeBaseSlots;
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
      let slots = this.filteredByTime;

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
    groupedPlanningSlotsByDay() {
      const groups = {};
      const todayStr = this.toDateKey(new Date());

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = this.toDateKey(tomorrow);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = this.toDateKey(yesterday);

      this.displayedSlots.forEach(slot => {
        if (!slot.startDate) return;
        const d = new Date(slot.startDate);
        const dateKey = this.toDateKey(d);

        if (!groups[dateKey]) {
          let relativeLabel = '';
          if (dateKey === todayStr) relativeLabel = "Aujourd'hui";
          else if (dateKey === tomorrowStr) relativeLabel = 'Demain';
          else if (dateKey === yesterdayStr) relativeLabel = 'Hier';
          else {
            const dayName = d.toLocaleDateString('fr-FR', { weekday: 'long' });
            relativeLabel = dayName.charAt(0).toUpperCase() + dayName.slice(1);
          }

          const fullDateStr = d.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });
          const formattedDate = fullDateStr.charAt(0).toUpperCase() + fullDateStr.slice(1);

          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const targetDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          const diffDays = Math.round((targetDay - today) / (1000 * 60 * 60 * 24));

          let daysFromTodayLabel = '';
          if (diffDays === 0) daysFromTodayLabel = "aujourd'hui";
          else if (diffDays === 1) daysFromTodayLabel = "demain (dans 1 jour)";
          else if (diffDays > 1) daysFromTodayLabel = `dans ${diffDays} jours à partir d'aujourd'hui`;
          else daysFromTodayLabel = `il y a ${Math.abs(diffDays)} jours`;

          groups[dateKey] = {
            dateKey,
            date: d,
            relativeLabel,
            formattedDate,
            daysFromTodayLabel,
            diffDays,
            isToday: dateKey === todayStr,
            isPast: dateKey < todayStr,
            slots: []
          };
        }

        groups[dateKey].slots.push(slot);
      });

      return Object.values(groups).sort((a, b) => a.date - b.date);
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
        }
      }
    }
  },
  mounted() {
    if (this.nextSlot?.startDate) {
      this.calendarTargetDate = new Date(this.nextSlot.startDate);
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

.print-quick-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 0.6rem 1.2rem;
  border-radius: 0.6rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  transition: all 0.2s ease;
}

.print-quick-btn:hover {
  background: rgba(13, 148, 136, 0.25);
  border-color: rgba(13, 148, 136, 0.45);
  color: #ffffff;
  transform: translateY(-1px);
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

/* ════════════════ TIME FILTER TABS (AGENDA) ════════════════ */
.time-filter-tabs {
  display: flex;
  gap: 0.35rem;
  background: rgba(15, 23, 42, 0.75);
  padding: 0.3rem;
  border-radius: 0.65rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.time-tab-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 0.4rem 0.85rem;
  border-radius: 0.45rem;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.time-tab-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.05);
}

.time-tab-btn.active {
  background: rgba(13, 148, 136, 0.3);
  color: #5eead4;
  border: 1px solid rgba(13, 148, 136, 0.4);
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

/* ════════════════ VUE PLANNING (AGENDA CHRONOLOGIQUE) ════════════════ */
.planning-agenda-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.empty-planning-state {
  display: flex;
  justify-content: center;
  padding: 3rem 1rem;
}

.empty-state-card {
  text-align: center;
  background: rgba(17, 24, 39, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  padding: 2.5rem;
  max-width: 460px;
  width: 100%;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  display: block;
}

.empty-state-card h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 0.5rem;
}

.empty-state-card p {
  color: #94a3b8;
  font-size: 0.9rem;
  margin-bottom: 1.25rem;
}

.reset-filter-btn {
  background: linear-gradient(135deg, #0d9488, #059669);
  color: #ffffff;
  border: none;
  padding: 0.55rem 1.2rem;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.3);
}

.planning-days-timeline {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.planning-day-group {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.day-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.day-header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.first-activity-countdown-banner {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.22), rgba(2, 132, 199, 0.15));
  border: 1px solid rgba(45, 212, 191, 0.4);
  padding: 0.75rem 1.25rem;
  border-radius: 0.75rem;
  margin-bottom: 0.75rem;
  color: #e0f2fe;
  font-size: 0.92rem;
  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.2);
}

.countdown-sparkle {
  font-size: 1.25rem;
}

.countdown-text strong {
  color: #38bdf8;
  font-weight: 800;
}

.day-header-badge {
  background: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 0.4rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.day-header-badge.badge-today {
  background: linear-gradient(135deg, #0d9488, #059669);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.4);
}

.day-header-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
}

.day-slots-counter {
  font-size: 0.8rem;
  color: #94a3b8;
  font-weight: 500;
}

.day-slots-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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

/* ════════════════ PRINT STYLES ════════════════ */
.print-only-header {
  display: none;
}

@media print {
  .no-print {
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
    font-size: 1.5rem;
    margin-bottom: 0.25rem;
  }

  .print-only-header p {
    color: #444;
    font-size: 0.85rem;
  }

  .client-planning-wrapper {
    background: #fff !important;
    color: #000 !important;
  }

  .planning-slot-card {
    background: #fff !important;
    border: 1px solid #ccc !important;
    color: #000 !important;
    break-inside: avoid;
    box-shadow: none !important;
  }

  .slot-activity-title,
  .day-header-title,
  .time-start,
  .time-end {
    color: #000 !important;
  }

  .slot-time-box {
    background: #f4f4f5 !important;
    border-right: 1px solid #ddd !important;
  }

  .slot-desc-text,
  .meta-item {
    color: #333 !important;
  }

  .day-header-badge {
    background: #e2e8f0 !important;
    color: #000 !important;
  }
}

/* ════════════════ RESPONSIVE ════════════════ */
@media (max-width: 768px) {
  .user-welcome-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .user-bar-actions {
    width: 100%;
  }

  .print-quick-btn {
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
