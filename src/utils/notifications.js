// [14] Push notifications via expo-notifications
import { Alert, Platform } from 'react-native';
import { supabase } from '../config/supabase';

var Notifications = null;
try { Notifications = require('expo-notifications'); } catch(e) {}

var Device = null;
try { Device = require('expo-device'); } catch(e) {}

// Enregistrer le push token après login
export async function registerPushToken(userId) {
  if (!Notifications || !Device) {
    console.log('[Push] expo-notifications ou expo-device non installé');
    return null;
  }
  if (!Device.isDevice) {
    console.log('[Push] Push non disponible sur simulateur');
    return null;
  }

  try {
    // Demander la permission
    var perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) {
      perm = await Notifications.requestPermissionsAsync();
    }
    if (!perm.granted) {
      console.log('[Push] Permission refusée');
      return null;
    }

    // Obtenir le token Expo Push
    var tokenData = await Notifications.getExpoPushTokenAsync();
    var token = tokenData.data;
    console.log('[Push] Token:', token);

    // Sauvegarder en base
    await supabase.from('notification_tokens').upsert({
      user_id: userId,
      token: token,
      platform: Platform.OS,
    }, { onConflict: 'user_id,token' });

    // Configurer les notifications sur Android
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'Keyla',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    return token;
  } catch(e) {
    console.log('[Push] Erreur:', e.message);
    return null;
  }
}

// Envoyer une notification push via Expo Push API (appel côté serveur idéalement)
export async function sendPushToUser(targetUserId, title, body) {
  try {
    var res = await supabase.from('notification_tokens').select('token').eq('user_id', targetUserId);
    if (!res.data || res.data.length === 0) return;

    var tokens = res.data.map(function(r) { return r.token; });
    var messages = tokens.map(function(t) {
      return { to: t, title: title, body: body, sound: 'default' };
    });

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch(e) {
    console.log('[Push] Erreur envoi:', e.message);
  }
}
