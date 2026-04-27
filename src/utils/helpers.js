// Fonctions utilitaires partagées — éviter la duplication

export function parseHours(timeStr) {
  if (!timeStr) return 1;
  var parts = timeStr.replace('→', '-').split('-').map(function(s) { return s.trim(); });
  if (parts.length !== 2) return 1;
  var st = parts[0].split(':');
  var en = parts[1].split(':');
  if (st.length < 2 || en.length < 2) return 1;
  var diff = ((parseInt(en[0]) * 60 + parseInt(en[1])) - (parseInt(st[0]) * 60 + parseInt(st[1]))) / 60;
  return diff > 0 ? diff : 1;
}

export function round2(n) { return Math.round(n * 100) / 100; }

export function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = (new Date() - new Date(dateStr)) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return Math.floor(diff / 60) + ' min';
  if (diff < 86400) return Math.floor(diff / 3600) + ' h';
  return Math.floor(diff / 86400) + ' j';
}
