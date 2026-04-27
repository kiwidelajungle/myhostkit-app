// Stripe Connect — via Edge Function manage-subscription
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase, EDGE_URL, SUPABASE_ANON } from '../config/supabase';

import { getUserPlan, getLimits } from './subscription';
// Commission dynamique selon le plan de l'hôte

export async function createPaymentSession(bookingId, session) {
  try {
    var res = await supabase.from('cleaning_bookings')
      .select('*, cleaners(company_name, contact_name, price_per_cleaning, email, stripe_account_id), properties(name)')
      .eq('id', bookingId).single();

    if (!res.data) { Alert.alert('Erreur', 'Reservation introuvable'); return null; }
    var b = res.data;
    var c = b.cleaners;
    if (!c) { Alert.alert('Erreur', 'Menagere introuvable'); return null; }

    var rate = c.price_per_cleaning || 0;
    var hours = 1;
    if (b.time) {
      var parts = b.time.replace('→','-').split('-').map(function(s){return s.trim();});
      if (parts.length === 2) {
        var st = parts[0].split(':'), en = parts[1].split(':');
        if (st.length >= 2 && en.length >= 2) {
          hours = ((parseInt(en[0])*60+parseInt(en[1])) - (parseInt(st[0])*60+parseInt(st[1]))) / 60;
          if (hours <= 0) hours = 1;
        }
      }
    }

    var totalAmount = Math.round(rate * hours * 100);
    // Commission dynamique selon le plan de l'hôte
    var hostPlan = 'free';
    try {
      var hp = await supabase.from('profiles').select('subscription_plan').eq('id', session.user.id).single();
      if (hp.data) hostPlan = hp.data.subscription_plan || 'free';
    } catch(e) {}
    var limits = getLimits(hostPlan);
    var commissionRate = limits.commission || 0.15;
    var commissionAmount = Math.round(totalAmount * commissionRate);
    var propName = b.properties ? b.properties.name : 'Logement';

    var response = await fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/manage-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'checkout',
        booking_id: bookingId,
        amount: totalAmount,
        commission: commissionAmount,
        cleaner_stripe_account: c.stripe_account_id || null,
        description: 'Menage ' + propName + ' - ' + b.date,
        customer_email: session.user.email,
      }),
    });

    if (response.ok) {
      var data = await response.json();
      if (data.url) {
        // Ouvrir Stripe Checkout — NE PAS marquer comme payé tant que Stripe n'a pas confirmé
        var checkoutSessionId = data.url.split('/').pop() || '';
        await WebBrowser.openBrowserAsync(data.url);
        
        // Après retour du navigateur, vérifier si le paiement a réellement été effectué
        // On vérifie via l'Edge Function
        try {
          var verifyRes = await fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/manage-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'verify_payment', session_url: data.url }),
          });
          var verifyData = await verifyRes.json();
          
          if (verifyData && verifyData.paid) {
            // Paiement CONFIRMÉ par Stripe — maintenant on peut mettre à jour
            await supabase.from('cleaning_bookings').update({
              payment_amount: totalAmount / 100,
              payment_held_at: new Date().toISOString(),
              status: 'confirmed',
              auto_validate_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
            }).eq('id', bookingId);
            Alert.alert('Paiement confirme ✅', 'Le paiement de ' + (totalAmount/100).toFixed(2) + ' € a ete effectue.');
            return { success: true, amount: totalAmount / 100 };
          } else {
            // Paiement NON effectué — ne rien changer
            Alert.alert('Paiement non effectue', 'Le paiement n\'a pas ete finalise. La reservation reste en attente de paiement.');
            return null;
          }
        } catch(verifyErr) {
          // En cas d'erreur de vérification, ne PAS valider le paiement
          Alert.alert('Verification en cours', 'Nous n\'avons pas pu confirmer le paiement. Si vous avez paye, le statut sera mis a jour dans quelques minutes.');
          return null;
        }
      }
    }

    // Fallback — pas de bouton "Marquer payé" (seul le webhook Stripe peut confirmer)
    Alert.alert('Paiement indisponible', 'Le paiement Stripe n\'a pas pu etre initie. Verifiez votre connexion et reessayez.');
    return null;
  } catch(e) {
    Alert.alert('Erreur', e.message || 'Erreur de paiement');
    return null;
  }
}

export async function createConnectAccount(cleanerUserId) {
  try {
    var response = await fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/manage-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'connect', cleaner_user_id: cleanerUserId }),
    });
    if (response.ok) {
      var data = await response.json();
      if (data.onboarding_url) { await WebBrowser.openBrowserAsync(data.onboarding_url); return true; }
    }
    Alert.alert('Stripe Connect', 'Configuration bientot disponible.');
    return false;
  } catch(e) {
    Alert.alert('Erreur', e.message);
    return false;
  }
}


// === STRIPE CONNECT EXPRESS - Nouvelle architecture ===
export async function startStripeConnectOnboarding() {
  var invokeRes = await supabase.functions.invoke('stripe-connect-onboarding', { method: 'POST' });
  if (invokeRes.error) throw new Error(invokeRes.error.message || 'Erreur Edge Function');
  var data = invokeRes.data;
  if (!data || !data.url) throw new Error('URL Stripe manquante');
  await WebBrowser.openBrowserAsync(data.url);
  return true;
}

export async function getCleanerStripeStatus(userId) {
  var res = await supabase.from('cleaners').select('stripe_account_id, stripe_onboarding_completed, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted, stripe_requirements_disabled_reason, stripe_requirements_currently_due').eq('user_id', userId).maybeSingle();
  if (res.error) throw res.error;
  return res.data;
}


// Ouvre le Stripe Express Dashboard du cleaner (paiements, virements, IBAN)
export async function getStripeDashboardUrl() {
  var invokeRes = await supabase.functions.invoke('stripe-connect-dashboard-link', { method: 'POST' });
  if (invokeRes.error) throw new Error(invokeRes.error.message || 'Erreur Edge Function');
  var data = invokeRes.data;
  if (!data || !data.url) throw new Error('URL dashboard manquante');
  await WebBrowser.openBrowserAsync(data.url);
  return true;
}



// =====================================================================
// STRIPE CONNECT PAYMENTS - Escrow avec capture manuelle
// =====================================================================

// Appelle l'Edge Function create-cleaning-payment-intent pour un booking donne.
// Retourne { client_secret, payment_intent_id, amount_cents, commission_cents, cleaner_name }
// Utilise par HostDashboard pour initialiser PaymentSheet.
export async function createCleaningPayment(bookingId) {
  var invokeRes = await supabase.functions.invoke('create-cleaning-payment-intent', {
    method: 'POST',
    body: { booking_id: bookingId },
  });
  if (invokeRes.error) throw new Error(invokeRes.error.message || 'Erreur Edge Function');
  var data = invokeRes.data;
  if (!data || !data.client_secret) throw new Error(data && data.error ? data.error : 'client_secret manquant');
  return data;
}

// Capture un PaymentIntent (= transfert effectif au cleaner).
// Appele par l'hote quand il valide le menage, OU par un cron job 48h apres.
export async function captureCleaningPayment(bookingId) {
  var invokeRes = await supabase.functions.invoke('capture-cleaning-payment', {
    method: 'POST',
    body: { booking_id: bookingId },
  });
  if (invokeRes.error) throw new Error(invokeRes.error.message || 'Erreur Edge Function');
  return invokeRes.data;
}
