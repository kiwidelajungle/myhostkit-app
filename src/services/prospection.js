import { t } from '../i18n';
import { supabase, EDGE_URL, SUPABASE_ANON } from '../config/supabase';

export async function sendProspectionRequest(payload) {
  try {
    var sessionResult = await supabase.auth.getSession();
    var session = sessionResult.data ? sessionResult.data.session : null;

    if (!session || !session.access_token) {
      return { ok: false, error: 'Vous devez etre connecte pour envoyer une demande.' };
    }

    var response = await fetch(EDGE_URL + '/send-prospection-email', {
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

    var rawText = await response.text();
    var result;
    try {
      result = JSON.parse(rawText);
    } catch (e) {
      return { ok: false, error: 'Reponse invalide (status ' + response.status + ')' };
    }

    if (!response.ok) {
      return { ok: false, error: result.error || t('prosp_err_server') + ' (status ' + response.status + ')' };
    }

    return { ok: true, request_id: result.request_id, email_sent: result.email_sent };
  } catch (e) {
    return { ok: false, error: t('prosp_err_connection') + ': ' + (e && e.message ? e.message : '') };
  }
}
