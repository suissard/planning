<template>
  <v-app>
    <router-view />
    <NotificationToast />
  </v-app>
</template>

<script>
import NotificationToast from './components/NotificationToast.vue';

export default {
  name: 'App',
  components: {
    NotificationToast
  }
};
</script>
