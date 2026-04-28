import React, { useState, useEffect, useCallback } from 'react';
import { t, useLang } from '../i18n';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../config/supabase';
import { startStripeConnectOnboarding, getCleanerStripeStatus, getStripeDashboardUrl } from '../utils/stripe';

// Section Paiements Stripe Connect Express - a inserer dans CleanerSettings
export default function StripePaymentsSection(props) {
  useLang();
  var _status = useState(null); var status = _status[0]; var setStatus = _status[1];
  var _loading = useState(true); var loading = _loading[0]; var setLoading = _loading[1];
  var _opening = useState(false); var opening = _opening[0]; var setOpening = _opening[1];

  var refresh = useCallback(function() {
    setLoading(true);
    getCleanerStripeStatus(props.session.user.id).then(function(s) {
      setStatus(s);
      setLoading(false);
    }).catch(function(err) {
      console.warn('stripe status error:', err);
      setStatus(null);
      setLoading(false);
    });
  }, [props.session.user.id]);

  useEffect(function() { refresh(); }, [refresh]);

  // Refresh quand on revient dans l'app via deep link
  useEffect(function() {
    var sub = Linking.addEventListener('url', function(ev) {
      if (ev.url && ev.url.indexOf('stripe-onboarding') !== -1) {
        setTimeout(refresh, 1500);
      }
    });
    return function() { sub.remove(); };
  }, [refresh]);

  function handleOpenDashboard() {
    setOpening(true);
    getStripeDashboardUrl().then(function() {
      setOpening(false);
    }).catch(function(err) {
      setOpening(false);
      Alert.alert(t('common_error'), err.message || t('stripe_err_dashboard'));
    });
  }

  function handleOpenOnboarding() {
    setOpening(true);
    startStripeConnectOnboarding().then(function(ok) {
      setOpening(false);
      // Refresh apres retour du navigateur (le webhook account.updated aura mis a jour le statut)
      setTimeout(refresh, 1500);
    }).catch(function(err) {
      setOpening(false);
      Alert.alert(t('common_error'), err.message || t('stripe_err_setup'));
    });
  }

  if (loading) {
    return (
      <View style={s.card}>
        <Text style={s.title}>Paiements</Text>
        <View style={s.loadingRow}>
          <ActivityIndicator color="#C8965A" />
          <Text style={s.loadingT}>Chargement...</Text>
        </View>
      </View>
    );
  }

  // Determination de l'etat UI
  var hasAccount = status && status.stripe_account_id;
  var completed = status && status.stripe_onboarding_completed;
  var detailsSubmitted = status && status.stripe_details_submitted;
  var chargesEnabled = status && status.stripe_charges_enabled;
  var disabledReason = status && status.stripe_requirements_disabled_reason;

  var uiState;
  if (!hasAccount) uiState = 'not_started';
  else if (completed) uiState = 'completed';
  else if (detailsSubmitted && !chargesEnabled) uiState = 'restricted';
  else uiState = 'in_progress';

  return (
    <View style={s.card}>
      <Text style={s.title}>?? Paiements Stripe</Text>

      {uiState === 'not_started' && (
        <View>
          <Text style={s.bodyT}>Configurez Stripe pour recevoir vos paiements directement sur votre compte bancaire apres chaque prestation.</Text>
          <TouchableOpacity style={[s.btn, opening && s.btnDisabled]} onPress={handleOpenOnboarding} disabled={opening}>
            {opening ? <ActivityIndicator color="#141414" /> : <Text style={s.btnT}>Configurer Stripe</Text>}
          </TouchableOpacity>
        </View>
      )}

      {uiState === 'in_progress' && (
        <View>
          <View style={[s.badge, { backgroundColor: '#FFA726' }]}>
            <Text style={s.badgeT}>? Configuration en cours</Text>
          </View>
          <Text style={s.bodyT}>Vous avez commence la configuration mais elle n'est pas terminee. Reprenez ou vous vous etes arrete.</Text>
          <TouchableOpacity style={[s.btn, opening && s.btnDisabled]} onPress={handleOpenOnboarding} disabled={opening}>
            {opening ? <ActivityIndicator color="#141414" /> : <Text style={s.btnT}>Continuer la configuration</Text>}
          </TouchableOpacity>
        </View>
      )}

      {uiState === 'restricted' && (
        <View>
          <View style={[s.badge, { backgroundColor: '#EF5350' }]}>
            <Text style={s.badgeT}>? Action requise</Text>
          </View>
          <Text style={s.bodyT}>
            Stripe demande des informations supplementaires avant d'activer votre compte
            {disabledReason ? ' (motif: ' + disabledReason + ')' : ''}.
          </Text>
          <TouchableOpacity style={[s.btn, opening && s.btnDisabled]} onPress={handleOpenOnboarding} disabled={opening}>
            {opening ? <ActivityIndicator color="#141414" /> : <Text style={s.btnT}>Completer mon dossier</Text>}
          </TouchableOpacity>
        </View>
      )}

      {uiState === 'completed' && (
        <View>
          <View style={[s.badge, { backgroundColor: '#4CAF50' }]}>
            <Text style={s.badgeT}>? Compte actif</Text>
          </View>
          <Text style={s.bodyT}>Vous pouvez recevoir des paiements. Les fonds sont verses quotidiennement sur votre IBAN.</Text>
          <TouchableOpacity style={[s.btn, opening && s.btnDisabled, { marginBottom: 8 }]} onPress={handleOpenDashboard} disabled={opening}>
            {opening ? <ActivityIndicator color="#141414" /> : <Text style={s.btnT}>Voir mes revenus</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={s.btnSecondary} onPress={handleOpenOnboarding} disabled={opening}>
            <Text style={s.btnSecondaryT}>{opening ? t('stripe_opening') : t('stripe_edit_info')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

var s = StyleSheet.create({
  card: { backgroundColor: '#1A1A1A', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(200,150,90,0.2)' },
  title: { color: '#FAFAF8', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  bodyT: { color: 'rgba(250,250,248,0.85)', fontSize: 13, lineHeight: 19, marginBottom: 14 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingT: { color: '#9A9A9A', fontSize: 13, marginLeft: 8 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginBottom: 10 },
  badgeT: { color: '#141414', fontSize: 11, fontWeight: '700' },
  btn: { backgroundColor: '#C8965A', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnT: { color: '#141414', fontSize: 14, fontWeight: '700' },
  btnSecondary: { paddingVertical: 11, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#C8965A' },
  btnSecondaryT: { color: '#C8965A', fontSize: 13, fontWeight: '600' },
});
