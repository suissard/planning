import re

with open('frontend/src/MainApp.vue', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('<div v-else class="dashboard-wrapper">', '<v-layout v-else class="dashboard-wrapper">')

content = content.replace('<header class="app-header">', '<v-app-bar class="app-header">')
content = content.replace('</header>', '</v-app-bar>')

# Don't replace `<div class="app-body">` with empty, replace it with `<div class="app-body-wrapper">`
# to keep the nesting structure exactly the same, but let layout classes apply.
content = content.replace('<div class="app-body">', '<div class="app-body-wrapper">')
# Actually, Vuetify `<v-layout>` expects direct children to be `<v-app-bar>`, `<v-navigation-drawer>`, `<v-main>`.
# So we need to remove `<div class="app-body">` wrapper perfectly.
app_body_idx = content.find('<div class="app-body">')

# We can find its corresponding closing tag by traversing.
# But it's simpler:
# Just replace `<div class="app-body">` with ` `
content = content[:app_body_idx] + '' + content[app_body_idx + len('<div class="app-body">'):]

content = content.replace('<nav class="app-nav">', '<v-navigation-drawer permanent class="app-nav">')
content = content.replace('</nav>', '</v-navigation-drawer>')

content = content.replace('<main class="app-content">', '<v-main class="app-content">')
content = content.replace('</main>', '</v-main>')

# We removed `<div class="app-body">` which wraps from `nav` to `main`.
# So the closing tag `</div>` is right after `</v-main>`.
vmain_close_index = content.find('</v-main>')
first_div_after = content.find('</div>', vmain_close_index)
content = content[:first_div_after] + content[first_div_after + len('</div>'):]

# Replace last `</div>` of dashboard-wrapper with `</v-layout>`
template_close = content.find('</template>')
last_div = content.rfind('</div>', 0, template_close)
content = content[:last_div] + '</v-layout>\n' + content[last_div + len('</div>'):]


with open('frontend/src/MainApp.vue', 'w', encoding='utf-8') as f:
    f.write(content)
