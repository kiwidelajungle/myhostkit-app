// src/utils/monitoring.js
// Wrapper unifiÃ© Sentry + PostHog pour MyHostKit
// Usage : import { track, identify, captureError, setUserContext, clearUser } from '../utils/monitoring';

import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';

var POSTHOG_API_KEY = 'phc_ud4RyQ8VTvMmBTUPfynWBRQt7zPCEqhvFDeocmimnv9k';
var POSTHOG_HOST = 'https://us.i.posthog.com';

// Instance PostHog (initialisÃ©e une seule fois)
var posthog = null;
var posthogReady = false;

export function initMonitoring() {
  if (posthog) return Promise.resolve(posthog);
  try {
    posthog = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      captureAppLifecycleEvents: true,
      flushAt: 20,
      flushInterval: 10000,
      sendFeatureFlagEvent: false,
      enable: !__DEV__,
    });
    posthogReady = true;
    return Promise.resolve(posthog);
  } catch (e) {
    if (__DEV__) console.warn('PostHog init failed', e);
    return Promise.resolve(null);
  }
}

// ============ TRACKING EVENTS ============
// Appelle track('event_name', { prop1: 'val1' }) pour suivre un Ã©vÃ©nement mÃ©tier
// Exemples d'events Ã  tracker : 'login_success', 'signup_started', 'property_added',
// 'cleaning_booked', 'report_sent', 'plan_upgrade_clicked', 'paywall_shown'
export function track(eventName, properties) {
  if (!eventName) return;
  try {
    if (posthogReady && posthog) {
      posthog.capture(eventName, properties || {});
    }
    if (__DEV__) console.log('[track]', eventName, properties || '');
  } catch (e) {
    if (__DEV__) console.warn('track failed', e);
  }
}

// ============ IDENTIFICATION USER ============
// Appelle aprÃ¨s login/signup pour associer un user_id aux events
// properties = { email, role, plan, created_at }
export function identify(userId, properties) {
  if (!userId) return;
  try {
    if (posthogReady && posthog) {
      posthog.identify(String(userId), properties || {});
    }
    Sentry.setUser({
      id: String(userId),
      email: properties && properties.email,
    });
  } catch (e) {
    if (__DEV__) console.warn('identify failed', e);
  }
}

// ============ SET USER CONTEXT (sans identifier) ============
// UtilisÃ© pour ajouter du contexte mÃ©tier (role, plan) sans faire de nouveau identify
export function setUserContext(context) {
  try {
    if (context) {
      Sentry.setContext('user_context', context);
      if (context.role) Sentry.setTag('role', context.role);
      if (context.plan) Sentry.setTag('plan', context.plan);
    }
  } catch (e) {
    if (__DEV__) console.warn('setUserContext failed', e);
  }
}

// ============ CLEAR USER (logout) ============
export function clearUser() {
  try {
    if (posthogReady && posthog) {
      posthog.reset();
    }
    Sentry.setUser(null);
  } catch (e) {
    if (__DEV__) console.warn('clearUser failed', e);
  }
}

// ============ CAPTURE ERREUR MANUELLEMENT ============
// Pour capturer une erreur attrapÃ©e avec try/catch sans la laisser crasher l'app
export function captureError(error, context) {
  try {
    if (context) {
      Sentry.withScope(function(scope) {
        Object.keys(context).forEach(function(k) {
          scope.setContext(k, context[k]);
        });
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
    if (__DEV__) console.error('[captureError]', error, context || '');
  } catch (e) {
    if (__DEV__) console.warn('captureError failed', e);
  }
}

// ============ CAPTURE MESSAGE (non-exception) ============
export function captureMessage(message, level) {
  try {
    Sentry.captureMessage(message, level || 'info');
  } catch (e) {
    if (__DEV__) console.warn('captureMessage failed', e);
  }
}

// ============ SCREEN TRACKING ============
// Appelle trackScreen('HostDashboard') au montage des Ã©crans importants
export function trackScreen(screenName, properties) {
  if (!screenName) return;
  try {
    if (posthogReady && posthog) {
      posthog.screen(screenName, properties || {});
    }
  } catch (e) {
    if (__DEV__) console.warn('trackScreen failed', e);
  }
}

// Export par dÃ©faut pour import facile
export default {
  init: initMonitoring,
  track: track,
  identify: identify,
  setUserContext: setUserContext,
  clearUser: clearUser,
  captureError: captureError,
  captureMessage: captureMessage,
  trackScreen: trackScreen,
};
