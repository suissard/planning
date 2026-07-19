const fs = require('fs');

let content = fs.readFileSync('frontend/src/MainApp.vue', 'utf8');

// replace dashboard-wrapper with v-layout
content = content.replace('<div v-else class="dashboard-wrapper">', '<v-layout v-else class="dashboard-wrapper">');

// replace header
content = content.replace('<header class="app-header">', '<v-app-bar class="app-header">');
content = content.replace('</header>', '</v-app-bar>');

// replace nav
content = content.replace('<nav class="app-nav">', '<v-navigation-drawer permanent class="app-nav">');
content = content.replace('</nav>', '</v-navigation-drawer>');

// replace main
content = content.replace('<main class="app-content">', '<v-main class="app-content">');
content = content.replace('</main>', '</v-main>');

// We don't remove app-body div directly to not mess up HTML parsing,
// we just change it to a generic div or let it be. But vuetify layout might expect direct children.
// Actually, in vuetify 3, `<v-app-bar>` and `<v-navigation-drawer>` and `<v-main>` should be direct children of `<v-layout>` or `<v-app>`.
// So we must remove `<div class="app-body">` and its matching closing `</div>`.
// Let's use a regex to match the `</div>` that is immediately after `</v-main>` (ignoring whitespace).
content = content.replace('<div class="app-body">', '<!-- <div class="app-body"> -->');

// Find </v-main> and remove the first </div> after it
let vmainClose = content.indexOf('</v-main>');
let divClose = content.indexOf('</div>', vmainClose);
content = content.substring(0, divClose) + '<!-- </div> app-body -->' + content.substring(divClose + 6);

// Find the last </div> in the template and replace it with </v-layout>
let templateClose = content.indexOf('</template>');
let lastDiv = content.lastIndexOf('</div>', templateClose);
content = content.substring(0, lastDiv) + '</v-layout>' + content.substring(lastDiv + 6);

fs.writeFileSync('frontend/src/MainApp.vue', content);
