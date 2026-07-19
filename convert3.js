const fs = require('fs');
let code = fs.readFileSync('frontend/src/MainApp.vue', 'utf8');

// I won't add `<v-layout>` at all.
// The `v-app` in App.vue can act as the layout root.

code = code.replace('<header class="app-header">', '<v-app-bar class="app-header">');
code = code.replace('</header>', '</v-app-bar>');

code = code.replace('<nav class="app-nav">', '<v-navigation-drawer permanent class="app-nav">');
code = code.replace('</nav>', '</v-navigation-drawer>');

code = code.replace('<main class="app-content">', '<v-main class="app-content">');
code = code.replace('</main>', '</v-main>');

fs.writeFileSync('frontend/src/MainApp.vue', code);
