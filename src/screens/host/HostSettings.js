import React, { useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, Linking, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, EDGE_URL, SUPABASE_ANON } from '../../config/supabase';
import { deleteAccountWithConfirmation } from '../../utils/accountManager';
import { t, useLang } from '../../i18n';
import T from '../../theme';
import { track, captureError } from '../../utils/monitoring';

function isPro(p) { return p === 'pro'; }
function isStarter(p) { return p === 'starter'; }
function isPaid(p) { return p === 'starter' || p === 'pro'; }
function getPlanLabel(p) {
  if (p === 'trial') return t('plan_label_trial');
  if (p === 'pro') return t('plan_label_pro');
  if (p === 'starter') return t('plan_label_starter');
  if (p === 'business') return t('plan_label_business');
  return t('plan_label_free');
}

export default function HostSettings(props) {
  useLang();
  var _profile = useState({ first_name: '', last_name: '', phone: '', billing_address: '', billing_city: '', billing_zip: '', company_name: '', siret: '' });
  var profile = _profile[0]; var setProfile = _profile[1];
  var _email = useState(''); var email = _email[0]; var setEmail = _email[1];
  var _userPlan = useState('free'); var userPlan = _userPlan[0]; var setUserPlan = _userPlan[1];
  var _myRefCode = useState(''); var myRefCode = _myRefCode[0]; var setMyRefCode = _myRefCode[1];
  var _editing = useState(false); var editing = _editing[0]; var setEditing = _editing[1];
  var _saving = useState(false); var saving = _saving[0]; var setSaving = _saving[1];
  var _deleting = useState(false); var deleting = _deleting[0]; var setDeleting = _deleting[1];

  useEffect(function() {
    setEmail(props.session.user.email || '');
    supabase.from('profiles').select('*').eq('id', props.session.user.id).single().then(function(r) {
      if (r.data) {
        setProfile({
          first_name: r.data.first_name || '', last_name: r.data.last_name || '',
          phone: r.data.phone || '', billing_address: r.data.billing_address || '',
          billing_city: r.data.billing_city || '', billing_zip: r.data.billing_zip || '',
          company_name: r.data.company_name || '', siret: r.data.siret || '',
        });
      }
    });
    supabase.from('profiles').select('subscription_plan,subscription_status,referral_code').eq('id',props.session.user.id).single().then(function(r){
      if(r.data && (r.data.subscription_status==='active' || r.data.subscription_plan==='trial') && r.data.subscription_plan){setUserPlan(r.data.subscription_plan);}else{setUserPlan('free');}
      if(r.data && r.data.referral_code) setMyRefCode(r.data.referral_code);
    });
  }, []);

  function upd(k, v) { var n = {}; for (var x in profile) n[x] = profile[x]; n[k] = v; setProfile(n); }

  function save() {
    setSaving(true);
    supabase.from('profiles').upsert({ id: props.session.user.id, email: email, ...profile }, { onConflict: 'id' }).then(function(r) {
      setSaving(false);
      if (r.error) Alert.alert(t('common_error'), r.error.message);
      else { Alert.alert(t('host_settings_profile_updated')); setEditing(false); }
    });
  }

  function subscribeToPlan(planName) {
    track('upgrade_clicked', { plan: planName });
    Alert.alert(t('host_settings_stripe_loading_title'), t('host_settings_stripe_loading_msg'));
    supabase.auth.getSession().then(function(sr) {
      var token = sr.data && sr.data.session ? sr.data.session.access_token : null;
      if (!token) { Alert.alert(t('common_error'), t('host_settings_session_expired')); return; }
      var url = 'https://illovwqvszjuasftwkxh.supabase.co/functions/v1/manage-subscription';
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ action: 'create', plan: planName }),
      }).then(function(r) {
        if (!r.ok) { return r.text().then(function(txt) { throw new Error('HTTP ' + r.status + ': ' + txt); }); }
        return r.json();
      }).then(function(data) {
        if (data.url) {
          WebBrowser.openBrowserAsync(data.url).then(function() {
            fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/manage-subscription', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'verify_payment', session_url: data.url }),
            }).then(function(vr) { return vr.json(); }).then(function(vd) {
              if (vd && vd.paid) {
                supabase.from('profiles').update({ subscription_plan: planName, subscription_status: 'active' }).eq('id', props.session.user.id).then(function() {
                  var planLabel = planName.charAt(0).toUpperCase() + planName.slice(1);
                  track('plan_purchased', { plan: planName });
                  Alert.alert(t('host_settings_subscription_active_title'), t('host_settings_subscription_active_msg', { plan: planLabel }));
                  if (typeof loadProfile === 'function') { loadProfile(); }
                });
              } else {
                Alert.alert(t('host_settings_payment_not_finalized_title'), t('host_settings_payment_not_finalized_msg'));
              }
            }).catch(function() {
              Alert.alert(t('host_settings_verification_pending_title'), t('host_settings_verification_pending_msg'));
            });
          });
        } else {
          Alert.alert(t('common_error'), (data.error || t('host_settings_no_url_error')) + '\n\n' + t('host_settings_contact_support'));
        }
      }).catch(function(e) {
        Alert.alert(t('host_settings_network_error_title'), t('host_settings_network_error_msg', { details: e.message }));
      });
    }).catch(function(e) {
      Alert.alert(t('host_settings_session_error_title'), e.message);
    });
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hdr}><Text style={s.hdrT}>{t('host_settings_profile_title')}</Text><Text style={s.hdrSub}>🏠 {t('role_host')}</Text></View>
      <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={s.secTitle}>{t('host_settings_sec_personal')}</Text>
        <View style={s.formCard}>
          <Text style={s.label}>{t('host_settings_label_email')}</Text>
          <Text style={s.readOnly}>{email}</Text>
          {[{ k:'first_name',l:t('host_settings_label_firstname'),p:t('host_settings_ph_firstname') },{ k:'last_name',l:t('host_settings_label_lastname'),p:t('host_settings_ph_lastname') },{ k:'phone',l:t('host_settings_label_phone'),p:t('host_settings_ph_phone') }].map(function(f) {
            return <View key={f.k}><Text style={s.label}>{f.l}</Text>{editing ? <TextInput style={s.input} value={profile[f.k]} onChangeText={function(v){upd(f.k,v);}} placeholder={f.p} placeholderTextColor={T.muted} /> : <Text style={s.readOnly}>{profile[f.k] || '—'}</Text>}</View>;
          })}
        </View>

        <Text style={s.secTitle}>{t('host_settings_sec_billing')}</Text>
        <View style={s.formCard}>
          {[{ k:'company_name',l:t('host_settings_label_company'),p:t('host_settings_ph_company') },{ k:'siret',l:t('host_settings_label_siret'),p:t('host_settings_ph_siret') },{ k:'billing_address',l:t('host_settings_label_address'),p:t('host_settings_ph_address') },{ k:'billing_city',l:t('host_settings_label_city'),p:t('host_settings_ph_city') },{ k:'billing_zip',l:t('host_settings_label_zip'),p:t('host_settings_ph_zip') }].map(function(f) {
            return <View key={f.k}><Text style={s.label}>{f.l}</Text>{editing ? <TextInput style={s.input} value={profile[f.k]} onChangeText={function(v){upd(f.k,v);}} placeholder={f.p} placeholderTextColor={T.muted} /> : <Text style={s.readOnly}>{profile[f.k] || '—'}</Text>}</View>;
          })}
        </View>

        {editing ? (
          <View style={{flexDirection:'row',gap:10}}>
            <TouchableOpacity style={[s.btn,{flex:1,backgroundColor:T.bg,borderWidth:1,borderColor:T.border}]} onPress={function(){setEditing(false);}}><Text style={[s.btnT,{color:T.sub}]}>{t('host_settings_btn_cancel')}</Text></TouchableOpacity>
            <TouchableOpacity style={[s.btn,{flex:2}]} onPress={save} disabled={saving}>{saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnT}>{t('host_settings_btn_save')}</Text>}</TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[s.btn,{backgroundColor:T.blue}]} onPress={function(){setEditing(true);}}><Text style={s.btnT}>{t('host_settings_btn_edit')}</Text></TouchableOpacity>
        )}

        <TouchableOpacity style={{backgroundColor:'#FFF4E6',borderRadius:14,padding:16,marginBottom:16,borderWidth:1.5,borderColor:'rgba(200,150,90,0.3)',flexDirection:'row',alignItems:'center',gap:12}} onPress={function(){
          var code = myRefCode || 'MHK-' + (props.session.user.id || '').substring(0,6).toUpperCase();
          Share.share({ message: t('host_settings_referral_share_msg', { code: code }), title: t('host_settings_referral_share_title') });
        }}>
          <Text style={{fontSize:28}}>👤</Text>
          <View style={{flex:1}}>
            <Text style={{fontSize:14,fontWeight:'700',color:'#C8965A'}}>{t('host_settings_referral_title')}</Text>
            <Text style={{fontSize:11,color:'#8B7355',marginTop:2}}>{t('host_settings_referral_subtitle')}</Text>
          </View>
          <Text style={{fontSize:16,color:'#C8965A'}}>⚙️</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.logoutBtn} onPress={props.onLogout}><Text style={s.logoutBtnT}>{t('host_settings_btn_logout')}</Text></TouchableOpacity>

        <View style={{backgroundColor:'#F0F7FB',borderRadius:14,padding:16,marginBottom:16,borderWidth:1.5,borderColor:'rgba(28,95,138,0.2)'}}>
          <Text style={{fontSize:16,fontWeight:'700',color:'#1C5F8A',marginBottom:4}}>{t('host_settings_subscription_title')}</Text>
          <Text style={{fontSize:12,color:'#6B6B6B',marginBottom:12}}>{t('host_settings_current_plan')} <Text style={{fontWeight:'700',color:isPro(userPlan)?'#34C759':isPaid(userPlan)?'#1C5F8A':'#141414'}}>{getPlanLabel(userPlan)}</Text></Text>

          {isPro(userPlan) && <View style={{backgroundColor:'#E8F9EE',borderRadius:12,padding:14,borderWidth:1,borderColor:'rgba(52,199,89,0.2)'}}>
            <Text style={{fontSize:14,fontWeight:'700',color:'#34C759',marginBottom:4}}>{t('host_settings_pro_active_title')}</Text>
            <Text style={{fontSize:12,color:'#6B6B6B',lineHeight:18}}>{t('host_settings_pro_active_desc')}</Text>
          </View>}

          {isStarter(userPlan) && <View style={{backgroundColor:'#E8F4FB',borderRadius:12,padding:14,borderWidth:1,borderColor:'rgba(28,95,138,0.15)',marginBottom:10}}>
            <Text style={{fontSize:14,fontWeight:'700',color:'#1C5F8A',marginBottom:4}}>{t('host_settings_starter_active_title')}</Text>
            <Text style={{fontSize:12,color:'#6B6B6B',lineHeight:18}}>{t('host_settings_starter_active_desc')}</Text>
          </View>}

          {!isPro(userPlan) && <View style={{backgroundColor:'#fff',borderRadius:12,padding:14,borderWidth:1,borderColor:'rgba(0,0,0,0.06)',marginBottom:10}}>
            <Text style={{fontSize:14,fontWeight:'700',color:'#141414',marginBottom:6}}>{isStarter(userPlan) ? t('host_settings_upgrade_to_pro') : t('host_settings_plans_available')}</Text>

            {!isPaid(userPlan) && <View style={{marginBottom:12}}>
              <Text style={{fontSize:13,fontWeight:'600',color:'#1C5F8A',marginBottom:4}}>{t('host_settings_starter_title')}</Text>
              <Text style={{fontSize:11,color:'#6B6B6B',lineHeight:16}}>{t('host_settings_starter_desc')}</Text>
              <TouchableOpacity style={{backgroundColor:'#1C5F8A',borderRadius:10,paddingVertical:10,alignItems:'center',marginTop:8}} onPress={function(){subscribeToPlan('starter');}}><Text style={{color:'#fff',fontSize:13,fontWeight:'700'}}>{t('host_settings_choose_starter')}</Text></TouchableOpacity>
            </View>}

            <View>
              <Text style={{fontSize:13,fontWeight:'600',color:'#C8965A',marginBottom:4}}>{t('host_settings_pro_title')}</Text>
              <Text style={{fontSize:11,color:'#6B6B6B',lineHeight:16}}>{t('host_settings_pro_desc')}</Text>
              <TouchableOpacity style={{backgroundColor:'#C8965A',borderRadius:10,paddingVertical:10,alignItems:'center',marginTop:8}} onPress={function(){subscribeToPlan('pro');}}><Text style={{color:'#fff',fontSize:13,fontWeight:'700'}}>{t('host_settings_choose_pro')}</Text></TouchableOpacity>
            </View>
          </View>}
        </View>

        <View style={s.dangerZone}>
          <Text style={s.dangerTitle}>{t('host_settings_danger_title')}</Text>
          <TouchableOpacity style={s.deleteBtn} disabled={deleting} onPress={function() { setDeleting(true); deleteAccountWithConfirmation(props.session, 'host', props.onLogout).then(function(){setDeleting(false);}); }}>
            {deleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.deleteBtnT}>{t('host_settings_delete_btn')}</Text>}
          </TouchableOpacity>
        </View>
        <View style={{ height: 50 }} />
          <View style={s.legalSection}>
            <Text style={s.legalSectionTitle}>Informations legales</Text>
            <TouchableOpacity style={s.legalRow} onPress={function(){ Linking.openURL('https://www.myhostkit.com/cgv.html'); }}>
              <Text style={s.legalRowT}>Conditions generales (CGV)</Text>
              <Text style={s.legalRowArrow}>{">"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.legalRow} onPress={function(){ Linking.openURL('https://www.myhostkit.com/privacy.html'); }}>
              <Text style={s.legalRowT}>Politique de confidentialite</Text>
              <Text style={s.legalRowArrow}>{">"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.legalRow} onPress={function(){ Linking.openURL('https://www.myhostkit.com/mentions-legales.html'); }}>
              <Text style={s.legalRowT}>Mentions legales</Text>
              <Text style={s.legalRowArrow}>{">"}</Text>
            </TouchableOpacity>
          </View>
      </ScrollView>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  safe:{flex:1,backgroundColor:T.dark},hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18,paddingVertical:14,backgroundColor:T.dark},
  hdrT:{fontSize:18,fontWeight:'600',color:'#fff'},hdrSub:{fontSize:12,color:'rgba(255,255,255,0.5)'},
  secTitle:{fontSize:15,fontWeight:'600',color:T.text,marginBottom:10,marginTop:16},
  formCard:{backgroundColor:T.card,borderRadius:14,padding:14,borderWidth:1,borderColor:T.border,marginBottom:16},
  label:{fontSize:10,fontWeight:'700',color:T.muted,letterSpacing:0.5,marginBottom:4,marginTop:10},
  input:{backgroundColor:T.bg,borderWidth:1,borderColor:T.border,borderRadius:10,paddingHorizontal:12,paddingVertical:10,fontSize:14,color:T.text},
  readOnly:{fontSize:14,color:T.text,paddingVertical:6},
  btn:{backgroundColor:T.accent,borderRadius:12,paddingVertical:14,alignItems:'center',marginBottom:14},btnT:{color:'#fff',fontSize:14,fontWeight:'700'},
  logoutBtn:{backgroundColor:T.card,borderRadius:14,paddingVertical:16,alignItems:'center',borderWidth:1,borderColor:T.border,marginBottom:24},logoutBtnT:{fontSize:15,fontWeight:'600',color:T.blue},
  dangerZone:{backgroundColor:'#FFF5F5',borderRadius:14,padding:18,borderWidth:1,borderColor:'rgba(255,59,48,0.2)'},
  dangerTitle:{fontSize:14,fontWeight:'700',color:T.error,marginBottom:10},
  deleteBtn:{backgroundColor:T.error,borderRadius:12,paddingVertical:14,alignItems:'center'},deleteBtnT:{color:'#fff',fontSize:14,fontWeight:'700'},
legalSection:{backgroundColor:T.card,borderRadius:14,marginBottom:16,borderWidth:1,borderColor:T.border,overflow:'hidden'}
,legalSectionTitle:{fontSize:11,fontWeight:'700',color:T.muted,letterSpacing:0.5,paddingHorizontal:16,paddingTop:14,paddingBottom:8,textTransform:'uppercase'}
,legalRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderTopWidth:1,borderTopColor:T.border}
,legalRowT:{fontSize:14,color:T.text,flex:1}
,legalRowArrow:{fontSize:18,color:T.muted}});