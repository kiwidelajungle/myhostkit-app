// ============================================================
// ProspectionRequestModal.js
// Modal wizard 3 etapes pour demander une mise en relation a MyHostKit
// quand aucun logement n'est disponible dans la zone de l'agent.
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, Alert, Animated, KeyboardAvoidingView, Platform,
  ActivityIndicator
} from 'react-native';
import { sendProspectionRequest } from '../services/prospection';

// ============================================================
// PALETTE MyHostKit (alignee sur le site)
// ============================================================
var NAVY = '#0A1F3D';
var GOLD = '#B89B6E';
var GOLD_LIGHT = '#D4B886';
var CREAM = '#F5EFE6';
var TEXT_MUTED = '#6b6b6b';

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function ProspectionRequestModal(props) {
  // props.visible (bool), props.onClose (func), props.initialCity (string)

  var _step = useState(1); var step = _step[0]; var setStep = _step[1];
  var _city = useState(''); var city = _city[0]; var setCity = _city[1];
  var _radius = useState(10); var radius = _radius[0]; var setRadius = _radius[1];
  var _pricingMode = useState('hourly'); var pricingMode = _pricingMode[0]; var setPricingMode = _pricingMode[1];
  var _price = useState(''); var price = _price[0]; var setPrice = _price[1];
  var _availableFrom = useState(''); var availableFrom = _availableFrom[0]; var setAvailableFrom = _availableFrom[1];
  var _volume = useState('4-7'); var volume = _volume[0]; var setVolume = _volume[1];
  var _loading = useState(false); var loading = _loading[0]; var setLoading = _loading[1];
  var _success = useState(false); var success = _success[0]; var setSuccess = _success[1];

  var progressAnim = useRef(new Animated.Value(33)).current;

  // Reset du form a chaque ouverture
  useEffect(function() {
    if (props.visible) {
      setStep(1);
      setCity(props.initialCity || '');
      setRadius(10);
      setPricingMode('hourly');
      setPrice('');
      var today = new Date();
      var iso = today.toISOString().split('T')[0];
      setAvailableFrom(iso);
      setVolume('4-7');
      setLoading(false);
      setSuccess(false);
      progressAnim.setValue(33);
    }
  }, [props.visible]);

  // Animation de la progress bar a chaque changement d'etape
  useEffect(function() {
    var target = success ? 100 : (step / 3) * 100;
    Animated.timing(progressAnim, {
      toValue: target,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [step, success]);

  // ========================================================
  // ESTIMATION AUTO du tarif
  // ========================================================
  function getEstimate() {
    var p = parseFloat(price);
    if (!p || p <= 0) return null;
    if (pricingMode === 'hourly') {
      // Studio 25m2 ~ 1h30 de menage
      return (p * 1.5).toFixed(0);
    } else {
      // 25m2 x prix/m2
      return (p * 25).toFixed(0);
    }
  }

  // ========================================================
  // NAVIGATION ENTRE ETAPES
  // ========================================================
  function goNext() {
    if (step === 1) {
      if (!city || city.trim().length < 2) {
        Alert.alert('Ville requise', 'Indiquez la ville ou vous voulez intervenir.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      var p = parseFloat(price);
      if (!p || p <= 0) {
        Alert.alert('Tarif requis', 'Indiquez un tarif valide.');
        return;
      }
      setStep(3);
    }
  }

  function goBack() {
    if (step > 1) setStep(step - 1);
  }

  // ========================================================
  // SOUMISSION
  // ========================================================
  async function submit() {
    setLoading(true);
    var result = await sendProspectionRequest({
      city: city.trim(),
      radius_km: radius,
      pricing_mode: pricingMode,
      price: parseFloat(price),
      available_from: availableFrom,
      volume: volume,
    });
    setLoading(false);

    if (result.ok) {
      setSuccess(true);
    } else {
      Alert.alert(
        'Erreur',
        result.error || 'Une erreur est survenue. Reessayez dans quelques instants.'
      );
    }
  }

  function handleClose() {
    if (props.onClose) props.onClose();
  }

  // ========================================================
  // RENDU
  // ========================================================
  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalWrapper}
        >
          <View style={styles.modal}>

            {/* Bordure or fine en haut */}
            <View style={styles.topBorder} />

            {/* Bouton fermer */}
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Text style={styles.closeBtnText}>X</Text>
            </TouchableOpacity>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <Animated.View style={[
                styles.progressFill,
                { width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  })
                }
              ]} />
            </View>

            <ScrollView
              style={styles.scrollContent}
              contentContainerStyle={styles.scrollInner}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >

              {/* SUCCESS STATE */}
              {success && (
                <View style={styles.successContainer}>
                  <View style={styles.successCircle}>
                    <Text style={styles.successCheck}>OK</Text>
                  </View>
                  <Text style={styles.successTitle}>C'est parti.</Text>
                  <Text style={styles.successText}>
                    Notre equipe va prospecter activement les hotes autour de
                    <Text style={{ fontWeight: '700', color: NAVY }}> {city}</Text>.
                  </Text>
                  <View style={styles.successDivider} />
                  <Text style={styles.successEta}>
                    Premiers contacts sous <Text style={{ fontWeight: '700' }}>48 a 72h</Text>
                  </Text>
                  <TouchableOpacity style={styles.btnPrimary} onPress={handleClose}>
                    <Text style={styles.btnPrimaryText}>Compris</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 1 : VILLE */}
              {!success && step === 1 && (
                <View>
                  <Text style={styles.stepNum}>ETAPE 1 / 3</Text>
                  <Text style={styles.title}>
                    Ou cherchez-vous <Text style={styles.titleAccent}>des hotes</Text> ?
                  </Text>
                  <Text style={styles.subtitle}>
                    Indiquez votre zone d'intervention. Notre equipe contactera
                    directement les hotes Airbnb et conciergeries locales.
                  </Text>

                  <Text style={styles.label}>Ville principale</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Marseille, Lyon, Bordeaux..."
                    placeholderTextColor="#b0b0b0"
                    value={city}
                    onChangeText={setCity}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />

                  <Text style={[styles.label, { marginTop: 20 }]}>Rayon de recherche</Text>
                  <View style={styles.segments}>
                    {[5, 10, 20, 30].map(function(r) {
                      var active = radius === r;
                      return (
                        <TouchableOpacity
                          key={r}
                          style={[styles.segment, active && styles.segmentActive]}
                          onPress={function() { setRadius(r); }}
                        >
                          <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                            {r} km
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* STEP 2 : TARIF */}
              {!success && step === 2 && (
                <View>
                  <Text style={styles.stepNum}>ETAPE 2 / 3</Text>
                  <Text style={styles.title}>
                    Vos <Text style={styles.titleAccent}>tarifs</Text>
                  </Text>
                  <Text style={styles.subtitle}>
                    Comment facturez-vous vos prestations ? On adapte la
                    recherche a vos conditions.
                  </Text>

                  <Text style={styles.label}>Mode de facturation</Text>
                  <View style={styles.modeRow}>
                    <TouchableOpacity
                      style={[styles.modeCard, pricingMode === 'hourly' && styles.modeCardActive]}
                      onPress={function() { setPricingMode('hourly'); }}
                    >
                      <Text style={[styles.modeIcon, pricingMode === 'hourly' && { color: GOLD }]}>
                        H
                      </Text>
                      <Text style={[styles.modeLabel, pricingMode === 'hourly' && { color: GOLD }]}>
                        A L'HEURE
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modeCard, pricingMode === 'surface' && styles.modeCardActive]}
                      onPress={function() { setPricingMode('surface'); }}
                    >
                      <Text style={[styles.modeIcon, pricingMode === 'surface' && { color: GOLD }]}>
                        m2
                      </Text>
                      <Text style={[styles.modeLabel, pricingMode === 'surface' && { color: GOLD }]}>
                        AU M2
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.label, { marginTop: 16 }]}>
                    {pricingMode === 'hourly' ? 'Tarif horaire' : 'Tarif au m2'}
                  </Text>
                  <View style={styles.priceWrap}>
                    <TextInput
                      style={styles.priceInput}
                      placeholder={pricingMode === 'hourly' ? '25' : '1.5'}
                      placeholderTextColor="#b0b0b0"
                      value={price}
                      onChangeText={setPrice}
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.priceCurrency}>EUR</Text>
                  </View>
                  <Text style={styles.priceHint}>
                    {pricingMode === 'hourly'
                      ? 'Votre tarif par heure de prestation'
                      : 'Votre tarif par m2 nettoye'}
                  </Text>

                  {/* Estimation auto */}
                  {getEstimate() && (
                    <View style={styles.estimate}>
                      <Text style={styles.estimateLabel}>
                        ESTIMATION POUR UN STUDIO 25m2
                      </Text>
                      <Text style={styles.estimateValue}>
                        {getEstimate()} EUR <Text style={styles.estimateValueSub}>par prestation</Text>
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* STEP 3 : DISPONIBILITE */}
              {!success && step === 3 && (
                <View>
                  <Text style={styles.stepNum}>ETAPE 3 / 3</Text>
                  <Text style={styles.title}>
                    Votre <Text style={styles.titleAccent}>disponibilite</Text>
                  </Text>
                  <Text style={styles.subtitle}>
                    Pour vous proposer des hotes pertinents au bon moment.
                  </Text>

                  <Text style={styles.label}>Disponible a partir de</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="2026-05-01"
                    placeholderTextColor="#b0b0b0"
                    value={availableFrom}
                    onChangeText={setAvailableFrom}
                  />
                  <Text style={styles.priceHint}>
                    Format : AAAA-MM-JJ (ex: 2026-05-01)
                  </Text>

                  <Text style={[styles.label, { marginTop: 20 }]}>Volume souhaite</Text>
                  <View style={styles.segments}>
                    {[
                      { value: '1-3', label: '1-3 / sem' },
                      { value: '4-7', label: '4-7 / sem' },
                      { value: '8+', label: '8+ / sem' },
                    ].map(function(opt) {
                      var active = volume === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.segment, active && styles.segmentActive]}
                          onPress={function() { setVolume(opt.value); }}
                        >
                          <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

            </ScrollView>

            {/* BOUTONS ACTIONS (cachees en success) */}
            {!success && (
              <View style={styles.actions}>
                {step > 1 && (
                  <TouchableOpacity
                    style={styles.btnBack}
                    onPress={goBack}
                    disabled={loading}
                  >
                    <Text style={styles.btnBackText}>Retour</Text>
                  </TouchableOpacity>
                )}
                {step < 3 && (
                  <TouchableOpacity
                    style={styles.btnPrimary}
                    onPress={goNext}
                    disabled={loading}
                  >
                    <Text style={styles.btnPrimaryText}>Continuer</Text>
                  </TouchableOpacity>
                )}
                {step === 3 && (
                  <TouchableOpacity
                    style={[styles.btnPrimary, loading && { opacity: 0.6 }]}
                    onPress={submit}
                    disabled={loading}
                  >
                    {loading
                      ? <ActivityIndicator color={GOLD} />
                      : <Text style={styles.btnPrimaryText}>Demander la mise en relation</Text>
                    }
                  </TouchableOpacity>
                )}
              </View>
            )}

          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ============================================================
// STYLES
// ============================================================
var styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 31, 61, 0.75)',
    justifyContent: 'flex-end',
  },
  modalWrapper: {
    width: '100%',
  },
  modal: {
    backgroundColor: CREAM,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    maxHeight: '92%',
  },
  topBorder: {
    height: 3,
    backgroundColor: GOLD,
    opacity: 0.5,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(10, 31, 61, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeBtnText: {
    fontSize: 14,
    color: NAVY,
    fontWeight: '600',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(10, 31, 61, 0.08)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: GOLD,
  },
  scrollContent: {
    maxHeight: 500,
  },
  scrollInner: {
    padding: 28,
    paddingTop: 38,
  },
  stepNum: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: NAVY,
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 10,
    lineHeight: 32,
  },
  titleAccent: {
    color: GOLD,
    fontStyle: 'italic',
  },
  subtitle: {
    color: TEXT_MUTED,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: NAVY,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: 'rgba(184, 155, 110, 0.3)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: NAVY,
  },
  segments: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: 'rgba(184, 155, 110, 0.3)',
    borderRadius: 14,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: NAVY,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  segmentTextActive: {
    color: GOLD,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modeCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: 'rgba(184, 155, 110, 0.3)',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  modeCardActive: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },
  modeIcon: {
    fontSize: 22,
    marginBottom: 4,
    fontWeight: '700',
    color: TEXT_MUTED,
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: TEXT_MUTED,
  },
  priceWrap: {
    position: 'relative',
  },
  priceInput: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: 'rgba(184, 155, 110, 0.3)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    paddingRight: 60,
    fontSize: 22,
    fontWeight: '700',
    color: NAVY,
  },
  priceCurrency: {
    position: 'absolute',
    right: 18,
    top: 16,
    fontSize: 16,
    fontWeight: '700',
    color: GOLD,
  },
  priceHint: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 12,
    color: '#888',
  },
  estimate: {
    backgroundColor: 'rgba(184, 155, 110, 0.12)',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(184, 155, 110, 0.25)',
    alignItems: 'center',
  },
  estimateLabel: {
    fontSize: 10,
    color: '#888',
    letterSpacing: 1.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  estimateValue: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: NAVY,
    fontSize: 22,
    fontWeight: '700',
  },
  estimateValueSub: {
    color: GOLD,
    fontStyle: 'italic',
    fontSize: 14,
    fontWeight: '400',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 28,
    paddingTop: 12,
  },
  btnBack: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: 'rgba(10, 31, 61, 0.15)',
    backgroundColor: 'transparent',
  },
  btnBackText: {
    color: NAVY,
    fontWeight: '700',
    fontSize: 14,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: NAVY,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: GOLD,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  // Success state
  successContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  successCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successCheck: {
    color: GOLD,
    fontSize: 28,
    fontWeight: '700',
  },
  successTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: NAVY,
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 12,
  },
  successText: {
    color: TEXT_MUTED,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  successDivider: {
    width: 40,
    height: 1,
    backgroundColor: GOLD,
    opacity: 0.5,
    marginVertical: 16,
  },
  successEta: {
    color: GOLD,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    fontSize: 16,
    marginBottom: 28,
  },
});
