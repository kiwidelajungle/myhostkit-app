const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  let results = [];
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory() && !['node_modules', '.git'].includes(file)) {
      results = results.concat(walkDir(filePath));
    } else if (file.endsWith('.js')) {
      results.push(filePath);
    }
  });
  return results;
}

const srcDir = 'C:/Users/Dikxoo/Documents/MyHostKit/myhostkit-app2/src';
const files = walkDir(srcDir);
let count = 0;

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Remplacer MyHostKit par Keyla
  content = content.replace(/MyHostKit/g, 'Keyla');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    count++;
  }
});

console.log(`✅ Done - ${count} fichiers`);
