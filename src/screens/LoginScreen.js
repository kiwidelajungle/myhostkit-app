import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../config/supabase';
import T from '../theme';
import { track, identify } from '../utils/monitoring';
import { t, setLang, getLang, useLang } from '../i18n';

export default function LoginScreen(props) {
  useLang(); // re-render automatique au changement de langue
  var _email = useState(''); var email = _email[0]; var setEmail = _email[1];
  var _pass = useState(''); var pass = _pass[0]; var setPass = _pass[1];
  var _pass2 = useState(''); var pass2 = _pass2[0]; var setPass2 = _pass2[1];
  var _showPass = useState(false); var showPass = _showPass[0]; var setShowPass = _showPass[1];
  var _showPass2 = useState(false); var showPass2 = _showPass2[0]; var setShowPass2 = _showPass2[1];
  var _role = useState('host'); var role = _role[0]; var setRole = _role[1];
  var _isSignup = useState(false); var isSignup = _isSignup[0]; var setIsSignup = _isSignup[1];
  var _loading = useState(false); var loading = _loading[0]; var setLoading = _loading[1];
  var _referralInput = useState(''); var referralInput = _referralInput[0]; var setReferralInput = _referralInput[1];
  var _guestCode = useState(''); var guestCode = _guestCode[0]; var setGuestCode = _guestCode[1];
  var curLang = getLang();

  function handleAuth() {
    if (!email.trim() || !pass.trim()) { Alert.alert(t('common_error'), t('login_err_email_pass_required')); return; }
    if (isSignup) {
      if (pass.length < 6) { Alert.alert(t('common_error'), t('login_err_pass_too_short')); return; }
      if (pass !== pass2) { Alert.alert(t('common_error'), t('login_err_pass_mismatch')); return; }
    }
    setLoading(true);
    if (isSignup) {
      supabase.auth.signUp({ email: email.trim(), password: pass, options: { data: { role: role } } }).then(function(r) {
        setLoading(false);
        if (r.error) { Alert.alert(t('common_error'), r.error.message); return; }
        if (r.data.session) {
          // G�n�rer un code parrain unique pour ce nouvel utilisateur
          track('signup_completed', { role: role, has_referral: !!referralInput.trim() });
          identify(r.data.session.user.id, { email: email.trim(), role: role, method: 'email' });
          var myReferralCode = 'MHK-' + r.data.session.user.id.substring(0, 6).toUpperCase();
          var profileData = { id: r.data.session.user.id, email: email.trim(), role: role, referral_code: myReferralCode };

          // Si un code parrain a �t� entr�, appliquer le parrainage
          if (referralInput.trim()) {
            profileData.referred_by = referralInput.trim().toUpperCase();
          }

          supabase.from('profiles').upsert(profileData, { onConflict: 'id' }).then(function() {
            // Traiter le parrainage si code entr�
            if (referralInput.trim()) {
              var code = referralInput.trim().toUpperCase();
              // V�rifier que ce filleul n'a pas d�j� �t� parrain�
              supabase.from('referrals').select('id').eq('referred_email', email.trim()).then(function(existing) {
                if (existing.data && existing.data.length > 0) {
                  Alert.alert(t('login_referral_title'), t('login_err_referral_already_used'));
                  return;
                }
                if (code === profileData.referral_code) {
                  Alert.alert(t('common_error'), t('login_err_referral_own_code'));
                  return;
                }
                supabase.from('profiles').select('id, email, trial_ends_at').eq('referral_code', code).single().then(function(ref) {
                if (ref.data) {
                  // Anti-fraude : max 10 parrainages par parrain
                  supabase.from('referrals').select('id', { count: 'exact' }).eq('referrer_id', ref.data.id).then(function(countRes) {
                    if (countRes.count && countRes.count >= 10) {
                      Alert.alert(t('login_err_referral_limit_title'), t('login_err_referral_limit_msg'));
                      return;
                    }
                    // Anti-fraude : bloquer meme domaine pro
                    var pd = ref.data.email.split('@')[1];
                    var fd = email.trim().split('@')[1];
                    var pub = ['gmail.com','yahoo.com','yahoo.fr','hotmail.com','hotmail.fr','outlook.com','outlook.fr','live.com','live.fr','icloud.com','protonmail.com','orange.fr','free.fr','sfr.fr','laposte.net','wanadoo.fr'];
                    if (pd === fd && pub.indexOf(pd) === -1) {
                      Alert.alert(t('login_err_invalid_code_title'), t('login_err_same_domain'));
                      return;
                    }
                    // +7 jours au parrain
                    var parrainTrialEnd = ref.data.trial_ends_at ? new Date(ref.data.trial_ends_at) : new Date();
                    if (parrainTrialEnd < new Date()) parrainTrialEnd = new Date();
                    parrainTrialEnd.setDate(parrainTrialEnd.getDate() + 7);
                    supabase.from('profiles').update({
                      trial_ends_at: parrainTrialEnd.toISOString(),
                      subscription_plan: 'trial',
                      trial_email_j7_sent: false, trial_email_j1_sent: false, trial_email_end_sent: false,
                    }).eq('id', ref.data.id).then(function() {});
                    // +7 jours au filleul (37 jours total)
                    var filleulEnd = new Date(Date.now() + 37 * 24 * 3600 * 1000);
                    supabase.from('profiles').update({ trial_ends_at: filleulEnd.toISOString() }).eq('id', r.data.session.user.id).then(function() {});
                    // Enregistrer
                    supabase.from('referrals').insert({ referrer_id: ref.data.id, referred_email: email.trim(), referred_id: r.data.session.user.id, referral_code: code, status: 'completed', reward_applied: true }).then(function() {});
                    // Email parrain (garde en FR : destinataire = parrain, probablement francophone)
                    fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/send-email', {
                      method: 'POST', headers: {'Content-Type':'application/json'},
                      body: JSON.stringify({ to: ref.data.email, subject: 'MyHostKit  Parrainage reussi ! +7 jours gratuits', body: 'Felicitations !\n\n' + email.trim() + ' s\'est inscrit avec votre code parrain ' + code + '.\n\nVous beneficiez de 7 jours gratuits supplementaires.\n\nVotre essai se termine le ' + parrainTrialEnd.toLocaleDateString('fr-FR') + '.\n\n L\'equipe MyHostKit' }),
                    });
                    Alert.alert(t('login_referral_applied_title'), t('login_referral_applied_msg'));
                  }); // fin count
                }
              });
              }); // fin check referrals existants
            }
          });
          props.onLogin(r.data.session, role);
        }
        else { Alert.alert(t('login_account_created_title'), t('login_account_created_msg')); setIsSignup(false); }
      });
    } else {
      supabase.auth.signInWithPassword({ email: email.trim(), password: pass }).then(function(r) {
        setLoading(false);
        if (r.error) { Alert.alert(t('common_error'), r.error.message); return; }
        // Lire le profil pour v�rifier admin
        supabase.from('profiles').select('role,subscription_plan').eq('id', r.data.session.user.id).single().then(function(pr) {
          var finalRole = role; // utiliser le rle choisi dans le formulaire
          // Admin : toujours forcer admin
          if (pr.data && pr.data.role === 'admin') {
            finalRole = 'admin';
          } else {
            // Mettre � jour le r�le en base avec celui choisi au login
            // LOGIN-ROLE-FIX : ligne desactivee (causait inversion role)
          }
          // Si le profil n'existe pas, le cr�er
          if (!pr.data) {
            supabase.from('profiles').upsert({ id: r.data.session.user.id, email: email.trim(), role: role }, { onConflict: 'id' }).then(function() {});
          }
          track('login_success', { role: finalRole });
          identify(r.data.session.user.id, { email: email.trim(), role: finalRole, plan: (pr.data && pr.data.subscription_plan) || 'free' });
          props.onLogin(r.data.session, finalRole);
        });
      });
    }
  }

  function handleGuestAccess() {
    if (!guestCode.trim()) { Alert.alert(t('common_error'), t('login_err_guest_code_required')); return; }
    setLoading(true);
    supabase.from('properties').select('*').eq('guest_token', guestCode.trim()).single().then(function(r) {
      setLoading(false);
      if (!r.data) { Alert.alert(t('login_err_invalid_code_title'), t('login_err_code_not_found')); return; }
      // V�rifier que le logement n'est pas gel� (hors limite du plan de l'h�te)
      supabase.from('properties').select('id').eq('user_id', r.data.user_id).order('created_at', { ascending: true }).then(function(allProps) {
        if (allProps.data) {
          supabase.from('profiles').select('subscription_plan').eq('id', r.data.user_id).single().then(function(hp) {
            var plan = hp.data ? hp.data.subscription_plan || 'free' : 'free';
            var maxP = plan === 'pro' || plan === 'trial' ? 999 : plan === 'starter' ? 3 : 1;
            var propIndex = allProps.data.findIndex(function(p) { return p.id === r.data.id; });
            if (propIndex >= maxP) {
              Alert.alert(t('login_err_property_unavailable_title'), t('login_err_property_inactive'));
              return;
            }
            var fakeSession = { user: { id: 'guest-' + r.data.id, email: 'guest@myhostkit.com' }, guestProperty: r.data };
            track('guest_access', { property_id: r.data.id });
            props.onLogin(fakeSession, 'guest');
          });
        } else {
          var fakeSession = { user: { id: 'guest-' + r.data.id, email: 'guest@myhostkit.com' }, guestProperty: r.data };
          props.onLogin(fakeSession, 'guest');
        }
      });
    });
  }

  var roles = [
    { key: 'host', emoji: '🏠', label: t('role_host') },
    { key: 'cleaner', emoji: '🧹', label: t('role_cleaner') },
    { key: 'guest', emoji: '🧳', label: t('role_guest') },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={s.logo}>🏠</Text>
          <Text style={s.title}>MyHostKit</Text>
          <Text style={s.sub}>{t('login_subtitle')}</Text>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
            <TouchableOpacity style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: curLang === 'fr' ? T.accent : T.card, borderWidth: 2, borderColor: curLang === 'fr' ? T.accent : T.border, alignItems: 'center' }} onPress={function() { setLang('fr'); }}>
              <Text style={{ fontSize: 22, marginBottom: 2 }}>🇫🇷</Text>
              <Text style={{ color: curLang === 'fr' ? '#fff' : T.text, fontWeight: '700', fontSize: 13 }}>Français</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: curLang === 'en' ? T.accent : T.card, borderWidth: 2, borderColor: curLang === 'en' ? T.accent : T.border, alignItems: 'center' }} onPress={function() { setLang('en'); }}>
              <Text style={{ fontSize: 22, marginBottom: 2 }}>🇬🇧</Text>
              <Text style={{ color: curLang === 'en' ? '#fff' : T.text, fontWeight: '700', fontSize: 13 }}>English</Text>
            </TouchableOpacity>
          </View>

          <View style={s.roleRow}>
            {roles.map(function(r) {
              var active = role === r.key;
              return (
                <TouchableOpacity key={r.key} style={[s.rolePill, active && s.rolePillActive]} onPress={function() { setRole(r.key); }}>
                  <Text style={s.roleEmoji}>{r.emoji}</Text>
                  <Text style={[s.roleLabel, active && { color: '#fff' }]}>{r.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {role === 'guest' ? (
            <View style={s.formCard}>
              <Text style={s.formTitle}>{t('login_guest_access_title')}</Text>
              <TextInput style={s.input} placeholder={t('login_guest_code_placeholder')} placeholderTextColor={T.muted} value={guestCode} onChangeText={setGuestCode} autoCapitalize="characters" />
              <TouchableOpacity style={s.btn} onPress={handleGuestAccess} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnT}>{t('login_guest_access_btn')}</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.formCard}>
              <Text style={s.formTitle}>{isSignup ? t('login_form_title_signup') : t('login_form_title_signin')}</Text>
              <TextInput style={s.input} placeholder={t('login_email_placeholder')} placeholderTextColor={T.muted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

              <View style={s.passWrap}>
                <TextInput style={s.passInput} placeholder={t('login_password_placeholder')} placeholderTextColor={T.muted} value={pass} onChangeText={setPass} secureTextEntry={!showPass} />
                <TouchableOpacity style={s.eyeBtn} onPress={function(){setShowPass(!showPass);}}>
                  <Text style={s.eyeT}>{showPass ? 'x"' : 'x️'}</Text>
                </TouchableOpacity>
              </View>

              {isSignup && (
                <View style={s.passWrap}>
                  <TextInput style={s.passInput} placeholder={t('login_confirm_password_placeholder')} placeholderTextColor={T.muted} value={pass2} onChangeText={setPass2} secureTextEntry={!showPass2} />
                  <TouchableOpacity style={s.eyeBtn} onPress={function(){setShowPass2(!showPass2);}}>
                    <Text style={s.eyeT}>{showPass2 ? 'x"' : 'x️'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isSignup && (
                <View style={{backgroundColor:'#FFF4E6',borderRadius:12,padding:12,marginBottom:12,borderWidth:1,borderColor:'rgba(200,150,90,0.2)'}}>
                  <Text style={{fontSize:11,fontWeight:'600',color:'#C8965A',marginBottom:6}}>{t('login_referral_label')}</Text>
                  <TextInput style={[s.input,{marginBottom:0,backgroundColor:'#fff'}]} placeholder={t('login_referral_placeholder')} placeholderTextColor={T.muted} value={referralInput} onChangeText={function(txt){setReferralInput(txt.toUpperCase());}} autoCapitalize="characters" />
                  <Text style={{fontSize:10,color:'#8B7355',marginTop:4}}>{t('login_referral_hint')}</Text>
                </View>
              )}

              <TouchableOpacity style={s.btn} onPress={handleAuth} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnT}>{isSignup ? t('login_btn_signup') : t('login_btn_signin')}</Text>}
              </TouchableOpacity>
              {!isSignup && <TouchableOpacity onPress={function() { if(!email.trim()){Alert.alert(t('common_error'),t('login_err_email_first'));return;} supabase.auth.resetPasswordForEmail(email.trim()).then(function(r){if(r.error)Alert.alert(t('common_error'),r.error.message);else Alert.alert(t('login_email_sent_title'),t('login_reset_email_sent',{email: email.trim()}));}); }} style={{marginTop:12,alignItems:'center'}}><Text style={{fontSize:12,color:T.accent,fontWeight:'500'}}>{t('login_forgot_password')}</Text></TouchableOpacity>}
              <TouchableOpacity onPress={function() { setIsSignup(!isSignup); setPass2(''); }} style={s.toggleBtn}>
                <Text style={s.toggleT}>{isSignup ? t('login_toggle_to_signin') : t('login_toggle_to_signup')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  scroll: { padding: 24, alignItems: 'center', paddingTop: 60 },
  logo: { fontSize: 56, marginBottom: 10 },
  title: { fontSize: 28, fontWeight: '700', color: T.accent, marginBottom: 4 },
  sub: { fontSize: 14, color: T.muted, marginBottom: 30 },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  rolePill: { flex: 1, backgroundColor: T.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: T.border },
  rolePillActive: { backgroundColor: T.accent, borderColor: T.accent },
  roleEmoji: { fontSize: 22, marginBottom: 4 },
  roleLabel: { fontSize: 12, fontWeight: '600', color: T.text },
  formCard: { width: '100%', backgroundColor: T.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: T.border },
  formTitle: { fontSize: 17, fontWeight: '600', color: T.text, marginBottom: 16, textAlign: 'center' },
  input: { backgroundColor: T.bg, borderWidth: 1, borderColor: T.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: T.text, marginBottom: 10 },
  passWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.bg, borderWidth: 1, borderColor: T.border, borderRadius: 12, marginBottom: 10 },
  passInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: T.text },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 13 },
  eyeT: { fontSize: 18 },
  btn: { backgroundColor: '#1C5F8A', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  btnT: { color: '#fff', fontSize: 16, fontWeight: '700' },
  toggleBtn: { marginTop: 16, alignItems: 'center' },
  toggleT: { fontSize: 13, color: '#1C5F8A', fontWeight: '500' },
});