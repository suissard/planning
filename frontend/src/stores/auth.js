import { defineStore } from 'pinia';
import api from '../services/api';
import { useAppSettingsStore } from './appSettings';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    loading: false,
    error: null
  }),
  getters: {
    isAuthenticated: (state) => {
      const appSettingsStore = useAppSettingsStore();
      return appSettingsStore.useMockData || !!state.token;
    },
    currentUser: (state) => {
      if (state.user) return state.user;
      const appSettingsStore = useAppSettingsStore();
      if (appSettingsStore.useMockData) {
        return {
          id: 'mock-dev-id',
          username: 'Mode Dev (Fausse Données)',
          email: 'dev@localhost'
        };
      }
      return null;
    }
  },
  actions: {
    async login(identifier, password) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.post(`/auth/local`, {
          identifier,
          password
        });
        this.token = res.data.jwt;
        this.user = res.data.user;
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        return this.user;
      } catch (err) {
        console.error(err);
        this.error = err.response?.data?.error?.message || 'Identifiant ou mot de passe incorrect.';
        throw new Error(this.error);
      } finally {
        this.loading = false;
      }
    },

    async register(username, email, password) {
      this.loading = true;
      this.error = null;
      try {
        const res = await api.post(`/auth/local/register`, {
          username,
          email,
          password
        });
        this.token = res.data.jwt;
        this.user = res.data.user;
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        return this.user;
      } catch (err) {
        console.error(err);
        this.error = err.response?.data?.error?.message || 'Erreur lors de la création du compte.';
        throw new Error(this.error);
      } finally {
        this.loading = false;
      }
    },

    async updateProfile(data) {
      const appSettingsStore = useAppSettingsStore();
      if (appSettingsStore.useMockData && (!this.user || !this.user.id)) {
        this.user = {
          ...(this.user || { id: 'mock-dev-id', email: 'dev@localhost' }),
          username: data.username || 'Mode Dev (Fausse Données)',
          email: data.email || 'dev@localhost'
        };
        return this.user;
      }
      if (!this.user || !this.user.id) throw new Error('Utilisateur non connecté.');
      this.loading = true;
      this.error = null;
      try {
        const res = await api.put(`/users/${this.user.id}`, data);
        this.user = res.data;
        localStorage.setItem('user', JSON.stringify(this.user));
        return this.user;
      } catch (err) {
        console.error(err);
        this.error = err.response?.data?.error?.message || 'Erreur lors de la mise à jour du profil.';
        throw new Error(this.error);
      } finally {
        this.loading = false;
      }
    },

    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const appSettingsStore = useAppSettingsStore();
      if (appSettingsStore.useMockData) {
        appSettingsStore.setMockData(false);
      }
    }
  }
});

