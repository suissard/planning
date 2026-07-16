import { defineStore } from 'pinia';
import axios from 'axios';

const STRAPI_URL = 'http://localhost:1337';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    loading: false,
    error: null
  }),
  getters: {
    isAuthenticated: (state) => !!state.token
  },
  actions: {
    async login(identifier, password) {
      this.loading = true;
      this.error = null;
      try {
        const res = await axios.post(`${STRAPI_URL}/api/auth/local`, {
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
        const res = await axios.post(`${STRAPI_URL}/api/auth/local/register`, {
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
      if (!this.user || !this.user.id) throw new Error('Utilisateur non connecté.');
      this.loading = true;
      this.error = null;
      try {
        const res = await axios.put(`${STRAPI_URL}/api/users/${this.user.id}`, data, {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        });
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
    }
  }
});
