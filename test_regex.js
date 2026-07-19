const fs = require('fs');

let content = fs.readFileSync('frontend/src/MainApp.vue', 'utf8');

const regex = /<!-- TAB: LOCATIONS \(LIEUX\) -->([\s\S]*?)<!-- TAB: ACTIVITIES/;
const match = content.match(regex);
if (match) {
    console.log("Match found");
} else {
    console.log("No match");
}
