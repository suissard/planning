const fs = require('fs');
let code = fs.readFileSync('frontend/src/MainApp.vue', 'utf8');

// Use simple string replacement
code = code.replace('<div v-else class="dashboard-wrapper">', '<v-layout v-else class="dashboard-wrapper">');

// We need to find the correct </div> matching `<div v-else class="dashboard-wrapper">`.
// This is not necessarily the second to last one.
// A safer way is to count open and close div tags.
let startIndex = code.indexOf('<v-layout v-else class="dashboard-wrapper">');
let stack = [];
let currentIndex = startIndex;
let i = startIndex + '<v-layout v-else class="dashboard-wrapper">'.length;

while (i < code.length) {
    if (code.substring(i, i+4) === '<div' && code[i+4] !== ' ' && code[i+4] !== '>') {
        // match <div ...
        if (code.substring(i).match(/^<div[\s>]/)) {
            stack.push('div');
        }
    } else if (code.substring(i, i+5) === '</div>') {
        if (stack.length > 0) {
            stack.pop();
        } else {
            // This is the closing tag for the wrapper
            code = code.substring(0, i) + '</v-layout>' + code.substring(i + 6);
            break;
        }
    }
    i++;
}

code = code.replace('<header class="app-header">', '<v-app-bar class="app-header">');
code = code.replace('</header>', '</v-app-bar>');

code = code.replace('<nav class="app-nav">', '<v-navigation-drawer permanent class="app-nav">');
code = code.replace('</nav>', '</v-navigation-drawer>');

code = code.replace('<main class="app-content">', '<v-main class="app-content">');
code = code.replace('</main>', '</v-main>');

// We don't touch `<div class="app-body">`.

fs.writeFileSync('frontend/src/MainApp.vue', code);
