import { defineStore } from 'pinia';

export const useGlobalStore = defineStore('global', {
  state: () => ({
    loading: false,
    notifications: []
  }),
  actions: {
    setLoading(status) {
      this.loading = status;
    },
    addNotification(notification) {
      const id = Date.now();
      this.notifications.push({ id, ...notification });

      // Auto-remove notification after 5 seconds if not explicitly disabled
      if (notification.autoClose !== false) {
        setTimeout(() => {
          this.removeNotification(id);
        }, notification.timeout || 5000);
      }
    },
    removeNotification(id) {
      this.notifications = this.notifications.filter(n => n.id !== id);
    },
    addError(message) {
      this.addNotification({ type: 'error', message });
    },
    addSuccess(message) {
      this.addNotification({ type: 'success', message });
    },
    addInfo(message) {
      this.addNotification({ type: 'info', message });
    }
  }
});
