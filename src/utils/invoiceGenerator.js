import { t } from '../i18n';
// src/utils/invoiceGenerator.js
// Génération de facture + numéro unique + envoi mail

import { Alert, Linking } from 'react-native';
import { supabase } from '../config/supabase';

var MYHOSTKIT_EMAIL = 'myhostkit.contact@gmail.com';

function round2(n) { return Math.round(n * 100) / 100; }

function parseHours(timeStr) {
  if (!timeStr) return 1;
  var parts = timeStr.replace('→', '-').split('-').map(function(s) { return s.trim(); });
  if (parts.length !== 2) return 1;
  var st = parts[0].split(':'); var en = parts[1].split(':');
  if (st.length < 2 || en.length < 2) return 1;
  var diff = ((parseInt(en[0]) * 60 + parseInt(en[1])) - (parseInt(st[0]) * 60 + parseInt(st[1]))) / 60;
  return diff > 0 ? diff : 1;
}

function generateInvoiceNumber() {
  var d = new Date();
  var y = d.getFullYear().toString().slice(2);
  var m = ('0' + (d.getMonth() + 1)).slice(-2);
  var rand = Math.floor(Math.random() * 9000) + 1000;
  return 'MHK-' + y + m + '-' + rand;
}

/**
 * Génère une facture après rapport envoyé.
 * Workflow : ménagère termine → rapport → facture auto → mail hôte + CC myhostkit
 */
export async function generateInvoice(bookingId, session) {
  try {
    var res = await supabase.from('cleaning_bookings')
      .select('*, cleaners(*), properties(name, address, city)')
      .eq('id', bookingId).single();

    if (!res.data) { Alert.alert(t('common_error'), t('inv_err_booking_not_found')); return null; }
    var b = res.data;
    var c = b.cleaners;

    if (!c) { Alert.alert(t('common_error'), t('inv_err_cleaner_not_found')); return null; }
    if (!c.billing_complete) {
      Alert.alert(t('inv_billing_incomplete_title'), 'Complétez votre profil de facturation dans Paramètres avant de générer une facture.');
      return null;
    }

    var rate = c.price_per_cleaning || 0;
    var hours = parseHours(b.time);
    var amount = round2(rate * hours);
    var invoiceNum = generateInvoiceNumber();
    var propName = b.properties ? b.properties.name : t('common_property');
    var propAddr = b.properties ? (b.properties.address || '') + ' ' + (b.properties.city || '') : '';

    // Créer l'entrée invoice dans Supabase
    var invRes = await supabase.from('invoices').insert({
      booking_id: bookingId,
      cleaner_id: c.id,
      host_id: b.host_id,
      invoice_number: invoiceNum,
      amount: amount,
      hourly_rate: rate,
      hours_worked: hours,
      status: 'issued',
      issued_at: new Date().toISOString(),
    }).select().single();

    if (invRes.error) {
      Alert.alert(t('inv_err_invoice'), invRes.error.message);
      return null;
    }

    // Lier la facture au booking
    await supabase.from('cleaning_bookings').update({
      invoice_id: invRes.data.id,
      payment_status: 'invoice_sent',
    }).eq('id', bookingId);

    // Contenu de la facture texte (le PDF sera implémenté côté backend)
    var invoiceText =
      '════════════════════════════════\n' +
      '        FACTURE ' + invoiceNum + '\n' +
      '════════════════════════════════\n\n' +
      'Date : ' + new Date().toLocaleDateString('fr-FR') + '\n\n' +
      '── PRESTATAIRE ──\n' +
      (c.first_name || '') + ' ' + (c.last_name || c.contact_name || '') + '\n' +
      (c.company_name || '') + '\n' +
      (c.billing_address || c.address || '') + '\n' +
      (c.email || '') + ' · ' + (c.phone || '') + '\n' +
      'Statut : ' + (c.legal_status || 'Non précisé') + '\n' +
      (c.siret ? 'SIRET : ' + c.siret : '') + '\n\n' +
      '── PRESTATION ──\n' +
      'Logement : ' + propName + '\n' +
      'Adresse : ' + propAddr + '\n' +
      'Date : ' + b.date + '\n' +
      'Créneau : ' + (b.time || 'N/A') + '\n' +
      'Durée : ' + hours + 'h\n\n' +
      '── MONTANT ──\n' +
      'Taux horaire : ' + rate + ' €/h\n' +
      'Heures : ' + hours + 'h\n' +
      'Total HT : ' + amount + ' €\n' +
      'TVA : 0 € (auto-entrepreneur exonéré)\n' +
      'TOTAL TTC : ' + amount + ' €\n\n' +
      '════════════════════════════════\n';

    // Envoyer mail avec la facture à l'hôte + CC Keyla
    var subject = encodeURIComponent('Keyla — Facture ' + invoiceNum + ' : ' + propName + ' (' + b.date + ')');
    var body = encodeURIComponent(
      'Bonjour,\n\n' +
      'Veuillez trouver ci-dessous la facture pour la prestation de ménage :\n\n' +
      invoiceText + '\n' +
      'Le paiement est à effectuer via l\'application Keyla.\n\n' +
      'Cordialement,\n' +
      (c.first_name || '') + ' ' + (c.last_name || c.contact_name || '') + '\n' +
      'Via Keyla — Conciergerie IA'
    );

    // Récupérer l'email de l'hôte si possible
    var hostEmail = '';
    if (b.host_id) {
      var hostRes = await supabase.auth.admin;
      // On envoie au host via son email dans profiles ou auth
      var profileRes = await supabase.from('profiles').select('email').eq('id', b.host_id).single();
      if (profileRes.data) hostEmail = profileRes.data.email;
    }
    // Envoi automatique par Edge Function
    var recipient = hostEmail || MYHOSTKIT_EMAIL;
    fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/send-email', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ to: recipient, subject: subject.replace('encodeURIComponent',''), body: body }),
    }).catch(function(){});

    return {
      invoiceId: invRes.data.id,
      invoiceNumber: invoiceNum,
      amount: amount,
      hours: hours,
      rate: rate,
    };
  } catch (err) {
    Alert.alert(t('common_error'), err.message || t('inv_err_generic'));
    return null;
  }
}
