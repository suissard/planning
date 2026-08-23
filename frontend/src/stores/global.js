import { defineStore } from 'pinia';

// Cooldown window to prevent identical notification burst / spam (in ms)
const DEDUPLICATION_WINDOW_MS = 2500;

// Internal timer tracking and recent history (outside Pinia reactive state to avoid reactivity overhead)
const notificationTimers = new Map();
const recentNotificationHistory = new Map();

/**
 * Normalizes notification content to produce a reliable comparison key
 * @param {string} type 
 * @param {string} message 
 * @returns {string}
 */
function getNotificationSignature(type, message) {
  const normType = (type || 'info').toLowerCase().trim();
  const normMsg = (message || '')
    .toString()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  return `${normType}:::${normMsg}`;
}

export const useGlobalStore = defineStore('global', {
  state: () => ({
    loading: false,
    notifications: []
  }),
  actions: {
    setLoading(status) {
      this.loading = status;
    },

    /**
     * Adds a rich notification to the global toast queue with smart deduplication & anti-spam
     * @param {Object} notif
     * @param {'success'|'error'|'warning'|'info'} [notif.type='info']
     * @param {string} [notif.title]
     * @param {string} notif.message
     * @param {number|null} [notif.status=null] HTTP status code
     * @param {number} [notif.timeout] Duration before auto-close
     * @param {boolean} [notif.autoClose=true]
     * @param {boolean} [notif.force=false] Bypass deduplication check
     * @returns {string|null} Notification ID
     */
    addNotification(notif) {
      if (!notif) return null;

      const type = notif.type || 'info';
      const rawMessage = typeof notif.message === 'string' 
        ? notif.message 
        : (notif.message?.message || notif.message?.toString() || '');
      const message = rawMessage.trim();

      if (!message) return null;

      const now = Date.now();
      const signature = getNotificationSignature(type, message);
      const isForce = notif.force === true;

      // 1. Check if an identical notification is currently active in the queue
      const existingNotif = this.notifications.find(n => 
        getNotificationSignature(n.type, n.message) === signature
      );

      if (existingNotif && !isForce) {
        // Increment repetition count
        existingNotif.count = (existingNotif.count || 1) + 1;
        existingNotif.updatedAt = now;

        // Upgrade title or status if provided and previously generic
        if (notif.title && (existingNotif.title === 'Succès' || existingNotif.title === 'Erreur' || existingNotif.title === 'Information')) {
          existingNotif.title = notif.title;
        }
        if (notif.status && !existingNotif.status) {
          existingNotif.status = notif.status;
        }

        // Reset autoClose timer so the notification stays visible for full duration
        if (existingNotif.autoClose) {
          if (notificationTimers.has(existingNotif.id)) {
            clearTimeout(notificationTimers.get(existingNotif.id));
          }
          const timer = setTimeout(() => {
            this.removeNotification(existingNotif.id);
          }, existingNotif.timeout);
          notificationTimers.set(existingNotif.id, timer);
        }

        // Update recent history
        recentNotificationHistory.set(signature, now);
        return existingNotif.id;
      }

      // 2. Check if identical notification was emitted within cooldown window (burst anti-spam)
      const lastEmittedAt = recentNotificationHistory.get(signature);
      if (lastEmittedAt && (now - lastEmittedAt < DEDUPLICATION_WINDOW_MS) && !isForce) {
        // Ignored as duplicate burst
        return null;
      }

      // 3. Create and push new notification
      const id = `${now}_${Math.random().toString(36).substring(2, 7)}`;
      const timeout = notif.timeout || (type === 'error' ? 6500 : 4500);
      const autoClose = notif.autoClose !== false;

      const newNotification = {
        id,
        type,
        title: notif.title || (type === 'error' ? 'Erreur' : type === 'success' ? 'Succès' : type === 'warning' ? 'Attention' : 'Information'),
        message,
        status: notif.status || null,
        autoClose,
        timeout,
        count: 1,
        createdAt: new Date(),
        updatedAt: now
      };

      this.notifications.push(newNotification);
      recentNotificationHistory.set(signature, now);

      // Clean up old entries in recentNotificationHistory to prevent memory growth
      if (recentNotificationHistory.size > 100) {
        const cutoff = now - 60000;
        for (const [sig, time] of recentNotificationHistory.entries()) {
          if (time < cutoff) recentNotificationHistory.delete(sig);
        }
      }

      // Set auto-close timer
      if (autoClose) {
        const timer = setTimeout(() => {
          this.removeNotification(id);
        }, timeout);
        notificationTimers.set(id, timer);
      }

      return id;
    },

    /**
     * Removes a single notification by ID and clears its pending timer
     * @param {string} id 
     */
    removeNotification(id) {
      if (notificationTimers.has(id)) {
        clearTimeout(notificationTimers.get(id));
        notificationTimers.delete(id);
      }
      this.notifications = this.notifications.filter(n => n.id !== id);
    },

    /**
     * Clears all notifications and timers
     */
    clearAll() {
      for (const timer of notificationTimers.values()) {
        clearTimeout(timer);
      }
      notificationTimers.clear();
      this.notifications = [];
    },

    /**
     * Convenience helper for Error notifications
     */
    addError(message, title = 'Erreur', status = null, options = {}) {
      return this.addNotification({
        type: 'error',
        title,
        message: typeof message === 'string' ? message : (message?.message || 'Une erreur est survenue'),
        status: status || message?.status || null,
        ...options
      });
    },

    /**
     * Convenience helper for Success notifications
     */
    addSuccess(message, title = 'Succès', options = {}) {
      return this.addNotification({
        type: 'success',
        title,
        message,
        ...options
      });
    },

    /**
     * Convenience helper for Warning notifications
     */
    addWarning(message, title = 'Attention', options = {}) {
      return this.addNotification({
        type: 'warning',
        title,
        message,
        ...options
      });
    },

    /**
     * Convenience helper for Info notifications
     */
    addInfo(message, title = 'Information', options = {}) {
      return this.addNotification({
        type: 'info',
        title,
        message,
        ...options
      });
    }
  }
});
