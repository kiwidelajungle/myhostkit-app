import { t } from '../i18n';
// [15] Sync iCal depuis Airbnb/Booking/VRBO
// Parse un flux iCal et crée des réservations dans la table bookings
import { Alert } from 'react-native';
import { supabase } from '../config/supabase';

function parseIcal(icalText) {
  var events = [];
  var lines = icalText.split('\n');
  var current = null;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line === 'BEGIN:VEVENT') { current = {}; }
    else if (line === 'END:VEVENT' && current) { events.push(current); current = null; }
    else if (current) {
      if (line.indexOf('DTSTART') === 0) {
        var val = line.split(':')[1] || '';
        current.checkin = val.substring(0, 4) + '-' + val.substring(4, 6) + '-' + val.substring(6, 8);
      }
      if (line.indexOf('DTEND') === 0) {
        var val2 = line.split(':')[1] || '';
        current.checkout = val2.substring(0, 4) + '-' + val2.substring(4, 6) + '-' + val2.substring(6, 8);
      }
      if (line.indexOf('SUMMARY:') === 0) { current.summary = line.substring(8); }
      if (line.indexOf('DESCRIPTION:') === 0) { current.description = line.substring(12); }
      if (line.indexOf('UID:') === 0) { current.uid = line.substring(4); }
    }
  }
  return events;
}

export async function syncIcalForProperty(propertyId, icalUrl, userId) {
  if (!icalUrl || !icalUrl.trim()) {
    Alert.alert(t('common_error'), t('ical_err_invalid_url'));
    return { added: 0, error: null };
  }

  // Valider le format URL
  var url = icalUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { added: 0, error: 'URL invalide — doit commencer par https://' };
  }

  try {
    // Fetch le flux iCal avec timeout
    var controller = new AbortController();
    var timeout = setTimeout(function() { controller.abort(); }, 15000);
    var response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) throw new Error('Erreur HTTP ' + response.status);
    var text = await response.text();
    
    // Vérifier que c'est bien du iCal
    if (text.indexOf('BEGIN:VCALENDAR') === -1) {
      return { added: 0, error: 'Ce fichier ne semble pas etre un calendrier iCal valide' };
    }

    var events = parseIcal(text);
    if (events.length === 0) {
      return { added: 0, error: t('ical_err_no_bookings') };
    }

    var added = 0;
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (!ev.checkin || !ev.checkout) continue;

      // Vérifier si la réservation existe déjà (par UID ou dates)
      var existing = await supabase.from('bookings')
        .select('id')
        .eq('property_id', propertyId)
        .eq('checkin_date', ev.checkin)
        .eq('checkout_date', ev.checkout)
        .single();

      if (!existing.data) {
        // Extraire le nom du guest depuis le summary
        var guestName = ev.summary || t('ical_default_guest');
        guestName = guestName.replace('Reserved', '').replace('Réservé', '').replace(' - ', '').trim() || 'Voyageur';

        await supabase.from('bookings').insert({
          property_id: propertyId,
          user_id: userId,
          platform: icalUrl.indexOf('airbnb') !== -1 ? 'airbnb' : icalUrl.indexOf('booking') !== -1 ? 'booking' : 'other',
          guest_name: guestName,
          checkin_date: ev.checkin,
          checkout_date: ev.checkout,
          status: 'confirmed',
          raw_email: ev.description || '',
        });
        added++;
      }
    }

    // Mettre à jour la date de dernière synchro
    await supabase.from('properties').update({
      last_sync_at: new Date().toISOString(),
    }).eq('id', propertyId);

    return { added: added, total: events.length, error: null };
  } catch(e) {
    return { added: 0, error: e.message };
  }
}
