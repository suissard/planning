<template>
  <div class="room-timeline-root">
    <!-- Header of Timeline: Opening Range & Total Free Time -->
    <div class="timeline-meta-bar">
      <div class="meta-left">
        <span class="timeline-badge-hours">
          ⏰ Ouverte de <strong>{{ displayStartTime }}</strong> à <strong>{{ displayEndTime }}</strong>
        </span>
        <span class="timeline-duration-badge">
          Durée : {{ fmtDuration(roomTotalMinutes) }}
        </span>
      </div>

      <div class="meta-right">
        <span v-if="freeSlots.length" class="free-summary-pill">
          ✨ {{ freeSlots.length }} créneau{{ freeSlots.length > 1 ? 'x' : '' }} libre{{ freeSlots.length > 1 ? 's' : '' }} ({{ fmtDuration(totalFreeMinutes) }})
        </span>
        <span v-else class="busy-summary-pill">
          🔒 Aucun créneau libre restant
        </span>
        <button
          type="button"
          class="quick-add-btn"
          @click="$emit('create-in-room', { roomSession: session, location: session.location, date: session.date, startTime: defaultNextStartTime, endTime: defaultNextEndTime })"
          title="Ajouter une animation dans cette salle"
        >
          ➕ Placer une animation
        </button>
      </div>
    </div>

    <!-- Timeline Container with Horizontal Ruler -->
    <div class="timeline-track-container" ref="trackRef">
      <!-- Hour Marks Grid Header -->
      <div class="timeline-hours-header">
        <div
          v-for="mark in hourMarks"
          :key="mark.timeStr"
          class="hour-mark"
          :style="{ left: mark.percent + '%' }"
        >
          <span class="hour-label">{{ mark.timeStr }}</span>
          <span class="hour-tick"></span>
        </div>
      </div>

      <!-- Main Visual Track -->
      <div class="timeline-track">
        <!-- Background hour lines -->
        <div
          v-for="mark in hourMarks"
          :key="'line-' + mark.timeStr"
          class="hour-grid-line"
          :style="{ left: mark.percent + '%' }"
        ></div>

        <!-- Free Slots (Clickable Gaps to create animations) -->
        <div
          v-for="(slot, idx) in freeSlots"
          :key="'free-' + idx"
          class="timeline-block free-slot-block"
          :style="{ left: slot.leftPercent + '%', width: slot.widthPercent + '%' }"
          @click="$emit('select-free-slot', { roomSession: session, location: session.location, date: session.date, startTime: slot.startStr, endTime: slot.endStr })"
          :title="`Créneau libre : ${slot.startStr} - ${slot.endStr} (${fmtDuration(slot.durationMin)}). Cliquer pour programmer une animation.`"
        >
          <div class="free-slot-content">
            <span class="free-plus">➕</span>
            <span class="free-text">
              <strong class="free-times">{{ slot.startStr }} - {{ slot.endStr }}</strong>
              <span class="free-sub">Libre ({{ fmtDuration(slot.durationMin) }})</span>
            </span>
          </div>
        </div>

        <!-- Placed Animations (Scheduled Activities) -->
        <div
          v-for="item in placedAnimations"
          :key="item.activity.documentId || item.activity.id"
          class="timeline-block placed-anim-block"
          :class="{
            'is-mine': isMyAnimation(item.activity),
            'has-active-checkin': hasCheckIns(item.slot)
          }"
          :style="{
            left: item.leftPercent + '%',
            width: item.widthPercent + '%',
            top: (item.lane * 58 + 4) + 'px'
          }"
          @click.stop="$emit('edit-animation', { animation: item.activity, slot: item.slot, roomSession: session })"
        >
          <div class="anim-block-inner">
            <div class="anim-block-top">
              <span class="anim-time-badge">
                {{ item.startStr }} - {{ item.endStr }}
              </span>
              <span v-if="isMyAnimation(item.activity)" class="anim-mine-tag" title="Vous animez cette session">
                ★ Mon animation
              </span>
              <div class="anim-actions-hover">
                <button
                  type="button"
                  class="mini-btn checkin-btn"
                  @click.stop="$emit('checkin-animation', { animation: item.activity, slot: item.slot })"
                  title="Pointer les présences"
                >
                  ✅
                </button>
                <button
                  type="button"
                  class="mini-btn edit-btn"
                  @click.stop="$emit('edit-animation', { animation: item.activity, slot: item.slot, roomSession: session })"
                  title="Modifier"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  class="mini-btn delete-btn"
                  @click.stop="$emit('delete-animation', { animation: item.activity, slot: item.slot })"
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div class="anim-title-row">
              <span class="anim-icon">🎯</span>
              <strong class="anim-name" :title="item.activity.name">{{ item.activity.name }}</strong>
            </div>

            <div class="anim-footer-row">
              <span class="anim-fac-names" :title="facilitatorsNames(item.activity)">
                👤 {{ facilitatorsNames(item.activity) || 'Sans animateur' }}
              </span>
              <span class="anim-parts-count" :title="`${participantsCount(item.slot)} participants`">
                👥 {{ participantsCount(item.slot) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import {
  idOf,
  pad,
  hhmm,
  atTime,
  diffMinutes,
  fmtDuration,
  subtractIntervals,
  assignLanes
} from '../../utils/facilitatorPlanningHelpers';

const props = defineProps({
  session: { type: Object, required: true },
  animations: { type: Array, default: () => [] },
  timeSlots: { type: Array, default: () => [] },
  currentFacilitatorId: { type: [String, Number], default: null },
  currentFacilitatorEmail: { type: String, default: '' }
});

defineEmits([
  'create-in-room',
  'select-free-slot',
  'edit-animation',
  'delete-animation',
  'checkin-animation'
]);

const displayStartTime = computed(() => {
  const t = props.session.startTime || '10:00';
  return t.slice(0, 5);
});

const displayEndTime = computed(() => {
  const t = props.session.endTime || '16:00';
  return t.slice(0, 5);
});

const sessionStartMs = computed(() => atTime(props.session.date, displayStartTime.value).getTime());
const sessionEndMs = computed(() => atTime(props.session.date, displayEndTime.value).getTime());

const roomTotalMinutes = computed(() => {
  const diff = Math.round((sessionEndMs.value - sessionStartMs.value) / 60000);
  return diff > 0 ? diff : 360;
});

// Build ruler marks for each whole hour
const hourMarks = computed(() => {
  const marks = [];
  const startD = new Date(sessionStartMs.value);
  const endD = new Date(sessionEndMs.value);

  let cur = new Date(startD);
  cur.setMinutes(0, 0, 0);
  if (cur < startD) {
    cur.setHours(cur.getHours() + 1);
  }

  // Always mark the start time
  marks.push({
    timeStr: displayStartTime.value,
    percent: 0
  });

  const total = sessionEndMs.value - sessionStartMs.value;
  if (total <= 0) return marks;

  while (cur < endD) {
    const p = Math.max(0, Math.min(100, ((cur.getTime() - sessionStartMs.value) / total) * 100));
    marks.push({
      timeStr: `${pad(cur.getHours())}h00`,
      percent: Math.round(p * 10) / 10
    });
    cur.setHours(cur.getHours() + 1);
  }

  // End mark
  marks.push({
    timeStr: displayEndTime.value,
    percent: 100
  });

  return marks;
});

// Placed animations that belong to this room session or room location on this day
const placedAnimations = computed(() => {
  const totalMs = sessionEndMs.value - sessionStartMs.value;
  if (totalMs <= 0) return [];

  const list = [];

  props.animations.forEach(act => {
    const sDate = new Date(act.startDate);
    const eDate = new Date(act.endDate);
    const sMs = sDate.getTime();
    const eMs = eDate.getTime();

    // Check overlap with room session
    if (sMs < sessionEndMs.value && eMs > sessionStartMs.value) {
      // Find parent time slot if available
      const slot = props.timeSlots.find(ts => {
        const docId = idOf(ts);
        const actSlotId = idOf(act.timeSlot);
        if (actSlotId && docId === actSlotId) return true;
        return (ts.scheduledActivities || []).some(sa => idOf(sa) === idOf(act));
      }) || act.timeSlot || null;

      list.push({
        activity: act,
        slot,
        _start: sDate,
        _end: eDate,
        sMs,
        eMs
      });
    }
  });

  // Assign lanes to avoid overlapping blocks vertically
  const { placed } = assignLanes(list);

  return placed.map(({ item, lane }) => {
    const clampedStart = Math.max(sessionStartMs.value, item.sMs);
    const clampedEnd = Math.min(sessionEndMs.value, item.eMs);
    const leftPercent = Math.max(0, Math.min(99, ((clampedStart - sessionStartMs.value) / totalMs) * 100));
    const widthPercent = Math.max(3, Math.min(100 - leftPercent, ((clampedEnd - clampedStart) / totalMs) * 100));

    return {
      activity: item.activity,
      slot: item.slot,
      lane,
      leftPercent: Math.round(leftPercent * 10) / 10,
      widthPercent: Math.round(widthPercent * 10) / 10,
      startStr: hhmm(item._start),
      endStr: hhmm(item._end)
    };
  });
});

// Calculate free gaps in the opening timeline
const freeSlots = computed(() => {
  const totalMs = sessionEndMs.value - sessionStartMs.value;
  if (totalMs <= 0) return [];

  const cuts = placedAnimations.value.map(p => {
    const s = Math.max(sessionStartMs.value, new Date(p.activity.startDate).getTime());
    const e = Math.min(sessionEndMs.value, new Date(p.activity.endDate).getTime());
    return { s, e };
  });

  const base = [{ s: sessionStartMs.value, e: sessionEndMs.value }];
  const remaining = subtractIntervals(base, cuts);

  // Filter out microscopic gaps (e.g. less than 15 minutes)
  return remaining
    .filter(r => (r.e - r.s) >= 15 * 60000)
    .map(r => {
      const leftPercent = Math.max(0, ((r.s - sessionStartMs.value) / totalMs) * 100);
      const widthPercent = Math.max(2, Math.min(100 - leftPercent, ((r.e - r.s) / totalMs) * 100));
      const sDate = new Date(r.s);
      const eDate = new Date(r.e);

      return {
        startMs: r.s,
        endMs: r.e,
        startStr: hhmm(sDate),
        endStr: hhmm(eDate),
        durationMin: diffMinutes(sDate, eDate),
        leftPercent: Math.round(leftPercent * 10) / 10,
        widthPercent: Math.round(widthPercent * 10) / 10
      };
    });
});

const totalFreeMinutes = computed(() => {
  return freeSlots.value.reduce((acc, s) => acc + s.durationMin, 0);
});

const defaultNextStartTime = computed(() => {
  if (freeSlots.value.length > 0) {
    return freeSlots.value[0].startStr;
  }
  return displayStartTime.value;
});

const defaultNextEndTime = computed(() => {
  if (freeSlots.value.length > 0) {
    // Default 1 hour or slot end
    const first = freeSlots.value[0];
    const sDate = new Date(first.startMs);
    const endHour = new Date(sDate.getTime() + 60 * 60000);
    if (endHour.getTime() <= first.endMs) {
      return hhmm(endHour);
    }
    return first.endStr;
  }
  return displayEndTime.value;
});

function isMyAnimation(act) {
  if (!act) return false;
  const myId = props.currentFacilitatorId ? String(props.currentFacilitatorId) : null;
  const myEmail = (props.currentFacilitatorEmail || '').toLowerCase().trim();

  const facs = act.facilitators || [];
  return facs.some(f => {
    if (!f) return false;
    const fId = String(idOf(f));
    const fEmail = (f.email || '').toLowerCase().trim();
    return (myId && fId === myId) || (myEmail && fEmail === myEmail);
  });
}

function facilitatorsNames(act) {
  const facs = act.facilitators || [];
  return facs.map(f => `${f.firstName || ''} ${f.lastName || ''}`.trim()).filter(Boolean).join(', ');
}

function participantsCount(slot) {
  if (!slot) return 0;
  return (slot.participants || []).length;
}

function hasCheckIns(slot) {
  return (slot?.checkIns || []).length > 0;
}
</script>

<style scoped>
.room-timeline-root {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid var(--border-color-subtle);
  border-radius: var(--radius-md);
  padding: 0.75rem 0.9rem;
}

.timeline-meta-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.meta-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.timeline-badge-hours {
  font-size: 0.8rem;
  color: var(--text-secondary);
  background: var(--panel-bg-subtle);
  padding: 0.25rem 0.55rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color-subtle);
}

.timeline-badge-hours strong {
  color: var(--text-primary);
}

.timeline-duration-badge {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.meta-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.free-summary-pill {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--primary-text);
  background: var(--primary-light);
  border: 1px solid var(--primary-border);
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-pill);
}

.busy-summary-pill {
  font-size: 0.75rem;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.04);
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-pill);
}

.quick-add-btn {
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  padding: 0.35rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.2s ease;
}

.quick-add-btn:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(13, 148, 136, 0.35);
}

/* Timeline Track */
.timeline-track-container {
  position: relative;
  width: 100%;
  padding-top: 1.25rem;
}

.timeline-hours-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1.25rem;
  pointer-events: none;
}

.hour-mark {
  position: absolute;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hour-label {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-muted);
}

.hour-tick {
  width: 1px;
  height: 4px;
  background: var(--border-color);
  margin-top: 1px;
}

.timeline-track {
  position: relative;
  min-height: 82px;
  background: rgba(10, 16, 28, 0.85);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.hour-grid-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(255, 255, 255, 0.05);
  pointer-events: none;
}

/* Block styles */
.timeline-block {
  position: absolute;
  box-sizing: border-box;
  border-radius: 6px;
  transition: all 0.2s ease;
}

/* Free Slot */
.free-slot-block {
  top: 4px;
  bottom: 4px;
  border: 1px dashed rgba(13, 148, 136, 0.45);
  background: repeating-linear-gradient(
    45deg,
    rgba(13, 148, 136, 0.05),
    rgba(13, 148, 136, 0.05) 8px,
    rgba(13, 148, 136, 0.12) 8px,
    rgba(13, 148, 136, 0.12) 16px
  );
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  z-index: 1;
}

.free-slot-block:hover {
  background: rgba(13, 148, 136, 0.2);
  border-color: var(--primary);
  box-shadow: 0 0 12px rgba(13, 148, 136, 0.35);
  transform: translateY(-1px);
}

.free-slot-content {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--primary-text);
  text-align: center;
  font-size: 0.72rem;
  overflow: hidden;
  white-space: nowrap;
}

.free-plus {
  font-size: 0.85rem;
}

.free-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.free-times {
  font-weight: 700;
}

.free-sub {
  font-size: 0.65rem;
  opacity: 0.85;
}

/* Placed Animation Block */
.placed-anim-block {
  height: 52px;
  background: linear-gradient(135deg, rgba(30, 58, 95, 0.95), rgba(15, 30, 55, 0.95));
  border: 1px solid rgba(56, 189, 248, 0.4);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  z-index: 2;
  overflow: hidden;
}

.placed-anim-block:hover {
  border-color: #38bdf8;
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(56, 189, 248, 0.3);
  z-index: 5;
}

.placed-anim-block.is-mine {
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.92), rgba(15, 80, 80, 0.95));
  border: 1px solid #2dd4bf;
}

.placed-anim-block.is-mine:hover {
  border-color: #5eead4;
  box-shadow: 0 6px 18px rgba(45, 212, 191, 0.35);
}

.anim-block-inner {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0.3rem 0.5rem;
}

.anim-block-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.3rem;
}

.anim-time-badge {
  font-size: 0.68rem;
  font-weight: 700;
  color: #fff;
  background: rgba(0, 0, 0, 0.35);
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
}

.anim-mine-tag {
  font-size: 0.62rem;
  font-weight: 700;
  color: #fef08a;
  background: rgba(234, 179, 8, 0.25);
  border: 1px solid rgba(234, 179, 8, 0.4);
  padding: 0.05rem 0.3rem;
  border-radius: 4px;
}

.anim-actions-hover {
  display: none;
  align-items: center;
  gap: 0.2rem;
}

.placed-anim-block:hover .anim-actions-hover {
  display: flex;
}

.mini-btn {
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  border-radius: 3px;
  font-size: 0.65rem;
  padding: 0.1rem 0.25rem;
  cursor: pointer;
  line-height: 1;
}

.mini-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.anim-title-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
}

.anim-icon {
  font-size: 0.72rem;
}

.anim-name {
  font-size: 0.76rem;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.anim-footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.8);
  gap: 0.4rem;
}

.anim-fac-names {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.anim-parts-count {
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
</style>
