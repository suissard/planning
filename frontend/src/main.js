import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './index.css';
import vuetify from './plugins/vuetify';
import { initGlobalDragAutoScroll } from './utils/dragAutoScroll';

initGlobalDragAutoScroll();

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(vuetify);
app.mount('#app');
