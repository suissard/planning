import axios from 'axios';
import { useGlobalStore } from '../stores/global';

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';

const api = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    // Set loading state
    const globalStore = useGlobalStore();
    globalStore.setLoading(true);

    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    const globalStore = useGlobalStore();
    globalStore.setLoading(false);
    return Promise.reject(error);
  }
);

// Response Interceptor
api.interceptors.response.use(
  (response) => {
    const globalStore = useGlobalStore();
    globalStore.setLoading(false);
    return response;
  },
  (error) => {
    const globalStore = useGlobalStore();
    globalStore.setLoading(false);

    // Extract error message
    let errorMessage = 'Une erreur est survenue';
    if (error.response) {
      errorMessage = error.response.data?.error?.message || error.message;

      // Optional: Add global handling for specific status codes like 401 Unauthorized
      if (error.response.status === 401) {
          // You might want to handle logout here via auth store if needed
          errorMessage = 'Session expirée ou non autorisée';
      }
    } else if (error.request) {
      errorMessage = 'Erreur réseau - Impossible de joindre le serveur';
    }

    // Don't show global error for specific endpoints where local handling is preferred (e.g. login)
    // Here we show it for all as a starting point.
    // globalStore.addError(errorMessage);

    return Promise.reject(error);
  }
);

export default api;
