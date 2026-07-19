const fs = require('fs');

let content = fs.readFileSync('frontend/src/MainApp.vue', 'utf8');

const replacement = `
            <!-- TAB: LOCATIONS (LIEUX) (Redirecting to new view) -->
            <div v-if="currentPage === 'locations'">
              <div style="padding: 2rem; text-align: center; background: rgba(30, 41, 59, 0.15); border: 1px solid var(--border-color); border-radius: 0.75rem;">
                <h2>Gestion des Lieux</h2>
                <p style="margin: 1rem 0;">La gestion des lieux se fait désormais sur une page dédiée (DataTable VueTify).</p>
                <button class="action-btn primary" @click="$router.push('/admin/locations')">
                  Aller à la page de gestion des lieux
                </button>
              </div>
            </div>
`;

// Replace from <!-- TAB: LOCATIONS to right before <!-- TAB: ACTIVITIES
const startStr = "<!-- TAB: LOCATIONS (LIEUX) -->";
const endStr = "<!-- TAB: ACTIVITIES";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
    const newContent = content.substring(0, startIndex) + replacement + "\n\n            " + content.substring(endIndex);
    fs.writeFileSync('frontend/src/MainApp.vue', newContent);
    console.log("Successfully replaced locations section");
} else {
    console.log("Could not find start or end index");
}
