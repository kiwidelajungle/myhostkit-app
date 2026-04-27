// ============================================================
// Service: prospection.js
// Helper pour appeler l'Edge Function send-prospection-email
// ============================================================

import { supabase, EDGE_URL, SUPABASE_ANON } from '../config/supabase';

export async function sendProspectionRequest(payload) {
  try {
    console.log('[prospection] >>> Debut sendProspectionRequest');
    console.log('[prospection] Payload:', JSON.stringify(payload));
    console.log('[prospection] EDGE_URL:', EDGE_URL);
    console.log('[prospection] SUPABASE_ANON length:', SUPABASE_ANON ? SUPABASE_ANON.length : 'NULL');

    // Recuperer la session active (JWT)
    var sessionResult = await supabase.auth.getSession();
    console.log('[prospection] Session result:', JSON.stringify({
      hasError: !!sessionResult.error,
      errorMsg: sessionResult.error ? sessionResult.error.message : null,
      hasSession: !!(sessionResult.data && sessionResult.data.session),
      hasToken: !!(sessionResult.data && sessionResult.data.session && sessionResult.data.session.access_token),
    }));

    var session = sessionResult.data ? sessionResult.data.session : null;

    if (!session || !session.access_token) {
      console.warn('[prospection] No session/token found');
      return { ok: false, error: 'Vous devez etre connecte pour envoyer une demande.' };
    }

    var url = EDGE_URL + '/send-prospection-email';
    console.log('[prospection] Fetching URL:', url);

    var response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + session.access_token,
        'apikey': SUPABASE_ANON,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        city: payload.city,
        radius_km: payload.radius_km,
        pricing_mode: payload.pricing_mode,
        price: payload.price,
        available_from: payload.available_from,
        volume: payload.volume,
      }),
    });

    console.log('[prospection] Response status:', response.status);

    var rawText = await response.text();
    console.log('[prospection] Response raw:', rawText);

    var result;
    try {
      result = JSON.parse(rawText);
    } catch (e) {
      console.error('[prospection] JSON parse error:', e);
      return { ok: false, error: 'Reponse invalide du serveur (status ' + response.status + ')' };
    }

    if (!response.ok) {
      console.error('[prospection] Edge Function error:', result);
      return { ok: false, error: result.error || result.message || ('Erreur serveur (status ' + response.status + ')') };
    }

    console.log('[prospection] <<< Succes:', result);
    return {
      ok: true,
      request_id: result.request_id,
      email_sent: result.email_sent,
    };

  } catch (e) {
    console.error('[prospection] Network/exception error:', e, e && e.message);
    return { ok: false, error: 'Erreur de connexion: ' + (e && e.message ? e.message : 'inconnu') };
  }
}