import { supabase } from '../config/supabase';

var _cachedPlan = null;
var _cachedAt = 0;
var _planSuspended = false;
var ADMIN_EMAIL = 'm.rayane8306@gmail.com';

export function isPlanSuspended() { return _planSuspended; }

export async function getUserPlan(userId) {
  if (_cachedPlan && Date.now() - _cachedAt < 60000) return _cachedPlan;
  try {
    var res = await supabase.from('profiles').select('subscription_plan, subscription_status, subscription_end, trial_ends_at, email').eq('id', userId).single();
    if (!res.data) { _cachedPlan = 'free'; _cachedAt = Date.now(); return 'free'; }

    var d = res.data;

    // Admin = accès total
    if (d.email === ADMIN_EMAIL) { _cachedPlan = 'pro'; _cachedAt = Date.now(); return 'pro'; }

    // Trial actif ?
    if (d.subscription_plan === 'trial') {
      if (d.trial_ends_at && new Date(d.trial_ends_at) > new Date()) {
        _cachedPlan = 'trial'; // trial = accès Pro complet
        _cachedAt = Date.now();
        return 'trial';
      } else {
        // Trial expiré → passer en gratuit
        await supabase.from('profiles').update({ subscription_plan: 'free', subscription_status: 'inactive' }).eq('id', userId);
        _cachedPlan = 'free';
        _cachedAt = Date.now();
        return 'free';
      }
    }

    // Plan payant actif ?
    if (d.subscription_status === 'active' && d.subscription_plan && d.subscription_plan !== 'free') {
      _cachedPlan = d.subscription_plan;
    } else if (d.subscription_status === 'past_due' || d.subscription_status === 'suspended') {
      // Paiement refusé — plan suspendu mais pas supprimé
      // L'utilisateur garde ses données mais passe en mode gratuit temporairement
      _cachedPlan = 'free';
      _planSuspended = true;
    } else if (d.subscription_end && new Date(d.subscription_end) > new Date()) {
      _cachedPlan = d.subscription_plan || 'free';
    } else {
      _cachedPlan = 'free';
    }
  } catch(e) { _cachedPlan = 'free'; }
  _cachedAt = Date.now();
  return _cachedPlan;
}

export function clearPlanCache() { _cachedPlan = null; _cachedAt = 0; }

// Plans HÔTES
export var HOST_PLAN_LIMITS = {
  free:    { maxProperties: 1, stock: false, icalSync: false, pushNotifs: false, aiConcierge: false, aiVision: false, revenueIntel: false, commission: 0.15 },
  trial:   { maxProperties: 999, stock: true, icalSync: true, pushNotifs: true, aiConcierge: true, aiVision: true, revenueIntel: true, commission: 0.05 },
  starter: { maxProperties: 3, stock: true,  icalSync: true,  pushNotifs: true,  aiConcierge: false, aiVision: false, revenueIntel: false, commission: 0.10 },
  pro:     { maxProperties: 999, stock: true, icalSync: true, pushNotifs: true, aiConcierge: true, aiVision: true, revenueIntel: true, commission: 0.05 },
};

// Plans MÉNAGÈRES
export var CLEANER_PLAN_LIMITS = {
  free:     { maxProperties: 3, visibility: 'normal', verified: false, priority: false, team: false, commissionDiscount: 0 },
  trial:    { maxProperties: 999, visibility: 'boosted', verified: true, priority: true, team: true, commissionDiscount: 5 },
  pro:      { maxProperties: 999, visibility: 'boosted', verified: false, priority: false, team: false, commissionDiscount: 2 },
  business: { maxProperties: 999, visibility: 'boosted', verified: true, priority: true, team: true, commissionDiscount: 5 },
};

export function getLimits(plan) { return HOST_PLAN_LIMITS[plan] || HOST_PLAN_LIMITS.free; }
export function getCleanerLimits(plan) { return CLEANER_PLAN_LIMITS[plan] || CLEANER_PLAN_LIMITS.free; }
export function isPro(plan) { return plan === 'pro' || plan === 'trial'; }
export function isStarter(plan) { return plan === 'starter'; }
export function isBusiness(plan) { return plan === 'business'; }
export function isPaid(plan) { return plan !== 'free'; }
export function isTrial(plan) { return plan === 'trial'; }

export function canAddProperty(plan, currentCount) {
  var limits = getLimits(plan);
  return currentCount < limits.maxProperties;
}

export function canUseFeature(plan, feature) {
  var limits = getLimits(plan);
  return !!limits[feature];
}

export function getPlanLabel(plan) {
  if (plan === 'trial') return '🎁 Essai gratuit';
  if (plan === 'pro') return '⭐ Pro';
  if (plan === 'starter') return '🚀 Starter';
  if (plan === 'business') return '💼 Business';
  return 'Gratuit';
}

export function getTrialDaysRemaining(trialEndsAt) {
  if (!trialEndsAt) return 0;
  var diff = new Date(trialEndsAt) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// Vérifier et envoyer les emails de rappel trial
export async function checkTrialEmails(userId) {
  try {
    var res = await supabase.from('profiles').select('email, trial_ends_at, trial_email_j7_sent, trial_email_j1_sent, trial_email_end_sent, subscription_plan').eq('id', userId).single();
    if (!res.data || res.data.subscription_plan !== 'trial') return;

    var d = res.data;
    var daysLeft = getTrialDaysRemaining(d.trial_ends_at);

    // J-7
    if (daysLeft <= 7 && daysLeft > 1 && !d.trial_email_j7_sent) {
      await fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/send-email', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ to: d.email, subject: 'Keyla — Votre essai gratuit se termine dans ' + daysLeft + ' jours',
          body: 'Bonjour,\n\nVotre periode d\'essai gratuit Keyla se termine dans ' + daysLeft + ' jours.\n\nPour continuer a profiter de toutes les fonctionnalites, choisissez un plan adapte a vos besoins :\n\n  Starter — 49 EUR/mois (3 logements, stock, iCal)\n  Pro — 89 EUR/mois (illimite, IA concierge, 5% commission)\n\nSi vous ne choisissez pas de plan, votre compte passera automatiquement en version gratuite (1 logement, 15% commission).\n\nAucun paiement ne sera preleve sans votre consentement.\n\n— L\'equipe Keyla' }),
      });
      await supabase.from('profiles').update({ trial_email_j7_sent: true }).eq('id', userId);
    }

    // J-1
    if (daysLeft <= 1 && daysLeft > 0 && !d.trial_email_j1_sent) {
      await fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/send-email', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ to: d.email, subject: 'Keyla — Dernier jour d\'essai gratuit',
          body: 'Bonjour,\n\nVotre essai gratuit Keyla se termine demain.\n\nChoisissez votre plan pour continuer sans interruption :\n\n  Starter — 49 EUR/mois\n  Pro — 89 EUR/mois\n\nApres expiration, votre compte sera automatiquement converti en plan gratuit. Aucun paiement ne sera preleve.\n\n— L\'equipe Keyla' }),
      });
      await supabase.from('profiles').update({ trial_email_j1_sent: true }).eq('id', userId);
    }

    // Expiré
    if (daysLeft === 0 && !d.trial_email_end_sent) {
      await fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/send-email', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ to: d.email, subject: 'Keyla — Essai termine, choisissez votre plan',
          body: 'Bonjour,\n\nVotre essai gratuit Keyla est termine.\n\nVotre compte est desormais en version gratuite (1 logement, 15% commission).\n\nPour retrouver l\'acces complet, souscrivez a un plan :\n\n  Starter — 49 EUR/mois (3 logements)\n  Pro — 89 EUR/mois (illimite + IA)\n\nRendez-vous dans Profil > Mon abonnement.\n\n— L\'equipe Keyla' }),
      });
      await supabase.from('profiles').update({ trial_email_end_sent: true, subscription_plan: 'free', subscription_status: 'inactive' }).eq('id', userId);
    }
  } catch(e) {}
}

export function isAdmin(email) {
  return email === ADMIN_EMAIL;
}
