<template>
  <div class="toast-stack-container" aria-live="polite" aria-atomic="true">
    <transition-group name="toast-slide" tag="div" class="toast-stack">
      <div
        v-for="notif in notifications"
        :key="notif.id"
        class="toast-card"
        :class="[`toast-${notif.type}`, { 'has-status': !!notif.status }]"
        role="alert"
      >
        <!-- Icon & Content -->
        <div class="toast-icon-wrap">
          <span v-if="notif.type === 'success'" class="toast-icon">✅</span>
          <span v-else-if="notif.type === 'error'" class="toast-icon">🚫</span>
          <span v-else-if="notif.type === 'warning'" class="toast-icon">⚠️</span>
          <span v-else class="toast-icon">ℹ️</span>
        </div>

        <div class="toast-body">
          <div class="toast-header-row">
            <h4 class="toast-title">{{ notif.title }}</h4>
            <span v-if="notif.status" class="toast-status-badge" :class="getStatusBadgeClass(notif.status)">
              HTTP {{ notif.status }}
            </span>
          </div>
          <p class="toast-message">{{ notif.message }}</p>
        </div>

        <!-- Close Button -->
        <button
          type="button"
          class="toast-close-btn"
          @click="removeNotification(notif.id)"
          aria-label="Fermer cette notification"
          title="Fermer"
        >
          ✕
        </button>

        <!-- Progress bar for auto-close (restarts on timer refresh) -->
        <div
          v-if="notif.autoClose"
          :key="`${notif.id}-${notif.updatedAt || notif.id}`"
          class="toast-progress-bar"
          :style="{ animationDuration: `${notif.timeout}ms` }"
        ></div>
      </div>
    </transition-group>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useGlobalStore } from '../stores/global';

export default {
  name: 'NotificationToast',
  setup() {
    const globalStore = useGlobalStore();

    const notifications = computed(() => globalStore.notifications);

    const removeNotification = (id) => {
      globalStore.removeNotification(id);
    };

    const getStatusBadgeClass = (status) => {
      if (status >= 500) return 'status-500';
      if (status === 404) return 'status-404';
      if (status === 401 || status === 403) return 'status-401';
      if (status >= 400) return 'status-400';
      return '';
    };

    return {
      notifications,
      removeNotification,
      getStatusBadgeClass
    };
  }
};
</script>

<style scoped>
.toast-stack-container {
  position: fixed;
  top: 1.25rem;
  right: 1.25rem;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  pointer-events: none;
  max-width: 440px;
  width: calc(100vw - 2.5rem);
}

.toast-stack {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

.toast-card {
  pointer-events: auto;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.9rem 1.1rem;
  border-radius: 0.75rem;
  background: rgba(15, 23, 42, 0.94);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6), 0 0 1px rgba(255, 255, 255, 0.15);
}

/* Types */
.toast-success {
  border-left: 4px solid #10b981;
  border-color: rgba(16, 185, 129, 0.4);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4), 0 0 15px rgba(16, 185, 129, 0.15);
}

.toast-error {
  border-left: 4px solid #ef4444;
  border-color: rgba(239, 68, 68, 0.45);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4), 0 0 18px rgba(239, 68, 68, 0.2);
}

.toast-warning {
  border-left: 4px solid #f59e0b;
  border-color: rgba(245, 158, 11, 0.4);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4), 0 0 15px rgba(245, 158, 11, 0.15);
}

.toast-info {
  border-left: 4px solid #06b6d4;
  border-color: rgba(6, 182, 212, 0.4);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4), 0 0 15px rgba(6, 182, 212, 0.15);
}

/* Icon */
.toast-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  line-height: 1;
  margin-top: 0.1rem;
  flex-shrink: 0;
}

/* Body */
.toast-body {
  flex: 1;
  min-width: 0;
}

.toast-header-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  flex-wrap: wrap;
}

.toast-title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.01em;
}

.toast-status-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.12rem 0.45rem;
  border-radius: 2rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
}

.toast-status-badge.status-500 {
  background: rgba(239, 68, 68, 0.25);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.toast-status-badge.status-404 {
  background: rgba(245, 158, 11, 0.25);
  color: #fde047;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.toast-status-badge.status-401 {
  background: rgba(168, 85, 247, 0.25);
  color: #d8b4fe;
  border: 1px solid rgba(168, 85, 247, 0.4);
}

.toast-status-badge.status-400 {
  background: rgba(249, 115, 22, 0.25);
  color: #fdba74;
  border: 1px solid rgba(249, 115, 22, 0.4);
}

.toast-message {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.4;
  color: #cbd5e1;
  word-break: break-word;
}

/* Close Button */
.toast-close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0.2rem 0.35rem;
  border-radius: 0.35rem;
  line-height: 1;
  transition: all 0.15s ease;
  flex-shrink: 0;
  margin-top: -0.1rem;
  margin-right: -0.2rem;
}

.toast-close-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
}

/* Progress bar */
.toast-progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  width: 100%;
  background: rgba(255, 255, 255, 0.3);
  animation: progress-countdown linear forwards;
  transform-origin: left;
}

.toast-success .toast-progress-bar {
  background: #10b981;
}

.toast-error .toast-progress-bar {
  background: #ef4444;
}

.toast-warning .toast-progress-bar {
  background: #f59e0b;
}

.toast-info .toast-progress-bar {
  background: #06b6d4;
}

@keyframes progress-countdown {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

/* Transition Animations */
.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-slide-enter-from {
  opacity: 0;
  transform: translateX(60px) scale(0.95);
}

.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(60px) scale(0.92);
}

@media (max-width: 640px) {
  .toast-stack-container {
    top: 0.75rem;
    right: 0.75rem;
    left: 0.75rem;
    width: auto;
    max-width: none;
  }
}
</style>
