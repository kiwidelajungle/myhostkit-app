const fs = require("fs");
const path = require("path");

function walkDir(dir) {
  let results = [];
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory() && !["node_modules", ".git"].includes(file)) {
      results = results.concat(walkDir(filePath));
    } else if (file.endsWith(".js")) {
      results.push(filePath);
    }
  });
  return results;
}

const srcDir = "C:/Users/Dikxoo/Documents/MyHostKit/myhostkit-app2/src";
const files = walkDir(srcDir);
const modified = [];

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, "utf8");
  const original = content;
  content = content.replace(/MyHostKit/g, "Keyla");
  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf8");
    modified.push(path.relative(srcDir, filePath));
  }
});

// app.json
let appJson = fs.readFileSync("C:/Users/Dikxoo/Documents/MyHostKit/myhostkit-app2/app.json", "utf8");
const appJsonOriginal = appJson;
appJson = appJson.replace(/MyHostKit/g, "Keyla");
if (appJson !== appJsonOriginal) {
  fs.writeFileSync("C:/Users/Dikxoo/Documents/MyHostKit/myhostkit-app2/app.json", appJson, "utf8");
  modified.push("app.json");
}

console.log("✅ FICHIERS MODIFIÉS:");
modified.forEach(f => console.log("  " + f));
console.log(`\n✅ Total: ${modified.length} fichiers`);
