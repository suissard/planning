import axios from 'axios';
import { useGlobalStore } from '../stores/global';
import { getIntelligibleErrorMessage, getIntelligibleSuccessMessage } from '../utils/apiNotificationHelper';

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
    if (token && token !== 'fake-token-admin') {
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

    // Check for intelligible success message on mutation operations (POST, PUT, PATCH, DELETE)
    // (GET requests are ignored on success)
    if (!response.config?.skipGlobalNotification) {
      const successInfo = getIntelligibleSuccessMessage(response);
      if (successInfo) {
        globalStore.addSuccess(successInfo.message, successInfo.title);
      }
    }

    return response;
  },
  (error) => {
    const globalStore = useGlobalStore();
    globalStore.setLoading(false);

    // Format human-intelligible error based on HTTP status code & API response
    if (!error.config?.skipGlobalNotification) {
      const errorInfo = getIntelligibleErrorMessage(error);
      globalStore.addError(errorInfo.message, errorInfo.title, errorInfo.status);
    }

    return Promise.reject(error);
  }
);

export default api;
