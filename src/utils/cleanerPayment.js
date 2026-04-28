import { t } from '../i18n';
// src/utils/cleanerPayment.js
// Paiement UNIQUEMENT après service terminé + facture envoyée
// Plus d'acompte — paiement full post-rapport

import { Alert, Linking } from 'react-native';
import { supabase } from '../config/supabase';

var MYHOSTKIT_EMAIL = 'myhostkit.contact@gmail.com';
// Commission par défaut 15% — sera ajustée selon le plan si nécessaire
var DEFAULT_COMMISSION_RATE = 0.15;

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

/**
 * Paiement complet après service.
 * Conditions : ménage terminé + rapport envoyé + facture générée
 */
export async function payAfterService(bookingId, session) {
  try {
    var res = await supabase.from('cleaning_bookings')
      .select('*, cleaners(company_name, contact_name, email, price_per_cleaning), properties(name), invoices(*)')
      .eq('id', bookingId).single();

    if (!res.data) { Alert.alert(t('common_error'), t('cpay_err_booking')); return false; }
    var b = res.data;

    // Vérifications
    var errors = [];
    if (b.status !== 'completed') errors.push('Le ménage n\'est pas terminé');
    if (!b.report_sent) errors.push('Le rapport photo n\'a pas été envoyé');
    if (!b.invoice_id) errors.push('La facture n\'a pas été générée');
    if (b.payment_status === 'paid') {
      Alert.alert(t('cpay_already_paid_title'), t('cpay_already_paid_msg'));
      return false;
    }
    if (errors.length > 0) {
      Alert.alert(t('cpay_impossible_title'), '• ' + errors.join('\n• '));
      return false;
    }

    var rate = b.cleaners ? b.cleaners.price_per_cleaning : 0;
    var hours = parseHours(b.time);
    var amount = round2(rate * hours);
    var cleanerName = b.cleaners ? b.cleaners.company_name : 'Ménagère';
    var contactName = b.cleaners ? b.cleaners.contact_name : '';
    var propName = b.properties ? b.properties.name : t('common_property');
    var cleanerEmail = b.cleaners ? b.cleaners.email : '';

    return new Promise(function(resolve) {
      Alert.alert(
        '💳 Payer la prestation',
        '🧹 ' + cleanerName + '\n🏠 ' + propName + '\n📅 ' + b.date +
        '\n🕐 ' + (b.time || '?') + ' (' + hours + 'h)' +
        '\n\n── Vérifications ──' +
        '\n✅ Ménage terminé' +
        '\n✅ Rapport photo reçu' +
        '\n✅ Facture émise' +
        '\n\n── Montant ──' +
        '\n💶 ' + rate + ' €/h × ' + hours + 'h' +
        '\n💰 Total : ' + amount + ' €',
        [
          { text: 'Annuler', style: 'cancel', onPress: function() { resolve(false); } },
          {
            text: 'Payer ' + amount + ' €',
            onPress: function() {
              // Enregistrer paiement
              supabase.from('payments').insert({
                booking_id: bookingId,
                invoice_id: b.invoice_id,
                payer_id: session.user.id,
                amount: amount,
                type: 'full',
                status: 'completed',
                completed_at: new Date().toISOString(),
              }).then(function() {});

              supabase.from('cleaning_bookings').update({
                payment_status: 'paid',
                payment_amount: amount,
                payment_date: new Date().toISOString(),
                paid_by: session.user.id,
              }).eq('id', bookingId).then(function(ur) {
                if (ur.error) { Alert.alert(t('common_error'), ur.error.message); resolve(false); return; }

                // Mettre à jour la facture
                supabase.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', b.invoice_id).then(function() {});

                // Mettre à jour les stats du logement
                if (b.property_id) {
                  supabase.rpc('increment_field', { row_id: b.property_id, table_name: 'properties', field_name: 'total_cleaning_cost' }).then(function() {});
                }

                // Mail confirmation CC MyHostKit
                Alert.alert(t('cpay_done_title'), amount + ' EUR -> ' + cleanerName);
                var body = encodeURIComponent(
                  'Bonjour ' + contactName + ',\n\n' +
                  'Le paiement de votre prestation a été effectué :\n\n' +
                  '🏠 ' + propName + '\n📅 ' + b.date + '\n💰 ' + amount + ' €\n\n' +
                  'Merci pour votre travail !\nVia MyHostKit'
                );
                fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/send-email', {
                  method: 'POST', headers: {'Content-Type':'application/json'},
                  body: JSON.stringify({ to: cleanerEmail, subject: 'MyHostKit — Paiement prestation ' + propName, body: 'Bonjour ' + contactName + ',\n\nLe paiement de votre prestation a ete effectue :\n\n🏠 ' + propName + '\n📅 ' + b.date + '\n💰 ' + amount + ' EUR\n\nMerci pour votre travail !\nVia MyHostKit' }),
                }).catch(function(){});
                Alert.alert(t('cpay_done_title'), amount + ' EUR -> ' + cleanerName);
                resolve(true);
              });
            }
          }
        ]
      );
    });
  } catch (err) {
    Alert.alert(t('common_error'), err.message || t('cpay_err_generic'));
    return false;
  }
}

// Commission 15% sur commandes produits
export function calculateOrderWithCommission(cartItems, products) {
  var subtotal = 0;
  for (var k in cartItems) subtotal += products[parseInt(k)].price * cartItems[k];
  var commission = round2(subtotal * DEFAULT_COMMISSION_RATE);
  return { subtotal: round2(subtotal), commission: commission, total: round2(subtotal + commission) };
}