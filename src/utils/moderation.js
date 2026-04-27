// Modération — côté client + sanitization
var BANNED_WORDS = ['connard','putain','nique','salope','pute','fdp','ntm','tg','merde','enculé'];

export function containsBannedWords(text) {
  if (!text) return false;
  var lower = text.toLowerCase().replace(/[^a-zàâäéèêëïîôùûüÿç\s]/g, '');
  for (var i = 0; i < BANNED_WORDS.length; i++) {
    if (lower.indexOf(BANNED_WORDS[i]) !== -1) return true;
  }
  return false;
}

export function sanitizeMessage(text) {
  if (!text) return '';
  // Supprimer les tags HTML/scripts
  return text.replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').trim().substring(0, 1000);
}

// Sanitize tous les champs d'un objet (pour insert/update Supabase)
export function sanitizeFields(obj) {
  var clean = {};
  for (var k in obj) {
    if (typeof obj[k] === 'string') {
      clean[k] = obj[k].replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').trim();
    } else {
      clean[k] = obj[k];
    }
  }
  return clean;
}
