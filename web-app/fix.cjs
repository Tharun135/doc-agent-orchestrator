const fs = require('fs');
let content = fs.readFileSync('src/engine/templates.ts', 'utf8');
content = content.replace(/\\`/g, '`');
fs.writeFileSync('src/engine/templates.ts', content);
console.log('Fixed backticks');
