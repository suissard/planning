const fs = require('fs');

let content = fs.readFileSync('frontend/src/MainApp.vue', 'utf8');

const replacement = `
            <!-- TAB: LOCATIONS (LIEUX) (Redirecting to new view) -->
            <div v-if="currentPage === 'locations'">
              <div style="padding: 2rem; text-align: center; background: rgba(30, 41, 59, 0.15); border: 1px solid var(--border-color); border-radius: 0.75rem;">
                <h2>Gestion des Lieux</h2>
                <p style="margin: 1rem 0;">La gestion des lieux se fait désormais sur une page dédiée.</p>
                <button class="action-btn primary" @click="$router.push('/locations')">
                  Aller à la page de gestion des lieux
                </button>
              </div>
            </div>
`;

// Find the section to replace: from <!-- TAB: LOCATIONS to <!-- TAB: ACTIVITIES
const regex = /<!-- TAB: LOCATIONS \(LIEUX\) -->([\s\S]*?)<!-- TAB: ACTIVITIES \(MODELES\) -->/;
content = content.replace(regex, replacement + "\n\n            <!-- TAB: ACTIVITIES (MODELES) -->");

fs.writeFileSync('frontend/src/MainApp.vue', content);
