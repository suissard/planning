import re

with open('frontend/src/MainApp.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# Instead of blindly replacing `</div>` with `</v-layout>`, let's construct it properly.
# `dashboard-wrapper` is a direct child of `app-container`, which is the root of `<template>`.
# Wait, `<template>` -> `<div class="app-container">` -> `<div v-if="!isAuthenticated" class="auth-wrapper">` and `<div v-else class="dashboard-wrapper">`.

# The `dashboard-wrapper` div closing tag is exactly the SECOND TO LAST `</div>` in `<template>`.
# The VERY LAST `</div>` in `<template>` is for `app-container`.

template_match = re.search(r'<template>(.*?)</template>', content, re.DOTALL)
if template_match:
    template = template_match.group(1)

    template = template.replace('<div v-else class="dashboard-wrapper">', '<v-layout v-else class="dashboard-wrapper">', 1)

    template = template.replace('<header class="app-header">', '<v-app-bar class="app-header">', 1)
    template = template.replace('</header>', '</v-app-bar>', 1)

    template = template.replace('<nav class="app-nav">', '<v-navigation-drawer permanent class="app-nav">', 1)
    template = template.replace('</nav>', '</v-navigation-drawer>', 1)

    template = template.replace('<main class="app-content">', '<v-main class="app-content">', 1)
    template = template.replace('</main>', '</v-main>', 1)

    template = template.replace('<div class="app-body">', '<div style="display: contents;" class="app-body">', 1)

    # Let's find the closing `</div>` of `dashboard-wrapper`.
    # Let's count backwards.
    # `app-container` is the root, so it closes right before `</template>`.
    # `dashboard-wrapper` is closed right before `app-container` closes.

    # Last `</div>` in template is for `app-container`.
    last_div_idx = template.rfind('</div>')

    # Second to last `</div>` is for `dashboard-wrapper`.
    second_to_last_div_idx = template.rfind('</div>', 0, last_div_idx)

    # We replace the second to last `</div>` with `</v-layout>`
    template = template[:second_to_last_div_idx] + '</v-layout>\n  ' + template[second_to_last_div_idx + 6:]

    new_content = content[:template_match.start(1)] + template + content[template_match.end(1):]
    with open('frontend/src/MainApp.vue', 'w', encoding='utf-8') as f:
        f.write(new_content)
