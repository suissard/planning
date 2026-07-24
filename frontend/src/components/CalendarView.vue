<template>
  <div class="calendar-container printable-calendar-view">
    <!-- CALENDAR TOOLBAR & CONTROLS (HIDDEN ON PRINT) -->
    <div class="calendar-toolbar no-print">
      <div class="view-switchers">
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
        <Transition :name="transitionName" mode="out-in">
          <span :key="periodTitle" class="current-period-title">{{ periodTitle }}</span>
        </Transition>
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
            <span class="day-num">{{ cell.dayNumber }}</span>
            <span v-if="cell.slots.length > 0" class="badge-count">{{ cell.slots.length }}</span>
          </div>

          <div class="cell-slots-list">
            <div 
              v-for="slot in cell.slots.slice(0, 4)" 
              :key="slot.documentId || slot.id"
              class="month-slot-badge"
              :class="{ 'is-past-slot': isSlotPast(slot) }"
              @click.stop="$emit('select-slot', slot)"
              :title="getSlotTooltip(slot)"
            >
              <span class="slot-time">{{ formatTimeOnly(slot.startDate) }}</span>
              <span class="slot-title">{{ slot.activityTemplate?.name || 'Créneau' }}</span>
            </div>
            <div v-if="cell.slots.length > 4" class="more-slots">
              + {{ cell.slots.length - 4 }} autre(s)
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
        <!-- Rows per hour from 08:00 to 19:00 -->
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
              @click="$emit('select-slot', slot)"
            >
              <div class="week-slot-time">
                {{ formatTimeOnly(slot.startDate) }} - {{ formatTimeOnly(slot.endDate) }}
              </div>
              <div class="week-slot-title">
                🎯 {{ slot.activityTemplate?.name || 'Activité' }}
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
        <span class="day-slots-count">{{ currentDaySlots.length }} créneau(x) aujourd'hui</span>
      </div>

      <div v-if="currentDaySlots.length === 0" class="empty-state-card">
        <span class="empty-icon">📅</span>
        <p>Aucun créneau planifié pour cette journée.</p>
      </div>

      <div v-else class="day-slots-timeline">
        <div 
          v-for="slot in currentDaySlots" 
          :key="slot.documentId || slot.id" 
          class="day-timeline-item"
        >
          <div class="time-col">
            <span class="time-start">{{ formatTimeOnly(slot.startDate) }}</span>
            <span class="time-end">{{ formatTimeOnly(slot.endDate) }}</span>
          </div>

          <div class="day-slot-detail-card" @click="$emit('select-slot', slot)">
            <div class="slot-main-info">
              <span class="activity-name">🎯 {{ slot.activityTemplate?.name || 'Activité sans nom' }}</span>
              <span class="location-badge" v-if="slot.location">📍 {{ slot.location.name }}</span>
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
                  v-for="part in slot.participants" 
                  :key="part.documentId || part.id"
                  class="person-chip part-chip"
                >
                  👥 {{ part.firstName }} {{ part.lastName }}
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
    }
  },
  emits: ['select-slot'],
  data() {
    return {
      viewMode: 'month', // 'month', 'week', 'day'
      currentDate: new Date(),
      transitionName: 'slide-left',
      weekDays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
      hoursList: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
    };
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
    isSlotPast(slot) {
      if (!slot || !slot.startDate) return false;
      return new Date(slot.endDate || slot.startDate) < new Date();
    },
    setViewMode(mode) {
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
  background: var(--primary-color, #6366f1);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
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
  background: rgba(255, 255, 255, 0.15);
}

.current-period-title {
  display: inline-block;
  font-size: 1.05rem;
  font-weight: 700;
  color: #f8fafc;
  margin-left: 0.5rem;
}

.print-btn {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.print-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
}

.print-only-header {
  display: none;
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
  color: #a5b4fc;
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
  background: rgba(99, 102, 241, 0.12);
  border: 1px inset rgba(99, 102, 241, 0.5);
}

.cell-day-number {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  font-size: 0.85rem;
  color: #cbd5e1;
}

.month-day-cell.is-today .day-num {
  background: #6366f1;
  color: white;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-count {
  font-size: 0.7rem;
  background: rgba(99, 102, 241, 0.3);
  color: #a5b4fc;
  padding: 0.1rem 0.35rem;
  border-radius: 0.3rem;
}

.cell-slots-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.month-slot-badge {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(79, 70, 229, 0.35));
  border-left: 3px solid #6366f1;
  border-radius: 0.25rem;
  padding: 0.2rem 0.35rem;
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  gap: 0.35rem;
  color: #e2e8f0;
}

.slot-time {
  font-weight: 700;
  color: #818cf8;
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
  color: #a5b4fc;
}

.week-header-cell.is-today {
  background: rgba(99, 102, 241, 0.25);
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
  background: rgba(99, 102, 241, 0.2);
  border-left: 3px solid #818cf8;
  border-radius: 0.25rem;
  padding: 0.25rem 0.4rem;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.week-slot-card:hover {
  transform: scale(1.02);
  background: rgba(99, 102, 241, 0.35);
}

.week-slot-time {
  font-size: 0.7rem;
  font-weight: 700;
  color: #a5b4fc;
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
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
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
}

.time-col {
  display: flex;
  flex-direction: column;
  background: rgba(15, 23, 42, 0.6);
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.time-start {
  font-size: 1.05rem;
  font-weight: 800;
  color: #818cf8;
}

.time-end {
  font-size: 0.8rem;
  color: #94a3b8;
}

.day-slot-detail-card {
  background: rgba(30, 41, 59, 0.8);
  border-left: 4px solid var(--primary-color, #6366f1);
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
  background: rgba(99, 102, 241, 0.2);
  color: #c7d2fe;
}

.part-chip {
  background: rgba(236, 72, 153, 0.2);
  color: #fbcfe8;
}

/* ════════════════ PLANNING / AGENDA VIEW STYLES ════════════════ */
.planning-groups {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.planning-date-group {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 0.65rem;
  padding: 0.5rem 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.group-header h4 {
  font-size: 0.9rem;
  font-weight: 700;
  color: #818cf8;
  margin: 0;
}

.group-count-badge {
  margin-left: auto;
  font-size: 0.7rem;
  background: rgba(255, 255, 255, 0.08);
  padding: 0.15rem 0.5rem;
  border-radius: 1rem;
  color: #94a3b8;
}

.planning-slots-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.planning-slot-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(30, 41, 59, 0.7);
  border-left: 3px solid #6366f1;
  border-radius: 0.4rem;
  padding: 0.45rem 0.75rem;
  cursor: pointer;
  transition: all 0.15s ease;
  gap: 1rem;
  flex-wrap: wrap;
}

.planning-slot-row:hover {
  background: rgba(30, 41, 59, 1);
  transform: translateX(3px);
  border-left-color: #818cf8;
}

.p-row-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.p-row-time {
  font-size: 0.8rem;
  font-weight: 700;
  color: #a5b4fc;
  background: rgba(99, 102, 241, 0.15);
  padding: 0.2rem 0.5rem;
  border-radius: 0.35rem;
  white-space: nowrap;
}

.p-row-activity {
  font-size: 0.9rem;
  color: #f8fafc;
}

.p-row-location {
  font-size: 0.8rem;
  color: #cbd5e1;
  background: rgba(255, 255, 255, 0.06);
  padding: 0.15rem 0.5rem;
  border-radius: 0.35rem;
}

.p-row-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.8rem;
}

.p-row-facs {
  color: #c7d2fe;
}

.p-row-parts {
  color: #34d399;
  background: rgba(16, 185, 129, 0.15);
  padding: 0.15rem 0.65rem;
  border-radius: 1rem;
  border: 1px solid rgba(16, 185, 129, 0.3);
  white-space: nowrap;
}

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

/* ════════════════ PRINT MEDIA OVERRIDES ════════════════ */
@media print {
  .no-print,
  .calendar-toolbar {
    display: none !important;
  }

  .calendar-container {
    background: #ffffff !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    color: #000000 !important;
  }

  .print-only-header {
    display: block !important;
    margin-bottom: 1.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #000000;
  }

  .print-only-header h2 {
    font-size: 14pt !important;
    color: #000000 !important;
    margin: 0 0 0.25rem 0;
  }

  .print-only-header p {
    font-size: 10pt !important;
    color: #333333 !important;
    margin: 0;
  }

  .month-grid-header,
  .month-grid-body {
    background: #000000 !important;
  }

  .month-header-cell {
    background: #f1f5f9 !important;
    color: #000000 !important;
    font-size: 9pt !important;
  }

  .month-day-cell {
    background: #ffffff !important;
    color: #000000 !important;
    min-height: 80px !important;
    border: 1px solid #e2e8f0 !important;
  }

  .month-day-cell.other-month {
    background: #f8fafc !important;
    opacity: 0.5 !important;
  }

  .cell-day-number {
    color: #000000 !important;
  }

  .month-slot-badge {
    background: #f1f5f9 !important;
    border-left: 3px solid #3b82f6 !important;
    color: #000000 !important;
  }

  .slot-time, .slot-title {
    color: #000000 !important;
  }

  .day-slot-detail-card,
  .planning-slot-card,
  .planning-date-group {
    background: #ffffff !important;
    border: 1px solid #cbd5e1 !important;
    color: #000000 !important;
    box-shadow: none !important;
  }

  .time-col, .time-start, .time-end,
  .activity-name, .p-activity-name, .group-header h4 {
    color: #000000 !important;
  }

  .person-chip, .location-badge {
    background: #f1f5f9 !important;
    color: #000000 !important;
    border: 1px solid #cbd5e1 !important;
  }
}
</style>
