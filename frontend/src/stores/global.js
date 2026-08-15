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
    /**
     * Adds a rich notification to the global toast queue
     * @param {Object} notif
     * @param {'success'|'error'|'warning'|'info'} [notif.type='info']
     * @param {string} [notif.title]
     * @param {string} notif.message
     * @param {number|null} [notif.status=null] HTTP status code
     * @param {number} [notif.timeout=5000] Duration before auto-close
     * @param {boolean} [notif.autoClose=true]
     */
    addNotification(notif) {
      const id = Date.now() + Math.random().toString(36).substring(2, 7);
      const newNotification = {
        id,
        type: notif.type || 'info',
        title: notif.title || (notif.type === 'error' ? 'Erreur' : notif.type === 'success' ? 'Succès' : 'Information'),
        message: notif.message || '',
        status: notif.status || null,
        autoClose: notif.autoClose !== false,
        timeout: notif.timeout || (notif.type === 'error' ? 6500 : 4500),
        createdAt: new Date()
      };

      this.notifications.push(newNotification);

      if (newNotification.autoClose) {
        setTimeout(() => {
          this.removeNotification(id);
        }, newNotification.timeout);
      }

      return id;
    },
    removeNotification(id) {
      this.notifications = this.notifications.filter(n => n.id !== id);
    },
    clearAll() {
      this.notifications = [];
    },
    addError(message, title = 'Erreur', status = null) {
      return this.addNotification({
        type: 'error',
        title,
        message: typeof message === 'string' ? message : (message?.message || 'Une erreur est survenue'),
        status: status || message?.status || null
      });
    },
    addSuccess(message, title = 'Succès') {
      return this.addNotification({
        type: 'success',
        title,
        message
      });
    },
    addWarning(message, title = 'Attention') {
      return this.addNotification({
        type: 'warning',
        title,
        message
      });
    },
    addInfo(message, title = 'Information') {
      return this.addNotification({
        type: 'info',
        title,
        message
      });
    }
  }
});
