// [12] BLOQUANT: Onboarding — Checklist d'activation pour nouveaux utilisateurs
import React, { useState, useEffect } from 'react';
import { t, useLang } from '../i18n';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

var T = { accent: '#C8965A', blue: '#1C5F8A', card: '#FFFFFF', text: '#141414', muted: '#9B9B9B', border: 'rgba(0,0,0,0.06)', success: '#34C759', bg: '#FAFAF8' };

export default function OnboardingBanner({ role, session, hasProperties, hasBookings, hasInventory, hasCleanerProfile, hasAvailability, onNavigate }) {
  useLang();
  var _dismissed = useState(false); var dismissed = _dismissed[0]; var setDismissed = _dismissed[1];
  var _loaded = useState(false); var loaded = _loaded[0]; var setLoaded = _loaded[1];

  useEffect(function() {
    AsyncStorage.getItem('mhk-onboarding-dismissed-' + (session && session.user ? session.user.id : '')).then(function(val) {
      setDismissed(val === 'true');
      setLoaded(true);
    });
  }, []);

  function dismiss() {
    setDismissed(true);
    AsyncStorage.setItem('mhk-onboarding-dismissed-' + (session && session.user ? session.user.id : ''), 'true');
  }

  if (!loaded || dismissed) return null;

  var steps = [];
  if (role === 'host') {
    steps = [
      { done: true, label: t('onb_banner_account_created'), action: null },
      { done: hasProperties, label: hasProperties ? 'OK ' + t('onb_banner_property_done') : t('onb_banner_property_todo'), action: 'Properties' },
      { done: !!hasBookings, label: hasBookings ? t('onb_banner_booking_done') : t('onb_banner_booking_todo'), action: 'FindCleaner' },
      { done: !!hasInventory, label: hasInventory ? t('onb_banner_stock_done') : t('onb_banner_stock_todo'), action: 'Inventory' },
    ];
  } else if (role === 'cleaner') {
    steps = [
      { done: true, label: t('onb_banner_account_created'), action: null },
      { done: hasCleanerProfile, label: hasCleanerProfile ? 'OK ' + t('onb_banner_profile_done') : t('onb_banner_profile_todo'), action: 'CSettings' },
      { done: !!hasAvailability, label: hasAvailability ? t('onb_banner_avail_done') : t('onb_banner_avail_todo'), action: 'CCal' },
    ];
  }

  var doneCount = steps.filter(function(s) { return s.done; }).length;
  var progress = Math.round((doneCount / steps.length) * 100);

  if (progress === 100) { dismiss(); return null; }

  return (
    <View style={s.card}>
      <View style={s.header}>
        <Text style={s.title}>{t('onb_banner_welcome')}</Text>
        <TouchableOpacity onPress={dismiss}><Text style={s.closeT}>✕</Text></TouchableOpacity>
      </View>
      <Text style={s.subtitle}>Complétez ces étapes pour démarrer</Text>
      <View style={s.progressBar}><View style={[s.progressFill, { width: progress + '%' }]} /></View>
      <Text style={s.progressText}>{doneCount}/{steps.length} terminé</Text>
      {steps.map(function(step, i) {
        return (
          <TouchableOpacity key={i} style={[s.step, step.done && s.stepDone]} onPress={function() { if (step.action && onNavigate) onNavigate(step.action); }} disabled={step.done || !step.action}>
            <Text style={[s.stepLabel, step.done && { color: T.success }]}>{step.label}</Text>
            {!step.done && step.action && <Text style={s.stepArrow}>→</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

var s = StyleSheet.create({
  card: { backgroundColor: '#F0F7FB', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1.5, borderColor: 'rgba(28,95,138,0.2)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '700', color: T.blue },
  closeT: { fontSize: 18, color: T.muted, padding: 4 },
  subtitle: { fontSize: 12, color: T.muted, marginBottom: 12 },
  progressBar: { height: 6, backgroundColor: 'rgba(28,95,138,0.1)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: 6, backgroundColor: T.blue, borderRadius: 3 },
  progressText: { fontSize: 10, color: T.muted, textAlign: 'right', marginBottom: 10 },
  step: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(28,95,138,0.08)' },
  stepDone: { opacity: 0.6 },
  stepLabel: { fontSize: 14, color: T.text, fontWeight: '500' },
  stepArrow: { fontSize: 16, color: T.blue, fontWeight: '700' },
});
