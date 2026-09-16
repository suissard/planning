import axios from 'axios';
import { useGlobalStore } from '../stores/global';
import { useAuthStore } from '../stores/auth';
import router from '../router';
import { getIntelligibleErrorMessage, getIntelligibleSuccessMessage } from '../utils/apiNotificationHelper';

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL || 'https://strapi.clavier.dev';

const api = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

let isHandlingAuthError = false;

function handleUnauthorized() {
  if (isHandlingAuthError) return;
  isHandlingAuthError = true;

  try {
    const authStore = useAuthStore();
    const globalStore = useGlobalStore();

    // Remember the page where the user was so they can return after re-authenticating
    const currentPath = router.currentRoute.value?.fullPath || window.location.pathname;
    if (currentPath && !currentPath.startsWith('/login')) {
      sessionStorage.setItem('redirectPath', currentPath);
    }

    // Reset authentication state
    authStore.logout();

    // Display clear notification
    globalStore.addError(
      'Vos identifiants ou votre session ne sont plus valides. Veuillez vous reconnecter.',
      'Session expirée',
      401
    );

    // Redirect to login page
    if (router.currentRoute.value?.path !== '/login') {
      router.replace('/login');
    }
  } catch (err) {
    console.error('Erreur lors de la déconnexion automatique:', err);
  } finally {
    setTimeout(() => {
      isHandlingAuthError = false;
    }, 1500);
  }
}

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    // Set loading state
    const globalStore = useGlobalStore();
    globalStore.setLoading(true);

    // Get token from localStorage or from environment variable
    const token = localStorage.getItem('token') || import.meta.env.VITE_STRAPI_API_TOKEN;
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

    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthEndpoint = url.includes('/auth/local');
    const isInvalidCredentials = status === 401 || (
      status === 403 && (
        error.response?.data?.error?.message?.toLowerCase().includes('invalid credentials') ||
        error.response?.data?.error?.message?.toLowerCase().includes('unauthorized')
      )
    );

    // When authentication is invalid or expired (except on login attempt itself), disconnect the user
    if (isInvalidCredentials && !isAuthEndpoint) {
      handleUnauthorized();
      return Promise.reject(error);
    }

    // Format human-intelligible error based on HTTP status code & API response
    if (!error.config?.skipGlobalNotification) {
      const errorInfo = getIntelligibleErrorMessage(error);
      globalStore.addError(errorInfo.message, errorInfo.title, errorInfo.status);
    }

    return Promise.reject(error);
  }
);

export default api;
