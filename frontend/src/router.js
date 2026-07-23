import FacilitatorsList from './views/admin/FacilitatorsList.vue';
import { createRouter, createWebHistory } from 'vue-router';
import MainApp from './MainApp.vue';
import LocationsList from './views/locations/LocationsList.vue';
import { useAuthStore } from './stores/auth';

const routes = [
  {
    path: '/admin/facilitators',
    name: 'admin-facilitators',
    component: MainApp,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'login',
    component: MainApp,
    meta: { requiresGuest: true }
  },
  {
    path: '/timeslots',
    name: 'timeslots',
    component: MainApp,
    meta: { requiresAuth: true }
  },
  {
    path: '/timeslots/:id',
    name: 'timeslots-detail',
    component: MainApp,
    meta: { requiresAuth: true }
  },
  { path: '/locations', name: 'locations', component: MainApp, meta: { requiresAuth: true } },
  { path: '/admin/locations', name: 'admin-locations', component: MainApp, meta: { requiresAuth: true } },
  {
    path: '/locations/:id',
    name: 'locations-detail',
    component: MainApp,
    meta: { requiresAuth: true }
  },
  {
    path: '/activities',
    name: 'activities',
    component: MainApp,
    meta: { requiresAuth: true }
  },
  {
    path: '/activities/:id',
    name: 'activities-detail',
    component: MainApp,
    meta: { requiresAuth: true }
  },
  {
    path: '/facilitators',
    name: 'facilitators',
    component: MainApp,
    meta: { requiresAuth: true }
  },
  {
    path: '/facilitators/:id',
    name: 'facilitators-detail',
    component: MainApp,
    meta: { requiresAuth: true }
  },
  {
    path: '/participants',
    name: 'participants',
    component: MainApp,
    meta: { requiresAuth: true }
  },
  {
    path: '/participants/:id',
    name: 'participants-detail',
    component: MainApp,
    meta: { requiresAuth: true }
  },
  {
    path: '/individual-schedules',
    name: 'individual-schedules',
    component: MainApp,
    meta: { requiresAuth: true }
  },
  {
    path: '/individual-schedules/:type/:id',
    name: 'individual-schedules-detail',
    component: MainApp,
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'profile',
    component: MainApp,
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/timeslots'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const isAuthenticated = authStore.isAuthenticated;

  if (to.meta.requiresAuth && !isAuthenticated) {
    // Save target path for redirect after login
    sessionStorage.setItem('redirectPath', to.fullPath);
    next('/login');
  } else if (to.meta.requiresGuest && isAuthenticated) {
    next('/timeslots');
  } else {
    next();
  }
});

export default router;
