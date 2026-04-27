// [16] IA Vision — Analyse qualité photos de rapport via Claude API
import * as FileSystem from 'expo-file-system/legacy';
import { EDGE_URL, SUPABASE_ANON } from '../config/supabase';

// Analyser une photo de rapport via Claude Vision
export async function analyzePhoto(photoUri, roomName) {
  try {
    // Lire la photo en base64
    var base64 = await FileSystem.readAsStringAsync(photoUri, { encoding: 'base64' });

    // Appeler l'Edge Function qui utilise Claude Vision
    var response = await fetch(EDGE_URL + '/ai-concierge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON },
      body: JSON.stringify({
        message: 'Analyse cette photo de ménage pour la pièce ' + roomName,
        image_base64: base64,
        systemPrompt: 'Tu es un inspecteur qualité de ménage professionnel. Analyse cette photo de la pièce "' + roomName + '" après un ménage. Évalue sur 10 et détecte les problèmes :\n' +
          '- Propreté générale (sol, surfaces, poussière)\n' +
          '- Lit fait correctement (si chambre)\n' +
          '- Serviettes pliées (si salle de bain)\n' +
          '- Vaisselle rangée (si cuisine)\n' +
          '- Objets mal placés ou oubliés\n' +
          'Réponds en JSON: { "score": 8, "status": "ok|warning|issue", "details": "description courte", "issues": ["probleme1"] }'
      }),
    });

    if (response.ok) {
      // AIDEBUG-LOG : afficher la reponse Claude pour debug
      var data = await response.json();
      // Parser la réponse IA
      var aiText = data.response || data.reply || ''; console.log('[AI-DEBUG] Reponse pour ' + roomName + ':', aiText.substring(0, 500));
      try {
        // Extraire le JSON de la réponse
        var jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch(e) { console.log('[AI-DEBUG] JSON parse fail:', e.message, 'text:', aiText.substring(0, 300)); }
      return { score: null, status: 'unknown', details: aiText, issues: [] };
    }
    return null;
  } catch(e) {
    console.log('[PhotoAnalysis] Erreur:', e.message);
    return null;
  }
}

// Analyser toutes les photos d'un rapport
export async function analyzeReport(photos) {
  var results = {};
  var totalScore = 0;
  var count = 0;

  for (var room in photos) {
    if (photos[room].length > 0) {
      // Analyser la première photo de chaque pièce
      var result = await analyzePhoto(photos[room][0], room);
      if (result) {
        results[room] = result;
        if (result.score) { totalScore += result.score; count++; }
      }
    }
  }

  return {
    rooms: results,
    averageScore: count > 0 ? Math.round(totalScore / count * 10) / 10 : null,
    totalRooms: Object.keys(photos).length,
    analyzedRooms: count,
  };
}
