const fs = require('fs');
let code = fs.readFileSync('frontend/src/MainApp.vue', 'utf8');

// I will just use `<v-layout>` internally and keep all existing divs completely unmodified.

// Add `<v-layout>` right inside `<div v-else class="dashboard-wrapper">`
code = code.replace('<div v-else class="dashboard-wrapper">', '<div v-else class="dashboard-wrapper"><v-layout>');

// Find the corresponding closing div. It's the second to last div in the template.
// But wait, the easiest way is to add `</v-layout>` just before `</div>\n  </div>\n</template>`
let templateClose = code.indexOf('</template>');
// the file ends like this:
//   </div>
// </template>
// Wait, the first div is `app-container`, then inside is `auth-wrapper` or `dashboard-wrapper`.
// Let's just find the last `</div>` before `</template>` which is for `app-container`.
// The one before it is `dashboard-wrapper` (or `auth-wrapper` depending on v-if/v-else).
// Since they are conditionally rendered, the structure in the template is:
// <template>
//   <div class="app-container">
//     <div v-if="!isAuthenticated" class="auth-wrapper">...</div>
//     <div v-else class="dashboard-wrapper">...</div>
//   </div>
// </template>

// So we can replace `</div>\n  </div>\n</template>` with `</v-layout>\n    </div>\n  </div>\n</template>`
// Wait, the auth-wrapper also closes with `</div>`.
let searchStr = '</div>\n  </div>\n</template>';
// if we can't find it easily, let's just use regex to insert `</v-layout>` before the second to last `</div>`.

// Just change header, nav, main tag names as usual. They don't break Vue's parser unless we mess up.
code = code.replace('<header class="app-header">', '<v-app-bar class="app-header" :order="1">');
code = code.replace('</header>', '</v-app-bar>');

code = code.replace('<nav class="app-nav">', '<v-navigation-drawer permanent class="app-nav" :order="0">');
code = code.replace('</nav>', '</v-navigation-drawer>');

code = code.replace('<main class="app-content">', '<v-main class="app-content">');
code = code.replace('</main>', '</v-main>');

// We don't touch `<div v-else class="dashboard-wrapper">`
// We don't touch `<div class="app-body">`
// Let Vuetify try to handle it. Actually `<v-app-bar>` doesn't strictly need `<v-layout>`. It can be inside `<v-app>` (which is in App.vue).
fs.writeFileSync('frontend/src/MainApp.vue', code);
