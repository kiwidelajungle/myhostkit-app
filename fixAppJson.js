const fs = require('fs');
const appJson = JSON.parse(fs.readFileSync('C:/Users/Dikxoo/Documents/MyHostKit/myhostkit-app2/app.json', 'utf8'));

// Supprimer les plugins Stripe
if (appJson.plugins) {
  appJson.plugins = appJson.plugins.filter(p => !p.toString().includes('stripe'));
}

fs.writeFileSync('C:/Users/Dikxoo/Documents/MyHostKit/myhostkit-app2/app.json', JSON.stringify(appJson, null, 2), 'utf8');
console.log('Stripe removed from app.json');
