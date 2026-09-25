import { defineStore } from 'pinia';
import api from '../services/api';
import { useAppSettingsStore } from './appSettings';

function getStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: getStoredUser(),
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
    async login(emailOrIdentifier, password) {
      this.loading = true;
      this.error = null;
      try {
        const identifier = (
          typeof emailOrIdentifier === 'string'
            ? emailOrIdentifier
            : (emailOrIdentifier?.email || emailOrIdentifier?.identifier)
        )?.trim();
        const pwd = typeof emailOrIdentifier === 'object' && !password
          ? emailOrIdentifier.password
          : password;

        const res = await api.post(`/auth/local`, {
          identifier,
          password: pwd
        }, { skipGlobalNotification: true });
        this.token = res.data.jwt;
        this.user = res.data.user;
        this.error = null;
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        return this.user;
      } catch (err) {
        console.error('Erreur login:', err);
        const backendMessage = err.response?.data?.error?.message;
        const status = err.response?.status;
        if (
          backendMessage === 'Invalid identifier or password' ||
          backendMessage === 'Invalid credentials' ||
          status === 400
        ) {
          this.error = 'Email/identifiant ou mot de passe incorrect.';
        } else if (backendMessage?.toLowerCase().includes('too many requests') || status === 429) {
          this.error = 'Trop de tentatives de connexion. Veuillez patienter une minute avant de réessayer.';
        } else if (!err.response) {
          this.error = 'Impossible de contacter le serveur distant. Vérifiez votre connexion internet.';
        } else {
          this.error = backendMessage || 'Email ou mot de passe incorrect.';
        }
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
          username: (typeof username === 'string' ? username : '')?.trim(),
          email: (typeof email === 'string' ? email : '')?.trim(),
          password
        }, { skipGlobalNotification: true });
        this.token = res.data.jwt;
        this.user = res.data.user;
        this.error = null;
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        return this.user;
      } catch (err) {
        console.error('Erreur register:', err);
        const backendMessage = err.response?.data?.error?.message;
        const status = err.response?.status;
        if (backendMessage?.toLowerCase().includes('already taken') || backendMessage?.toLowerCase().includes('email is already taken')) {
          this.error = 'Cet email ou nom d\'utilisateur est déjà utilisé.';
        } else if (backendMessage?.toLowerCase().includes('too many requests') || status === 429) {
          this.error = 'Trop de tentatives. Veuillez patienter une minute avant de réessayer.';
        } else if (!err.response) {
          this.error = 'Impossible de contacter le serveur distant.';
        } else {
          this.error = backendMessage || 'Erreur lors de la création du compte.';
        }
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

