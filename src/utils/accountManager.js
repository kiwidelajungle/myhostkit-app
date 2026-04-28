// src/utils/accountManager.js
// Suppression de compte RGPD - delegue 100% a l'Edge Function super-handler
// L'Edge Function utilise service_role pour bypasser les RLS et garantir suppression totale.
import { Alert } from 'react-native';
import { supabase } from '../config/supabase';
import { t } from '../i18n';

/**
 * Demande la suppression complete du compte avec confirmation utilisateur.
 * @param {Object} session - Session Supabase actuelle
 * @param {Function} onLogout - Callback appele apres deconnexion
 */
export function deleteAccountWithConfirmation(session, onLogout) {
  if (!session || !session.user) {
    Alert.alert(t('common_error'), t('acc_err_no_session'));
    return;
  }

  Alert.alert(
    t('acc_delete_title'),
    t('acc_delete_warning'),
    [
      { text: t('common_cancel'), style: 'cancel' },
      {
        text: t('acc_delete_confirm'),
        style: 'destructive',
        onPress: function() {
          Alert.alert(
            t('acc_delete_title2'),
            t('acc_delete_warning2'),
            [
              { text: t('common_cancel'), style: 'cancel' },
              {
                text: t('acc_delete_yes'),
                style: 'destructive',
                onPress: function() { performDeletion(session, onLogout); }
              }
            ]
          );
        }
      }
    ]
  );
}

/**
 * Effectue la suppression en appelant l'Edge Function super-handler.
 * Cette fonction utilise service_role pour bypasser les RLS et tout supprimer.
 */
async function performDeletion(session, onLogout) {
  try {
    var token = session.access_token;
    var userId = session.user.id;
    var userEmail = session.user.email || '';

    // Pre-enregistrer l'intention de suppression (pour audit)
    try {
      await supabase.from('account_deletions').insert({
        user_id: userId,
        email: userEmail,
        reason: 'user_requested',
        requested_at: new Date().toISOString(),
        status: 'processing',
      });
    } catch(e) { console.log('[account_deletions log non-fatal]', e.message); }

    // Appeler l'Edge Function qui supprime TOUT (donnees + auth.users + Stripe)
    var response = await fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/super-handler', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({})
    });

    var result;
    try { result = await response.json(); } catch(e) { result = {}; }

    if (!response.ok || !result.success) {
      console.error('[delete-user] Edge Function error:', result);
      Alert.alert(
        t('common_error'),
        t('acc_delete_err_msg') + (result.error ? ' (' + result.error + ')' : '')
      );
      return;
    }

    console.log('[delete-user] success:', result.results);

    // Deconnecter l'utilisateur
    try { await supabase.auth.signOut(); } catch(e) { console.log('[signOut non-fatal]', e.message); }

    Alert.alert(
      t('acc_deleted_title'),
      t('acc_deleted_msg'),
      [{ text: t('common_ok'), onPress: function() { if (onLogout) onLogout(); } }]
    );
  } catch (err) {
    console.error('[delete-user] exception:', err);
    Alert.alert(t('common_error'), err.message || t('acc_delete_err_msg'));
  }
}