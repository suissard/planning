<template>
  <div class="calendar-container printable-calendar-view">
    <!-- CALENDAR TOOLBAR & CONTROLS (HIDDEN ON PRINT) -->
    <div class="calendar-toolbar no-print">
      <div class="view-switchers" v-if="!hideViewSwitchers">
        <button 
          class="view-btn" 
          :class="{ active: viewMode === 'month' }" 
          @click="setViewMode('month')"
        >
          🗓️ Mois
        </button>
        <button 
          class="view-btn" 
          :class="{ active: viewMode === 'week' }" 
          @click="setViewMode('week')"
        >
          📅 Semaine
        </button>
        <button 
          class="view-btn" 
          :class="{ active: viewMode === 'day' }" 
          @click="setViewMode('day')"
        >
          📆 Jour
        </button>
      </div>

      <!-- DATE NAVIGATION -->
      <div class="date-navigation">
        <button class="nav-arrow-btn" @click="navigateDate(-1)" title="Période précédente">◄</button>
        <button class="today-btn" @click="goToToday" title="Revenir au jour présent">Aujourd'hui</button>
        <button class="nav-arrow-btn" @click="navigateDate(1)" title="Période suivante">►</button>
        <div class="period-title-block">
          <Transition :name="transitionName" mode="out-in">
            <span :key="periodTitle" class="current-period-title">{{ periodTitle }}</span>
          </Transition>
          <span v-if="viewMode === 'week' && weekRelativeDaysLabel" class="period-relative-subtitle">
            {{ weekRelativeDaysLabel }}
          </span>
        </div>
      </div>

      <!-- ACTIONS -->
      <div class="calendar-actions">
        <button class="action-btn print-btn" @click="printCalendar">
          🖨️ Imprimer la vue
        </button>
      </div>
    </div>

    <!-- PRINT HEADER ONLY VISIBLE WHEN PRINTING -->
    <div class="print-only-header">
      <div class="print-brand-badge">EHPAD LES ÉCRIVAINS — ACCUEIL DE JOUR • GUÉRANDE</div>
      <h2>📋 Planning & Récapitulatif — {{ periodTitle }}</h2>
      <p>Vue sélectionnée : <strong>{{ viewModeLabel }}</strong> | Imprimé le {{ currentFormattedDate }}</p>
    </div>

    <!-- CALENDAR VIEWS WRAPPER WITH TIME SLIDE TRANSITION -->
    <Transition :name="transitionName" mode="out-in">
      <div :key="periodKey" class="calendar-animated-view-wrapper">
        <!-- ════════════════ 1. MONTH VIEW ════════════════ -->
        <div v-if="viewMode === 'month'" class="month-view">
          <div class="month-grid-header">
        <div v-for="dayName in weekDays" :key="dayName" class="month-header-cell">
          {{ dayName }}
        </div>
      </div>
      <div class="month-grid-body">
        <div 
          v-for="cell in monthDaysGrid" 
          :key="cell.dateKey" 
          class="month-day-cell"
          :class="{ 
            'other-month': !cell.isCurrentMonth, 
            'is-today': cell.isToday,
            'is-past-day': cell.isPast
          }"
          @click="cell.isCurrentMonth && selectDayFromCell(cell.date)"
        >
          <div class="cell-day-number">
            <span class="day-num" :class="{ 'today-pulse': cell.isToday }">{{ cell.dayNumber }}</span>
            <span v-if="cell.slots.length > 0" class="badge-count">{{ cell.slots.length }}</span>
          </div>

          <div class="cell-slots-list">
            <div 
              v-for="(slot, sIdx) in cell.slots.slice(0, 3)" 
              :key="slot.documentId || slot.id"
              class="month-slot-badge"
              :class="{ 'is-past-slot': isSlotPast(slot), 'is-first-day-event': sIdx === 0 || isFirstDayEvent(slot), 'is-last-day-event': sIdx === cell.slots.length - 1 || isLastDayEvent(slot) }"
              :style="getSlotColorStyle(slot)"
              @click.stop="$emit('select-slot', slot)"
              :title="getSlotTooltip(slot)"
            >
              <span class="slot-time">{{ formatTimeOnly(slot.startDate) }}</span>
              <span class="slot-title">{{ slot.activityTemplate?.name || 'Créneau' }}</span>
              <span class="month-slot-location" v-if="slot.location">📍 {{ slot.location.name }}</span>
            </div>
            <div v-if="cell.slots.length > 3" class="more-slots">
              + {{ cell.slots.length - 3 }} autre(s)
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════ 2. WEEK VIEW ════════════════ -->
    <div v-else-if="viewMode === 'week'" class="week-view">
      <div class="week-grid-header">
        <div class="time-col-header">Heure</div>
        <div 
          v-for="day in weekDaysList" 
          :key="day.dateKey" 
          class="week-header-cell"
          :class="{ 'is-today': day.isToday, 'is-past-day': day.isPast }"
        >
          <span class="day-name">{{ day.dayName }}</span>
          <span class="day-date">{{ day.dayNumber }} {{ day.monthShort }}</span>
        </div>
      </div>

      <div class="week-grid-body">
        <!-- Rows per hour from dynamic range -->
        <div v-for="hour in hoursList" :key="hour" class="week-hour-row">
          <div class="time-cell">{{ hour }}:00</div>
          <div 
            v-for="day in weekDaysList" 
            :key="day.dateKey" 
            class="week-day-hour-cell"
          >
            <div 
              v-for="slot in getSlotsForDayAndHour(day.date, hour)" 
              :key="slot.documentId || slot.id"
              class="week-slot-card"
              :class="{ 'is-first-day-event': isFirstDayEvent(slot), 'is-last-day-event': isLastDayEvent(slot) }"
              :style="getSlotColorStyle(slot)"
              @click="$emit('select-slot', slot)"
            >
              <div class="week-slot-time">
                {{ formatTimeOnly(slot.startDate) }} - {{ formatTimeOnly(slot.endDate) }}
              </div>
              <div class="week-slot-title">
                {{ slot.activityTemplate?.name || 'Activité' }}
              </div>
              <div class="week-slot-location" v-if="slot.location">
                📍 {{ slot.location.name }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════ 3. DAY VIEW ════════════════ -->
    <div v-else-if="viewMode === 'day'" class="day-view">
      <div class="day-view-header">
        <h3>{{ formatFullDate(currentDate) }}</h3>
        <span class="day-slots-count">{{ currentDaySlots.length }} créneau(x)</span>
      </div>

      <div v-if="currentDaySlots.length === 0" class="empty-state-card">
        <span class="empty-icon">📅</span>
        <p>Aucun créneau planifié pour cette journée.</p>
      </div>

      <div v-else class="day-slots-timeline">
        <div 
          v-for="(slot, dIdx) in currentDaySlots" 
          :key="slot.documentId || slot.id" 
          class="day-timeline-item"
          :class="{ 'is-first-day-event': dIdx === 0 || isFirstDayEvent(slot), 'is-last-day-event': dIdx === currentDaySlots.length - 1 || isLastDayEvent(slot) }"
          @click="$emit('select-slot', slot)"
        >
          <div class="time-col" :style="getSlotAccentStyle(slot)">
            <span class="time-start">{{ formatTimeOnly(slot.startDate) }}</span>
            <span class="time-end">{{ formatTimeOnly(slot.endDate) }}</span>
          </div>

          <div class="day-slot-detail-card" :style="getSlotBorderStyle(slot)">
            <div class="slot-main-info">
              <span class="activity-name">{{ slot.activityTemplate?.name || 'Activité sans nom' }}</span>
              <span class="location-badge" v-if="slot.location">📍 {{ slot.location.name }}</span>
            </div>

            <div class="slot-tags-row" v-if="isAdminMode && slot.activityTemplate?.tags?.length">
              <span 
                v-for="tag in slot.activityTemplate.tags" 
                :key="tag" 
                class="slot-tag-chip"
                :style="getTagChipStyle(tag)"
              >
                {{ tag }}
              </span>
            </div>

            <p class="activity-desc" v-if="slot.activityTemplate?.description">
              {{ slot.activityTemplate.description }}
            </p>

            <div class="slot-people-row">
              <div class="people-group" v-if="slot.facilitators && slot.facilitators.length">
                <span class="people-label">Animateurs :</span>
                <span 
                  v-for="fac in slot.facilitators" 
                  :key="fac.documentId || fac.id"
                  class="person-chip fac-chip"
                >
                  👨‍🏫 {{ fac.firstName }} {{ fac.lastName }}
                </span>
              </div>

              <div class="people-group" v-if="slot.participants && slot.participants.length">
                <span class="people-label">Participants ({{ slot.participants.length }}) :</span>
                <span 
                  v-for="part in slot.participants.slice(0, 5)" 
                  :key="part.documentId || part.id"
                  class="person-chip part-chip"
                >
                  {{ part.firstName }} {{ part.lastName }}
                </span>
                <span v-if="slot.participants.length > 5" class="person-chip more-chip">
                  +{{ slot.participants.length - 5 }}
                </span>
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
import { useAppSettingsStore } from '../stores/appSettings';

// Generate a stable HSL color from a string (tag name)
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
  return { h: 235, s: 70, l: 55 }; // Default indigo
}

export default {
  name: 'CalendarView',
  props: {
    timeslots: {
      type: Array,
      default: () => []
    },
    targetDate: {
      type: [Date, String],
      default: null
    },
    defaultView: {
      type: String,
      default: 'month'
    },
    hideViewSwitchers: {
      type: Boolean,
      default: false
    }
  },
  emits: ['select-slot'],
  data() {
    return {
      viewMode: this.defaultView || 'month',
      currentDate: new Date(),
      transitionName: 'slide-left',
      weekDays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
      hoursList: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
      isMobile: false
    };
  },
  mounted() {
    this.checkMobile();
    window.addEventListener('resize', this.checkMobile);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.checkMobile);
  },
  watch: {
    targetDate: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          const d = new Date(newVal);
          if (!isNaN(d.getTime())) {
            if (d > this.currentDate) {
              this.transitionName = 'slide-left';
            } else if (d < this.currentDate) {
              this.transitionName = 'slide-right';
            }
            this.currentDate = d;
          }
        }
      }
    },
    defaultView(newVal) {
      if (newVal) {
        this.viewMode = newVal;
      }
    },
    timeslots: {
      immediate: true,
      handler(slots) {
        if (!this.targetDate && Array.isArray(slots) && slots.length > 0) {
          const now = new Date();
          const upcoming = slots
            .filter(s => new Date(s.endDate || s.startDate) >= now)
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
          if (upcoming.length > 0 && upcoming[0].startDate) {
            this.currentDate = new Date(upcoming[0].startDate);
          } else if (slots[0]?.startDate) {
            this.currentDate = new Date(slots[0].startDate);
          }
        }
      }
    }
  },
  computed: {
    periodKey() {
      if (this.viewMode === 'month') {
        return `${this.viewMode}-${this.currentDate.getFullYear()}-${this.currentDate.getMonth()}`;
      } else if (this.viewMode === 'week') {
        const start = this.getStartOfWeek(this.currentDate);
        return `${this.viewMode}-${this.toDateKey(start)}`;
      } else {
        return `${this.viewMode}-${this.toDateKey(this.currentDate)}`;
      }
    },
    isAdminMode() {
      const store = useAppSettingsStore();
      return store.isAdminMode;
    },
    currentFormattedDate() {
      return new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    viewModeLabel() {
      switch (this.viewMode) {
        case 'month': return 'Mois';
        case 'week': return 'Semaine';
        case 'day': return 'Jour';
        default: return '';
      }
    },
    periodTitle() {
      const year = this.currentDate.getFullYear();
      const monthName = this.currentDate.toLocaleDateString('fr-FR', { month: 'long' });
      const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

      if (this.viewMode === 'month') {
        return `${capitalizedMonth} ${year}`;
      } else if (this.viewMode === 'week') {
        const start = this.getStartOfWeek(this.currentDate);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return `Semaine du ${start.getDate()} ${start.toLocaleDateString('fr-FR', { month: 'short' })} au ${end.getDate()} ${end.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`;
      } else if (this.viewMode === 'day') {
        return this.formatFullDate(this.currentDate);
      } else {
        return `Récapitulatif ${capitalizedMonth} ${year}`;
      }
    },
    weekRelativeDaysLabel() {
      if (this.viewMode !== 'week') return '';
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const start = this.getStartOfWeek(this.currentDate);
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDay = new Date(startDay);
      endDay.setDate(endDay.getDate() + 6);

      // 1. Is today inside this week?
      if (today >= startDay && today <= endDay) {
        // Find if there is a slot in this week starting today or later
        const upcomingSlotsThisWeek = this.timeslots.filter(s => {
          if (!s.startDate) return false;
          const sd = new Date(s.startDate);
          return sd >= today && sd <= new Date(endDay.getTime() + 86400000);
        }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        if (upcomingSlotsThisWeek.length > 0) {
          const firstD = new Date(upcomingSlotsThisWeek[0].startDate);
          const firstDay = new Date(firstD.getFullYear(), firstD.getMonth(), firstD.getDate());
          const diffDays = Math.round((firstDay - today) / (1000 * 60 * 60 * 24));
          if (diffDays === 0) return "📍 Cette semaine (activité aujourd'hui)";
          if (diffDays === 1) return "📍 Cette semaine (activité demain / dans 1 jour)";
          return `📍 Cette semaine (activité dans ${diffDays} jours)`;
        }
        return "📍 Cette semaine (en cours)";
      }

      // 2. Is this week in the future?
      if (startDay > today) {
        // Find first slot in this week if any
        const slotsThisWeek = this.timeslots.filter(s => {
          if (!s.startDate) return false;
          const sd = new Date(s.startDate);
          return sd >= startDay && sd <= new Date(endDay.getTime() + 86400000);
        }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        const targetDateObj = slotsThisWeek.length > 0 ? new Date(slotsThisWeek[0].startDate) : startDay;
        const targetDay = new Date(targetDateObj.getFullYear(), targetDateObj.getMonth(), targetDateObj.getDate());
        const diffDays = Math.round((targetDay - today) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return "⏳ Débute dans 1 jour (demain)";
        return `⏳ Débute dans ${diffDays} jours à partir d'aujourd'hui`;
      }

      // 3. Is this week in the past?
      const diffDays = Math.round((today - endDay) / (1000 * 60 * 60 * 24));
      return `📜 Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    },

    // Month view grid calculation
    monthDaysGrid() {
      const year = this.currentDate.getFullYear();
      const month = this.currentDate.getMonth();
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);

      let startDayOfWeek = firstDayOfMonth.getDay() - 1;
      if (startDayOfWeek === -1) startDayOfWeek = 6;

      const cells = [];
      const todayStr = this.toDateKey(new Date());

      const prevMonthLastDay = new Date(year, month, 0).getDate();
      for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const d = new Date(year, month - 1, prevMonthLastDay - i);
        const dateKey = this.toDateKey(d);
        cells.push({
          date: d,
          dateKey,
          dayNumber: d.getDate(),
          isCurrentMonth: false,
          isToday: dateKey === todayStr,
          isPast: dateKey < todayStr,
          slots: this.getSlotsForDateKey(dateKey)
        });
      }

      for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
        const d = new Date(year, month, day);
        const dateKey = this.toDateKey(d);
        cells.push({
          date: d,
          dateKey,
          dayNumber: day,
          isCurrentMonth: true,
          isToday: dateKey === todayStr,
          isPast: dateKey < todayStr,
          slots: this.getSlotsForDateKey(dateKey)
        });
      }

      const totalCells = cells.length > 35 ? 42 : 35;
      const remainingCells = totalCells - cells.length;
      for (let day = 1; day <= remainingCells; day++) {
        const d = new Date(year, month + 1, day);
        const dateKey = this.toDateKey(d);
        cells.push({
          date: d,
          dateKey,
          dayNumber: day,
          isCurrentMonth: false,
          isToday: dateKey === todayStr,
          isPast: dateKey < todayStr,
          slots: this.getSlotsForDateKey(dateKey)
        });
      }

      return cells;
    },

    weekDaysList() {
      const start = this.getStartOfWeek(this.currentDate);
      const todayStr = this.toDateKey(new Date());
      const days = [];

      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const dateKey = this.toDateKey(d);

        days.push({
          date: d,
          dateKey,
          dayNumber: d.getDate(),
          dayName: this.weekDays[i],
          monthShort: d.toLocaleDateString('fr-FR', { month: 'short' }),
          isToday: dateKey === todayStr,
          isPast: dateKey < todayStr
        });
      }

      return days;
    },

    currentDaySlots() {
      const dateKey = this.toDateKey(this.currentDate);
      return this.getSlotsForDateKey(dateKey).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    },

    groupedSlotsByDate() {
      const map = {};
      this.timeslots.forEach(slot => {
        if (!slot.startDate) return;
        const dateKey = this.toDateKey(new Date(slot.startDate));
        if (!map[dateKey]) {
          const dateObj = new Date(slot.startDate);
          map[dateKey] = {
            dateKey,
            dateObj,
            dateFormatted: this.formatFullDate(dateObj),
            slots: []
          };
        }
        map[dateKey].slots.push(slot);
      });

      const result = Object.values(map);
      result.sort((a, b) => a.dateObj - b.dateObj);
      result.forEach(group => {
        group.slots.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      });

      return result;
    }
  },
  methods: {
    isFirstDayEvent(slot) {
      if (!slot || !slot.startDate) return false;
      const dateKey = this.toDateKey(new Date(slot.startDate));
      const daySlots = this.getSlotsForDateKey(dateKey);
      if (!daySlots || !daySlots.length) return false;
      const sorted = [...daySlots].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      const firstId = sorted[0]?.documentId || sorted[0]?.id;
      const currentId = slot.documentId || slot.id;
      return firstId && currentId && firstId === currentId;
    },
    isLastDayEvent(slot) {
      if (!slot || !slot.startDate) return false;
      const dateKey = this.toDateKey(new Date(slot.startDate));
      const daySlots = this.getSlotsForDateKey(dateKey);
      if (!daySlots || !daySlots.length) return false;
      const sorted = [...daySlots].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      const lastSlot = sorted[sorted.length - 1];
      const lastId = lastSlot?.documentId || lastSlot?.id;
      const currentId = slot.documentId || slot.id;
      return lastId && currentId && lastId === currentId;
    },
    checkMobile() {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth < 768;
      // Auto-switch to day view on mobile if currently in week view
      if (this.isMobile && !wasMobile && this.viewMode === 'week') {
        this.viewMode = 'day';
      }
    },
    isSlotPast(slot) {
      if (!slot || !slot.startDate) return false;
      return new Date(slot.endDate || slot.startDate) < new Date();
    },
    setViewMode(mode) {
      // On mobile, redirect week to day
      if (this.isMobile && mode === 'week') {
        this.viewMode = 'day';
        return;
      }
      this.viewMode = mode;
    },
    navigateDate(direction) {
      if (direction > 0) {
        this.transitionName = 'slide-left';
      } else {
        this.transitionName = 'slide-right';
      }
      const d = new Date(this.currentDate);
      if (this.viewMode === 'month') {
        d.setMonth(d.getMonth() + direction);
      } else if (this.viewMode === 'week') {
        d.setDate(d.getDate() + (direction * 7));
      } else if (this.viewMode === 'day') {
        d.setDate(d.getDate() + direction);
      } else {
        d.setMonth(d.getMonth() + direction);
      }
      this.currentDate = d;
    },
    goToToday() {
      const today = new Date();
      if (today > this.currentDate) {
        this.transitionName = 'slide-left';
      } else if (today < this.currentDate) {
        this.transitionName = 'slide-right';
      }
      this.currentDate = today;
    },
    selectDayFromCell(date) {
      this.currentDate = new Date(date);
      this.viewMode = 'day';
    },
    getStartOfWeek(date) {
      const d = new Date(date);
      let day = d.getDay();
      let diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.setDate(diff));
    },
    toDateKey(date) {
      if (!(date instanceof Date) || isNaN(date)) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
    getSlotsForDateKey(dateKey) {
      if (!dateKey) return [];
      return this.timeslots.filter(s => {
        if (!s.startDate) return false;
        return this.toDateKey(new Date(s.startDate)) === dateKey;
      });
    },
    getSlotsForDayAndHour(date, hour) {
      const dateKey = this.toDateKey(date);
      return this.timeslots.filter(s => {
        if (!s.startDate) return false;
        const d = new Date(s.startDate);
        return this.toDateKey(d) === dateKey && d.getHours() === hour;
      });
    },
    formatTimeOnly(isoString) {
      if (!isoString) return '';
      const d = new Date(isoString);
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    },
    formatFullDate(date) {
      if (!date) return '';
      const d = new Date(date);
      const formatted = d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    },
    getSlotTooltip(slot) {
      const act = slot.activityTemplate?.name || 'Activité';
      const loc = slot.location?.name || 'Lieu inconnu';
      const time = `${this.formatTimeOnly(slot.startDate)} - ${this.formatTimeOnly(slot.endDate)}`;
      return `${time} | ${act} | ${loc}`;
    },
    // Tag-based color methods
    getSlotColorStyle(slot) {
      const color = getColorForSlot(slot);
      return {
        background: `linear-gradient(135deg, hsla(${color.h}, ${color.s}%, ${color.l}%, 0.25), hsla(${color.h}, ${color.s}%, ${color.l - 10}%, 0.35))`,
        borderLeftColor: `hsl(${color.h}, ${color.s}%, ${color.l}%)`
      };
    },
    getSlotAccentStyle(slot) {
      const color = getColorForSlot(slot);
      return {
        borderColor: `hsla(${color.h}, ${color.s}%, ${color.l}%, 0.3)`,
        background: `rgba(15, 23, 42, 0.6)`
      };
    },
    getSlotBorderStyle(slot) {
      const color = getColorForSlot(slot);
      return {
        borderLeftColor: `hsl(${color.h}, ${color.s}%, ${color.l}%)`
      };
    },
    getTagChipStyle(tag) {
      const color = hashStringToHSL(tag);
      return {
        background: `hsla(${color.h}, ${color.s}%, ${color.l}%, 0.2)`,
        color: `hsl(${color.h}, ${color.s}%, ${color.l + 20}%)`,
        borderColor: `hsla(${color.h}, ${color.s}%, ${color.l}%, 0.4)`
      };
    },
    printCalendar() {
      window.print();
    }
  }
};
</script>

<style scoped>
.calendar-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: var(--card-bg, #1e293b);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 1rem;
  padding: 1.25rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}

.calendar-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
}

.view-switchers {
  display: flex;
  gap: 0.35rem;
  background: rgba(15, 23, 42, 0.6);
  padding: 0.3rem;
  border-radius: 0.6rem;
}

.view-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary, #94a3b8);
  padding: 0.45rem 0.85rem;
  border-radius: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.05);
}

.view-btn.active {
  background: var(--primary-color, #0d9488);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.4);
}

.date-navigation {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-arrow-btn, .today-btn {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #ffffff;
  padding: 0.4rem 0.75rem;
  border-radius: 0.4rem;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.nav-arrow-btn:hover, .today-btn:hover {
  background: rgba(13, 148, 136, 0.2);
  border-color: rgba(13, 148, 136, 0.4);
}

.period-title-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
  margin-left: 0.5rem;
}

.current-period-title {
  display: inline-block;
  font-size: 1.05rem;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.2;
}

.period-relative-subtitle {
  font-size: 0.76rem;
  font-weight: 700;
  color: #5eead4;
  background: rgba(13, 148, 136, 0.15);
  border: 1px solid rgba(13, 148, 136, 0.35);
  padding: 0.12rem 0.5rem;
  border-radius: 0.35rem;
  letter-spacing: 0.02em;
  display: inline-block;
}

.print-btn {
  background: linear-gradient(135deg, #0d9488, #059669);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.print-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(13, 148, 136, 0.4);
}

.print-only-header {
  display: none;
}

/* ════════════════ TODAY PULSE ANIMATION ════════════════ */
@keyframes today-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(13, 148, 136, 0.5); }
  50% { box-shadow: 0 0 0 4px rgba(13, 148, 136, 0.2); }
}

.today-pulse {
  animation: today-glow 2.5s ease-in-out infinite;
  background: #0d9488;
  color: white;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}

/* ════════════════ TAG CHIPS IN DAY VIEW ════════════════ */
.slot-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-bottom: 0.4rem;
}

.slot-tag-chip {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 1rem;
  border: 1px solid;
}

/* ════════════════ MONTH VIEW STYLES ════════════════ */
.month-grid-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 0.5rem 0.5rem 0 0;
}

.month-header-cell {
  background: rgba(15, 23, 42, 0.9);
  padding: 0.6rem;
  text-align: center;
  font-weight: 700;
  font-size: 0.85rem;
  color: #5eead4;
  text-transform: uppercase;
}

.month-grid-body {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 0 0 0.5rem 0.5rem;
  overflow: hidden;
}

.month-day-cell {
  background: rgba(30, 41, 59, 0.7);
  min-height: 105px;
  padding: 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  cursor: pointer;
  transition: background 0.15s ease;
}

.month-day-cell:hover {
  background: rgba(30, 41, 59, 0.95);
}

.month-day-cell.other-month {
  opacity: 0.35;
  background: rgba(15, 23, 42, 0.4);
}

.month-day-cell.is-today {
  background: rgba(13, 148, 136, 0.15);
  border: 1px inset rgba(13, 148, 136, 0.5);
}

.cell-day-number {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  font-size: 0.85rem;
  color: #cbd5e1;
}

.badge-count {
  font-size: 0.7rem;
  background: rgba(13, 148, 136, 0.3);
  color: #5eead4;
  padding: 0.1rem 0.35rem;
  border-radius: 0.3rem;
}

.cell-slots-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.month-slot-badge {
  border-left: 3px solid #0d9488;
  border-radius: 0.25rem;
  padding: 0.2rem 0.35rem;
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  gap: 0.35rem;
  color: #e2e8f0;
  transition: transform 0.1s ease, filter 0.1s ease;
}

.month-slot-badge:hover {
  transform: scale(1.03);
  filter: brightness(1.15);
}

.month-slot-badge.is-past-slot {
  opacity: 0.5;
}

.slot-time {
  font-weight: 700;
  color: #5eead4;
}

.more-slots {
  font-size: 0.7rem;
  color: #94a3b8;
  font-style: italic;
  text-align: center;
}

/* ════════════════ WEEK VIEW STYLES ════════════════ */
.week-grid-header {
  display: grid;
  grid-template-columns: 70px repeat(7, 1fr);
  gap: 1px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem 0.5rem 0 0;
}

.time-col-header, .week-header-cell {
  background: rgba(15, 23, 42, 0.9);
  padding: 0.5rem;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: #5eead4;
}

.week-header-cell.is-today {
  background: rgba(13, 148, 136, 0.25);
  color: #ffffff;
}

.week-header-cell .day-name {
  display: block;
  text-transform: uppercase;
}

.week-header-cell .day-date {
  font-size: 0.75rem;
  color: #cbd5e1;
}

.week-grid-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 0 0 0.5rem 0.5rem;
}

.week-hour-row {
  display: grid;
  grid-template-columns: 70px repeat(7, 1fr);
  gap: 1px;
  min-height: 50px;
}

.time-cell {
  background: rgba(15, 23, 42, 0.7);
  color: #94a3b8;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.week-day-hour-cell {
  background: rgba(30, 41, 59, 0.6);
  padding: 0.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.week-slot-card {
  border-left: 3px solid #0d9488;
  border-radius: 0.25rem;
  padding: 0.25rem 0.4rem;
  cursor: pointer;
  transition: transform 0.1s ease, filter 0.1s ease;
}

.week-slot-card:hover {
  transform: scale(1.02);
  filter: brightness(1.15);
}

.week-slot-time {
  font-size: 0.7rem;
  font-weight: 700;
  color: #5eead4;
}

.week-slot-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: #ffffff;
}

.week-slot-location {
  font-size: 0.7rem;
  color: #cbd5e1;
}

/* ════════════════ DAY VIEW STYLES ════════════════ */
.day-view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.day-view-header h3 {
  font-size: 1.2rem;
  color: #ffffff;
}

.day-slots-count {
  background: rgba(13, 148, 136, 0.2);
  color: #5eead4;
  padding: 0.3rem 0.75rem;
  border-radius: 2rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.day-slots-timeline {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.day-timeline-item {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 1rem;
  align-items: flex-start;
  cursor: pointer;
}

.time-col {
  display: flex;
  flex-direction: column;
  background: rgba(15, 23, 42, 0.6);
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: border-color 0.2s ease;
}

.time-start {
  font-size: 1.05rem;
  font-weight: 800;
  color: #5eead4;
}

.time-end {
  font-size: 0.8rem;
  color: #94a3b8;
}

.day-slot-detail-card {
  background: rgba(30, 41, 59, 0.8);
  border-left: 4px solid var(--primary-color, #0d9488);
  border-radius: 0.6rem;
  padding: 0.85rem 1.1rem;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
}

.day-slot-detail-card:hover {
  transform: translateX(4px);
  background: rgba(30, 41, 59, 1);
}

.slot-main-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.activity-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: #ffffff;
}

.location-badge {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  padding: 0.25rem 0.6rem;
  border-radius: 0.4rem;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.activity-desc {
  font-size: 0.85rem;
  color: #94a3b8;
  margin-bottom: 0.6rem;
}

.slot-people-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
}

.people-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.people-label {
  font-size: 0.78rem;
  color: #94a3b8;
  font-weight: 600;
}

.person-chip {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 0.3rem;
  font-weight: 500;
}

.fac-chip {
  background: rgba(13, 148, 136, 0.2);
  color: #5eead4;
}

.part-chip {
  background: rgba(244, 63, 94, 0.18);
  color: #fda4af;
}

.more-chip {
  background: rgba(255, 255, 255, 0.1);
  color: #94a3b8;
}

/* ════════════════ EMPTY STATE ════════════════ */
.empty-state-card {
  text-align: center;
  padding: 3rem 1rem;
  color: #94a3b8;
}

.empty-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

/* ════════════════ TRANSITIONS ════════════════ */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.25s ease;
}

.slide-left-enter-from {
  transform: translateX(30px);
  opacity: 0;
}
.slide-left-leave-to {
  transform: translateX(-30px);
  opacity: 0;
}
.slide-right-enter-from {
  transform: translateX(-30px);
  opacity: 0;
}
.slide-right-leave-to {
  transform: translateX(30px);
  opacity: 0;
}

/* ════════════════ RESPONSIVE ════════════════ */
@media (max-width: 768px) {
  .calendar-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .view-switchers {
    justify-content: center;
  }

  .date-navigation {
    justify-content: center;
    flex-wrap: wrap;
  }

  .calendar-actions {
    text-align: center;
  }

  .month-day-cell {
    min-height: 70px;
    padding: 0.25rem;
  }

  .month-slot-badge {
    font-size: 0.65rem;
    padding: 0.15rem 0.25rem;
  }

  .day-timeline-item {
    grid-template-columns: 85px 1fr;
    gap: 0.5rem;
  }

  .time-start {
    font-size: 0.9rem;
  }

  .slot-main-info {
    flex-direction: column;
    align-items: flex-start;
  }

  .nav-arrow-btn, .today-btn {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
}

/* ════════════════ PRINT MEDIA OVERRIDES (STRICT 1 PAGE FIT) ════════════════ */
@media print {
  @page {
    size: A4 landscape;
    margin: 0.3cm;
  }

  /* Force 1 single page height container */
  html, body, #app, .app-container, .dashboard-wrapper, .app-body, .app-content, .view-container, .client-planning-wrapper, .calendar-container {
    height: 100% !important;
    max-height: 98vh !important;
    overflow: hidden !important;
    padding: 0 !important;
    margin: 0 !important;
    box-shadow: none !important;
    border: none !important;
    background: #ffffff !important;
    color: #000000 !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .no-print,
  .calendar-toolbar {
    display: none !important;
  }

  .print-only-header {
    display: flex !important;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px !important;
    padding-bottom: 4px !important;
    border-bottom: 1.5px solid #000000 !important;
  }

  .print-only-header h2 {
    font-size: 11pt !important;
    color: #000000 !important;
    margin: 0 !important;
  }

  .print-only-header p {
    font-size: 8pt !important;
    color: #333333 !important;
    margin: 0 !important;
  }

  /* ════════ MONTH VIEW PRINT (COMPACT 1 PAGE) ════════ */
  .month-view {
    display: flex !important;
    flex-direction: column !important;
    height: calc(98vh - 1cm) !important;
  }

  .month-grid-header {
    background: #e2e8f0 !important;
  }

  .month-header-cell {
    background: #f1f5f9 !important;
    color: #000000 !important;
    font-size: 8pt !important;
    padding: 2px !important;
  }

  .month-grid-body {
    background: #cbd5e1 !important;
    flex: 1 !important;
    display: grid !important;
    grid-template-columns: repeat(7, 1fr) !important;
    grid-template-rows: repeat(5, minmax(0, 1fr)) !important;
    gap: 1px !important;
  }

  .month-day-cell {
    background: #ffffff !important;
    color: #000000 !important;
    min-height: 0 !important;
    padding: 2px 3px !important;
    border: none !important;
    overflow: hidden !important;
  }

  .month-day-cell.other-month {
    background: #f8fafc !important;
    opacity: 0.4 !important;
  }

  .cell-day-number {
    font-size: 7.5pt !important;
    margin-bottom: 1px !important;
    color: #000000 !important;
  }

  .month-slot-badge {
    background: #f1f5f9 !important;
    border-left: 2.5px solid #3b82f6 !important;
    color: #000000 !important;
    font-size: 6.5pt !important;
    padding: 1px 2px !important;
    margin-bottom: 1px !important;
  }

  .month-slot-location {
    font-size: 6pt !important;
    color: #475569 !important;
  }

  /* ════════ WEEK VIEW PRINT (COMPACT 1 PAGE) ════════ */
  .week-view {
    display: flex !important;
    flex-direction: column !important;
    height: calc(98vh - 1cm) !important;
  }

  .week-grid-header {
    background: #e2e8f0 !important;
  }

  .time-col-header, .week-header-cell {
    background: #f1f5f9 !important;
    color: #000000 !important;
    font-size: 8pt !important;
    padding: 2px !important;
  }

  .week-grid-body {
    flex: 1 !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 1px !important;
  }

  .week-hour-row {
    flex: 1 !important;
    min-height: 0 !important;
    display: grid !important;
    grid-template-columns: 55px repeat(7, 1fr) !important;
  }

  .time-cell {
    background: #f8fafc !important;
    color: #334155 !important;
    font-size: 7pt !important;
    padding: 1px !important;
  }

  .week-day-hour-cell {
    background: #ffffff !important;
    padding: 1px !important;
  }

  .week-slot-card {
    background: #f1f5f9 !important;
    border-left: 2.5px solid #4f46e5 !important;
    color: #000000 !important;
    padding: 1px 3px !important;
    font-size: 6.5pt !important;
    margin-bottom: 1px !important;
  }

  .week-slot-time {
    font-size: 6pt !important;
    color: #334155 !important;
    font-weight: 700 !important;
  }

  .week-slot-title {
    font-size: 6.5pt !important;
    color: #000000 !important;
    font-weight: 600 !important;
  }

  .week-slot-location {
    font-size: 6pt !important;
    color: #475569 !important;
  }

  /* ════════ DAY VIEW PRINT (COMPACT 1 PAGE) ════════ */
  .day-slots-timeline {
    gap: 3px !important;
    margin-top: 4px !important;
  }

  .day-timeline-item {
    grid-template-columns: 65px 1fr !important;
    gap: 6px !important;
  }

  .time-col {
    padding: 2px 4px !important;
    background: #f1f5f9 !important;
  }

  .time-start, .time-end {
    font-size: 7.5pt !important;
    color: #000000 !important;
  }

  .day-slot-detail-card {
    padding: 3px 6px !important;
    background: #ffffff !important;
    border: 1px solid #cbd5e1 !important;
  }

  .activity-name {
    font-size: 8.5pt !important;
    color: #000000 !important;
  }

  /* Hide non-essential details on print for day view to guarantee 1 page fit */
  .activity-desc,
  .slot-tags-row,
  .slot-people-row {
    display: none !important;
  }

  /* ════════ LOCATION PRINT FILTER RULE ════════ */
  /* Hide room/location for ALL events EXCEPT the FIRST and LAST event of the day */
  .week-slot-location,
  .location-badge,
  .month-slot-location {
    display: none !important;
  }

  .is-first-day-event .week-slot-location,
  .is-first-day-event .location-badge,
  .is-first-day-event .month-slot-location,
  .is-last-day-event .week-slot-location,
  .is-last-day-event .location-badge,
  .is-last-day-event .month-slot-location {
    display: block !important;
  }
}
</style>
