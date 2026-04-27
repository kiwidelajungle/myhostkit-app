// Envoi d'email via Edge Function Supabase — PAS de fallback mailto
import { SUPABASE_ANON, EDGE_URL } from '../config/supabase';

var MYHOSTKIT_EMAIL = 'myhostkit.contact@gmail.com';

export async function sendEmail(params) {
  var to = params.to;
  var cc = params.cc;
  var subject = params.subject;
  var body = params.body;
  try {
    var response = await fetch(EDGE_URL + '/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON },
      body: JSON.stringify({ to: to, cc: cc || MYHOSTKIT_EMAIL, subject: subject, body: body }),
    });
    if (response.ok) {
      var data = await response.json();
      if (data.success) return true;
    }
    console.log('[Email] Echec envoi silencieux vers ' + to);
    return false;
  } catch (e) {
    console.log('[Email] Erreur silencieuse:', e.message);
    return false;
  }
}
