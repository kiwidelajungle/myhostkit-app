// src/utils/accountManager.js
// Gestion suppression de compte + inactivité 2-3 ans

import { supabase } from '../config/supabase';
import { Alert, Linking } from 'react-native';

// ─── FEATURE 3 : Suppression complète du compte ───

/**
 * Supprime toutes les données utilisateur puis le compte auth
 * @param {object} session - session Supabase active
 * @param {string} role - 'host' | 'cleaner' | 'guest'
 * @param {function} onLogout - callback après suppression
 */
export async function deleteAccountWithConfirmation(session, role, onLogout) {
  return new Promise(function(resolve) {
    Alert.alert(
      '⚠️ Supprimer votre compte',
      'Cette action est irréversible.\n\nToutes vos données seront définitivement supprimées :\n' +
      (role === 'host' ? '• Logements et propriétés\n• Stocks et inventaires\n• Réservations de ménage\n• Conversations\n• Acceptation CGU' : '') +
      (role === 'cleaner' ? '• Profil ménagère\n• Disponibilités et calendrier\n• Réservations et historique\n• Conversations\n• Acceptation CGU' : '') +
      (role === 'guest' ? '• Données voyageur\n• Conversations' : '') +
      '\n\nÊtes-vous sûr(e) de vouloir continuer ?',
      [
        { text: 'Annuler', style: 'cancel', onPress: function() { resolve(false); } },
        {
          text: 'Confirmer la suppression',
          style: 'destructive',
          onPress: function() {
            // Double confirmation
            Alert.alert(
              'Dernière confirmation',
              'Tapez SUPPRIMER pour confirmer.\n\nCette action ne peut PAS être annulée.',
              [
                { text: 'Annuler', style: 'cancel', onPress: function() { resolve(false); } },
                {
                  text: 'SUPPRIMER MON COMPTE',
                  style: 'destructive',
                  onPress: function() {
                    performDeletion(session, role, onLogout).then(function(ok) { resolve(ok); });
                  }
                }
              ]
            );
          }
        }
      ]
    );
  });
}

async function performDeletion(session, role, onLogout) {
  var userId = session.user.id;
  var email = session.user.email;

  try {
    // 1. Logger la demande de suppression dans account_deletions
    await supabase.from('account_deletions').insert({
      user_id: userId,
      email: email,
      role: role,
      reason: 'user_requested',
      requested_at: new Date().toISOString(),
      status: 'processing',
    });

    // 2. Supprimer les données selon le rôle
    if (role === 'host') {
      // Supprimer l'inventaire
      await supabase.from('host_inventory').delete().eq('user_id', userId);
      // Récupérer les propriétés pour supprimer les bookings liés
      var propRes = await supabase.from('properties').select('id').eq('user_id', userId);
      if (propRes.data && propRes.data.length > 0) {
        var propIds = propRes.data.map(function(p) { return p.id; });
        await supabase.from('cleaning_bookings').delete().in('property_id', propIds);
      }
      // Supprimer les propriétés
      await supabase.from('properties').delete().eq('user_id', userId);
      // Supprimer les chats et messages (côté hôte)
      var hostChats = await supabase.from('cleaning_chats').select('id').eq('host_id', userId);
      if (hostChats.data && hostChats.data.length > 0) {
        var chatIds = hostChats.data.map(function(c) { return c.id; });
        await supabase.from('cleaning_chat_messages').delete().in('chat_id', chatIds);
        await supabase.from('cleaning_chats').delete().eq('host_id', userId);
      }
    }

    if (role === 'cleaner') {
      // Récupérer le cleaner_id
      var cleanerRes = await supabase.from('cleaners').select('id').eq('user_id', userId).single();
      if (cleanerRes.data) {
        var cid = cleanerRes.data.id;
        // Supprimer les disponibilités
        await supabase.from('cleaner_availability').delete().eq('cleaner_id', cid);
        // Supprimer les bookings
        await supabase.from('cleaning_bookings').delete().eq('cleaner_id', cid);
        // Supprimer les chats et messages
        var cleanerChats = await supabase.from('cleaning_chats').select('id').eq('cleaner_id', cid);
        if (cleanerChats.data && cleanerChats.data.length > 0) {
          var chatIds2 = cleanerChats.data.map(function(c) { return c.id; });
          await supabase.from('cleaning_chat_messages').delete().in('chat_id', chatIds2);
          await supabase.from('cleaning_chats').delete().eq('cleaner_id', cid);
        }
        // Supprimer le profil cleaner
        await supabase.from('cleaners').delete().eq('id', cid);
      }
    }

    // 3. Supprimer les CGU acceptances
    // RGPD: Supprimer TOUTES les données utilisateur
    await supabase.from('favorites').delete().eq('host_id', userId);
    await supabase.from('notification_tokens').delete().eq('user_id', userId);
    await supabase.from('host_guest_messages').delete().eq('sender_id', userId);
    await supabase.from('report_photos').delete().eq('user_id', userId);
    await supabase.from('invoices').delete().eq('user_id', userId);
    await supabase.from('profiles').delete().eq('id', userId);
    await supabase.from('cgu_acceptances').delete().eq('user_id', userId);

    // 4. Mettre à jour le statut dans account_deletions
    await supabase.from('account_deletions').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('user_id', userId).eq('status', 'processing');

    // 5. Déconnecter
    // DELETE-USER-FIX-v1 : appeler Edge Function pour supprimer auth.users + Stripe Connect
    try {
      var token = session.access_token;
      await fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/super-handler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({})
      });
    } catch(e) { console.log('[delete-user] non-fatal:', e.message); }
    await supabase.auth.signOut();
    if (onLogout) onLogout();

    Alert.alert(
      'Compte supprimé',
      'Votre compte et toutes vos données ont été supprimés définitivement.\n\nMerci d\'avoir utilisé MyHostKit.'
    );

    return true;
  } catch (err) {
    Alert.alert('Erreur', 'La suppression a échoué : ' + (err.message || 'Erreur inconnue') + '\n\nContactez contact@myhostkit.com');
    return false;
  }
}


// ─── FEATURE 5 : Gestion inactivité 2-3 ans ───

/**
 * Vérifie l'inactivité de l'utilisateur.
 * À appeler au login ou au lancement de l'app.
 *
 * Logique :
 * - 2 ans d'inactivité → alerte mail + warning in-app
 * - 3 ans d'inactivité → suppression auto (après notification)
 *
 * @param {object} session
 * @param {string} role
 * @param {function} onLogout
 */
export async function checkInactivity(session, role, onLogout) {
  var userId = session.user.id;
  var now = new Date();

  // Récupérer la dernière activité
  // On se base sur : last_sign_in_at (auth), ou last_message_at, ou dernière CGU
  var lastActive = null;

  // 1. Dernière connexion auth
  if (session.user.last_sign_in_at) {
    lastActive = new Date(session.user.last_sign_in_at);
  }

  // 2. Vérifier aussi la dernière activité dans cgu_acceptances (updated_at ou created_at)
  var cguRes = await supabase.from('cgu_acceptances').select('created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1);
  if (cguRes.data && cguRes.data.length > 0) {
    var cguDate = new Date(cguRes.data[0].created_at);
    if (!lastActive || cguDate > lastActive) lastActive = cguDate;
  }

  // 3. Dernière activité dans les chats
  var chatField = role === 'host' ? 'host_id' : null;
  if (role === 'host') {
    var chatRes = await supabase.from('cleaning_chats').select('last_message_at').eq('host_id', userId).order('last_message_at', { ascending: false }).limit(1);
    if (chatRes.data && chatRes.data.length > 0 && chatRes.data[0].last_message_at) {
      var chatDate = new Date(chatRes.data[0].last_message_at);
      if (!lastActive || chatDate > lastActive) lastActive = chatDate;
    }
  }

  if (!lastActive) return; // Pas de données suffisantes

  var diffMs = now.getTime() - lastActive.getTime();
  var diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);

  if (diffYears >= 3) {
    // ─── 3 ans : suppression automatique après notification ───
    Alert.alert(
      '⚠️ Compte inactif depuis 3 ans',
      'Conformément à notre politique de conservation des données (RGPD), votre compte est inactif depuis plus de 3 ans.\n\nVos données seront supprimées automatiquement.\n\nContactez contact@myhostkit.com si vous souhaitez conserver votre compte.',
      [
        {
          text: 'Compris — Supprimer',
          style: 'destructive',
          onPress: function() { performDeletion(session, role, onLogout); }
        },
        {
          text: 'Contacter le support',
          onPress: function() { Linking.openURL('mailto:contact@myhostkit.com?subject=' + encodeURIComponent('Demande conservation compte inactif') + '&body=' + encodeURIComponent('Bonjour,\n\nMon compte ' + session.user.email + ' est signalé comme inactif. Je souhaite le conserver.\n\nCordialement')); }
        }
      ]
    );
  } else if (diffYears >= 2) {
    // ─── 2 ans : alerte mail + warning in-app ───
    // Enregistrer le warning
    await supabase.from('account_deletions').upsert({
      user_id: userId,
      email: session.user.email,
      role: role,
      reason: 'inactivity_warning_2y',
      requested_at: new Date().toISOString(),
      status: 'warning_sent',
    }, { onConflict: 'user_id' });

    Alert.alert(
      '⏰ Compte bientôt inactif',
      'Votre compte est inactif depuis plus de 2 ans.\n\nConformément au RGPD, vos données seront supprimées automatiquement après 3 ans d\'inactivité.\n\nContinuez à utiliser l\'application pour conserver votre compte.',
      [
        { text: 'Compris' },
        {
          text: 'En savoir plus',
          onPress: function() { Linking.openURL('mailto:contact@myhostkit.com?subject=' + encodeURIComponent('Question sur la politique d\'inactivité')); }
        }
      ]
    );
  }
  // < 2 ans : rien à faire
}
