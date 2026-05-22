const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  let results = [];
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('node_modules') && !file.startsWith('.')) {
      results = results.concat(walkDir(filePath));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
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
  
  content = content.replace(/import.*from ['"]@stripe\/stripe-react-native['"];?\n?/g, '');
  content = content.replace(/import.*from ['"]..\/..\/utils\/stripe['"];?\n?/g, '');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    count++;
  }
});

console.log(`Done - ${count} fichiers nettoyés de Stripe`);
