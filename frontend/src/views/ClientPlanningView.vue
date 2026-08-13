<template>
  <div class="client-planning-wrapper">
    <!-- ════════════════ NEXT ACTIVITY HERO CARD (HIDDEN ON PRINT) ════════════════ -->
    <div class="next-activity-hero no-print" v-if="nextSlot">
      <div class="hero-glow"></div>
      <div class="hero-content">
        <div class="hero-left">
          <span class="hero-label">Prochaine activité</span>
          <h2 class="hero-activity-name">{{ nextSlot.activityTemplate?.name || 'Activité' }}</h2>
          <div class="hero-meta">
            <span class="hero-date-badge">
              📅 {{ formatHeroDate(nextSlot.startDate) }}
            </span>
            <span class="hero-time-badge">
              🕒 {{ formatTimeOnly(nextSlot.startDate) }} — {{ formatTimeOnly(nextSlot.endDate) }}
            </span>
            <span class="hero-location-badge" v-if="nextSlot.location">
              📍 {{ nextSlot.location.name }}
            </span>
          </div>
          <div class="hero-people" v-if="nextSlot.facilitators?.length">
            <span class="hero-fac" v-for="fac in nextSlot.facilitators.slice(0, 2)" :key="fac.documentId || fac.id">
              👨‍🏫 {{ fac.firstName }} {{ fac.lastName }}
            </span>
          </div>
        </div>
        <div class="hero-right">
          <div class="hero-countdown">
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
          <span class="hero-label">Aucune activité à venir</span>
          <p class="hero-empty-text">Toutes les activités prévues sont terminées, ou aucun créneau n'est planifié.</p>
        </div>
      </div>
    </div>

    <!-- ════════════════ FILTER TABS (HIDDEN ON PRINT) ════════════════ -->
    <div class="planning-filter-bar no-print">
      <!-- Scope Filter: All Activities vs My Activities -->
      <div class="filter-tabs scope-filter-tabs" v-if="userRelevantSlots && userRelevantSlots.length > 0">
        <button 
          class="filter-tab scope-btn" 
          :class="{ active: scopeFilter === 'all' }" 
          @click="scopeFilter = 'all'"
        >
          🌐 Toutes ({{ timeslots.length }})
        </button>
        <button 
          class="filter-tab scope-btn" 
          :class="{ active: scopeFilter === 'mine' }" 
          @click="scopeFilter = 'mine'"
        >
          👤 Mes activités ({{ userRelevantSlots.length }})
        </button>
      </div>

      <!-- Time filter tabs -->
      <div class="filter-tabs">
        <button 
          class="filter-tab" 
          :class="{ active: timeFilter === 'upcoming' }" 
          @click="timeFilter = 'upcoming'"
        >
          🔮 À venir
        </button>
        <button 
          class="filter-tab" 
          :class="{ active: timeFilter === 'all' }" 
          @click="timeFilter = 'all'"
        >
          ⏳ Tout
        </button>
        <button 
          class="filter-tab" 
          :class="{ active: timeFilter === 'past' }" 
          @click="timeFilter = 'past'"
        >
          📜 Historique
        </button>
      </div>

      <!-- Tag filters -->
      <div class="tag-filter-row" v-if="availableTags.length > 0">
        <button 
          class="tag-pill" 
          :class="{ active: !selectedTag }" 
          @click="selectedTag = ''"
        >
          Toutes
        </button>
        <button 
          v-for="tag in availableTags" 
          :key="tag" 
          class="tag-pill" 
          :class="{ active: selectedTag === tag }"
          @click="selectedTag = selectedTag === tag ? '' : tag"
        >
          {{ tag }}
        </button>
      </div>
    </div>

    <!-- ════════════════ CALENDAR VIEW ════════════════ -->
    <CalendarView 
      :timeslots="displayedSlots" 
      :target-date="calendarTargetDate"
      :default-view="defaultCalendarView"
      @select-slot="openDetailPanel"
    />

    <!-- ════════════════ DETAIL SIDE PANEL (HIDDEN ON PRINT) ════════════════ -->
    <Transition name="slide-panel">
      <div class="detail-panel-overlay no-print" v-if="selectedSlot" @click.self="closeDetailPanel">
        <div class="detail-panel">
          <div class="panel-header">
            <h3>Détails du créneau</h3>
            <button class="panel-close-btn" @click="closeDetailPanel">✕</button>
          </div>

          <div class="panel-body">
            <!-- Activity Info -->
            <div class="panel-section">
              <div class="panel-activity-name" :style="getSlotAccentBg(selectedSlot)">
                {{ selectedSlot.activityTemplate?.name || 'Activité sans nom' }}
              </div>
              <div class="panel-tags" v-if="selectedSlot.activityTemplate?.tags?.length">
                <span 
                  v-for="tag in selectedSlot.activityTemplate.tags" 
                  :key="tag" 
                  class="panel-tag"
                  :style="getTagStyle(tag)"
                >
                  {{ tag }}
                </span>
              </div>
              <p class="panel-desc" v-if="selectedSlot.activityTemplate?.description">
                {{ selectedSlot.activityTemplate.description }}
              </p>
            </div>

            <!-- Date & Time -->
            <div class="panel-section">
              <div class="panel-section-title">📅 Date & Horaire</div>
              <div class="panel-datetime">
                <div class="panel-date">{{ formatFullDate(selectedSlot.startDate) }}</div>
                <div class="panel-time">
                  <span class="panel-time-start">{{ formatTimeOnly(selectedSlot.startDate) }}</span>
                  <span class="panel-time-sep">→</span>
                  <span class="panel-time-end">{{ formatTimeOnly(selectedSlot.endDate) }}</span>
                </div>
                <div class="panel-duration">
                  ⏱️ {{ getDurationMinutes(selectedSlot) }} minutes
                </div>
              </div>
            </div>

            <!-- Location -->
            <div class="panel-section" v-if="selectedSlot.location">
              <div class="panel-section-title">📍 Lieu</div>
              <div class="panel-location-card">
                <span class="panel-location-name">{{ selectedSlot.location.name }}</span>
                <span class="panel-location-capacity" v-if="selectedSlot.location.capacity">
                  {{ selectedSlot.location.capacity }} places max
                </span>
              </div>
            </div>

            <!-- Facilitators -->
            <div class="panel-section" v-if="selectedSlot.facilitators?.length">
              <div class="panel-section-title">👨‍🏫 Animateurs</div>
              <div class="panel-people-list">
                <div 
                  v-for="fac in selectedSlot.facilitators" 
                  :key="fac.documentId || fac.id" 
                  class="panel-person-card fac"
                >
                  <span class="person-avatar">👨‍🏫</span>
                  <div class="person-info">
                    <span class="person-name">{{ fac.firstName }} {{ fac.lastName }}</span>
                    <span class="person-email" v-if="fac.email">{{ fac.email }}</span>
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
                    <span class="person-email" v-if="part.email">{{ part.email }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
import CalendarView from '../components/CalendarView.vue';

function hashStringToHSL(str, saturation = 70, lightness = 55) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const hue = Math.abs(hash) % 360;
  return { h: hue, s: saturation, l: lightness };
}

function getColorForSlot(slot) {
  const tags = slot?.activityTemplate?.tags;
  if (tags && tags.length > 0) {
    return hashStringToHSL(tags[0]);
  }
  const name = slot?.activityTemplate?.name;
  if (name) {
    return hashStringToHSL(name, 60, 50);
  }
  return { h: 235, s: 70, l: 55 };
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
    }
  },
  data() {
    return {
      scopeFilter: 'all', // 'all' (Toutes les activités) or 'mine' (Mes activités)
      timeFilter: 'upcoming',
      selectedTag: '',
      selectedSlot: null,
      calendarTargetDate: null,
      countdownText: '',
      countdownTimer: null
    };
  },
  computed: {
    defaultCalendarView() {
      return window.innerWidth < 768 ? 'day' : 'week';
    },
    activeBaseSlots() {
      if (this.scopeFilter === 'mine' && Array.isArray(this.userRelevantSlots) && this.userRelevantSlots.length > 0) {
        return this.userRelevantSlots;
      }
      return this.timeslots || [];
    },
    availableTags() {
      const tagSet = new Set();
      this.activeBaseSlots.forEach(s => {
        const tags = s.activityTemplate?.tags;
        if (Array.isArray(tags)) {
          tags.forEach(t => tagSet.add(t));
        }
      });
      return Array.from(tagSet).sort();
    },
    filteredByTime() {
      const now = new Date();
      if (this.timeFilter === 'upcoming') {
        return this.activeBaseSlots.filter(s => new Date(s.endDate || s.startDate) >= now);
      } else if (this.timeFilter === 'past') {
        return this.activeBaseSlots
          .filter(s => new Date(s.endDate || s.startDate) < now)
          .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
      }
      return [...this.activeBaseSlots];
    },
    displayedSlots() {
      let slots = this.filteredByTime;
      if (this.selectedTag) {
        slots = slots.filter(s => 
          Array.isArray(s.activityTemplate?.tags) && s.activityTemplate.tags.includes(this.selectedTag)
        );
      }
      return slots;
    },
    nextSlot() {
      const now = new Date();
      const upcoming = this.activeBaseSlots
        .filter(s => new Date(s.startDate) > now)
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      return upcoming[0] || null;
    }
  },
  watch: {
    nextSlot: {
      immediate: true,
      handler() {
        this.updateCountdown();
      }
    }
  },
  mounted() {
    this.countdownTimer = setInterval(() => this.updateCountdown(), 60000);
    this.updateCountdown();
  },
  beforeUnmount() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  },
  methods: {
    updateCountdown() {
      if (!this.nextSlot) {
        this.countdownText = '';
        return;
      }
      const now = new Date();
      const target = new Date(this.nextSlot.startDate);
      const diffMs = target - now;
      if (diffMs <= 0) {
        this.countdownText = 'Maintenant !';
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
      if (!slot.startDate || !slot.endDate) return '—';
      const diff = new Date(slot.endDate) - new Date(slot.startDate);
      return Math.round(diff / 60000);
    },
    jumpToSlot(slot) {
      if (slot?.startDate) {
        this.calendarTargetDate = new Date(slot.startDate);
      }
    },
    openDetailPanel(slot) {
      this.selectedSlot = slot;
    },
    closeDetailPanel() {
      this.selectedSlot = null;
    },
    getSlotAccentBg(slot) {
      const color = getColorForSlot(slot);
      return {
        background: `linear-gradient(135deg, hsla(${color.h}, ${color.s}%, ${color.l}%, 0.2), hsla(${color.h}, ${color.s}%, ${color.l - 10}%, 0.1))`,
        borderLeft: `4px solid hsl(${color.h}, ${color.s}%, ${color.l}%)`
      };
    },
    getTagStyle(tag) {
      const color = hashStringToHSL(tag);
      return {
        background: `hsla(${color.h}, ${color.s}%, ${color.l}%, 0.2)`,
        color: `hsl(${color.h}, ${color.s}%, ${color.l + 20}%)`,
        borderColor: `hsla(${color.h}, ${color.s}%, ${color.l}%, 0.4)`
      };
    }
  }
};
</script>

<style scoped>
/* ════════════════ WRAPPER ════════════════ */
.client-planning-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* ════════════════ HERO NEXT ACTIVITY ════════════════ */
.next-activity-hero {
  position: relative;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.9));
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 1rem;
  padding: 1.5rem;
  overflow: hidden;
}

.hero-glow {
  position: absolute;
  top: -30%;
  right: -10%;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%);
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

.hero-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #a5b4fc;
}

.hero-activity-name {
  font-size: 1.5rem;
  font-weight: 800;
  color: #ffffff;
  margin: 0;
  line-height: 1.3;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.hero-date-badge,
.hero-time-badge,
.hero-location-badge {
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.3rem 0.7rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.07);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.hero-date-badge {
  background: rgba(99, 102, 241, 0.15);
  color: #c7d2fe;
  border-color: rgba(99, 102, 241, 0.3);
}

.hero-people {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.hero-fac {
  font-size: 0.8rem;
  color: #c7d2fe;
  background: rgba(99, 102, 241, 0.12);
  padding: 0.2rem 0.5rem;
  border-radius: 0.35rem;
}

.hero-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
}

.hero-countdown {
  text-align: right;
}

.countdown-value {
  font-size: 1.1rem;
  font-weight: 800;
  color: #818cf8;
  background: rgba(99, 102, 241, 0.12);
  padding: 0.4rem 1rem;
  border-radius: 0.6rem;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.hero-see-btn {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #ffffff;
  border: none;
  padding: 0.55rem 1.2rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
}

.hero-see-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(99, 102, 241, 0.5);
}

.hero-empty {
  border-color: rgba(255, 255, 255, 0.08);
}

.hero-empty-text {
  color: #94a3b8;
  font-size: 0.9rem;
  margin: 0;
}

/* ════════════════ FILTER BAR ════════════════ */
.planning-filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
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

.tag-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  padding-left: 0.5rem;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.tag-pill {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  padding: 0.3rem 0.65rem;
  border-radius: 1.5rem;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag-pill:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
}

.tag-pill.active {
  background: rgba(99, 102, 241, 0.2);
  color: #c7d2fe;
  border-color: rgba(99, 102, 241, 0.5);
}

/* ════════════════ DETAIL SIDE PANEL ════════════════ */
.detail-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.detail-panel {
  width: 420px;
  max-width: 90vw;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 30px rgba(0, 0, 0, 0.4);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.5);
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
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.panel-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.panel-section-title {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #a5b4fc;
}

.panel-activity-name {
  font-size: 1.2rem;
  font-weight: 800;
  color: #ffffff;
  padding: 0.85rem 1rem;
  border-radius: 0.6rem;
}

.panel-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.panel-tag {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.18rem 0.55rem;
  border-radius: 1rem;
  border: 1px solid;
}

.panel-desc {
  font-size: 0.88rem;
  color: #94a3b8;
  line-height: 1.5;
}

.panel-datetime {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  background: rgba(15, 23, 42, 0.5);
  padding: 0.85rem 1rem;
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
  font-size: 1.2rem;
  font-weight: 800;
  color: #818cf8;
}

.panel-time-sep {
  color: #475569;
  font-size: 0.9rem;
}

.panel-time-end {
  font-size: 1.2rem;
  font-weight: 800;
  color: #a5b4fc;
}

.panel-duration {
  font-size: 0.82rem;
  color: #94a3b8;
}

.panel-location-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 0.5rem;
  padding: 0.65rem 1rem;
}

.panel-location-name {
  font-weight: 700;
  color: #34d399;
  font-size: 0.95rem;
}

.panel-location-capacity {
  font-size: 0.78rem;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.06);
  padding: 0.2rem 0.5rem;
  border-radius: 0.35rem;
}

.panel-people-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.panel-person-card {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: background 0.15s ease;
}

.panel-person-card:hover {
  background: rgba(255, 255, 255, 0.04);
}

.panel-person-card.fac {
  background: rgba(99, 102, 241, 0.08);
}

.panel-person-card.part {
  background: rgba(236, 72, 153, 0.06);
}

.person-avatar {
  font-size: 1.2rem;
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

/* ════════════════ RESPONSIVE ════════════════ */
@media (max-width: 768px) {
  .hero-content {
    flex-direction: column;
    gap: 1rem;
  }

  .hero-right {
    align-items: flex-start;
    flex-direction: row;
    gap: 0.75rem;
  }

  .hero-activity-name {
    font-size: 1.2rem;
  }

  .hero-meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .detail-panel {
    width: 100vw;
    max-width: 100vw;
  }

  .planning-filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .tag-filter-row {
    border-left: none;
    padding-left: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 0.5rem;
  }
}
</style>
