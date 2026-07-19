const fs = require('fs');

let content = fs.readFileSync('frontend/src/router.js', 'utf8');

// Replace the main location route
content = content.replace(
  /\{\s*path: '\/locations',\s*name: 'locations',\s*component: MainApp,\s*meta: \{ requiresAuth: true \}\s*\}/,
  "{ path: '/locations', name: 'locations', component: LocationsList, meta: { requiresAuth: true } }"
);

// We should also handle /admin/locations as specified in the prompt
// "Page : /admin/locations (Liste des lieux avec DataTable Vuetify)."
content = content.replace(
  "{ path: '/locations', name: 'locations', component: LocationsList, meta: { requiresAuth: true } }",
  "{ path: '/locations', name: 'locations', component: LocationsList, meta: { requiresAuth: true } },\n  { path: '/admin/locations', name: 'admin-locations', component: LocationsList, meta: { requiresAuth: true } }"
);


fs.writeFileSync('frontend/src/router.js', content);
