import React, { useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, Linking, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../config/supabase';
import { deleteAccountWithConfirmation } from '../../utils/accountManager';
import { t, useLang } from '../../i18n';
import T from '../../theme';


export default function CleanerSettings(props) {
  useLang();
  var _p = useState(null); var profile = _p[0]; var setProfile = _p[1];
  var _editing = useState(false); var editing = _editing[0]; var setEditing = _editing[1];
  var _saving = useState(false); var saving = _saving[0]; var setSaving = _saving[1];
  var _deleting = useState(false); var deleting = _deleting[0]; var setDeleting = _deleting[1];
  
  var _showPaypal = useState(false); var showPaypal = _showPaypal[0]; var setShowPaypal = _showPaypal[1];
  var _cleanerPlan = useState('free'); var cleanerPlan = _cleanerPlan[0]; var setCleanerPlan = _cleanerPlan[1];
  var _avgRating = useState('5.0'); var avgRating = _avgRating[0]; var setAvgRating = _avgRating[1];
  var _myRefCode = useState(''); var myRefCode = _myRefCode[0]; var setMyRefCode = _myRefCode[1];
  var _form = useState({ first_name:'', last_name:'', company_name:'', contact_name:'', email:'', phone:'', city:'', address:'', bio:'', price_per_cleaning:'', billing_address:'', legal_status:'', siret:'' });
  var form = _form[0]; var setForm = _form[1];

  useEffect(function() {
    supabase.from('cleaners').select('*').eq('user_id', props.session.user.id).single().then(function(r) {
      if (r.data) {
        setProfile(r.data);
        setForm({
          first_name: r.data.first_name||'', last_name: r.data.last_name||'',
          company_name: r.data.company_name||'', contact_name: r.data.contact_name||'',
          email: r.data.email||'', phone: r.data.phone||'', city: r.data.city||'',
          address: r.data.address||'', bio: r.data.bio||'',
          price_per_cleaning: r.data.price_per_cleaning ? String(r.data.price_per_cleaning) : '',
          billing_address: r.data.billing_address||'', legal_status: r.data.legal_status||'', siret: r.data.siret||'',
        });
      }
    });
    supabase.from('cleaners').select('id').eq('user_id', props.session.user.id).single().then(function(cr) {
      if (cr.data) {
        supabase.from('reviews').select('rating').eq('reviewed_id', cr.data.id).eq('reviewed_type', 'cleaner').then(function(rv) {
          if (rv.data && rv.data.length > 0) {
            var sum = rv.data.reduce(function(a,b){return a+b.rating;}, 0);
            setAvgRating((sum / rv.data.length).toFixed(1));
          }
        });
      }
    });
  }, []);

  function upd(k,v) { var n={}; for(var x in form) n[x]=form[x]; n[k]=v; setForm(n); }

  function save() {
    if (!form.first_name.trim()||!form.last_name.trim()) { Alert.alert(t('common_error'), t('cleaner_settings_err_firstname_lastname')); return; }
    if (!form.email.trim()||!form.phone.trim()) { Alert.alert(t('common_error'), t('cleaner_settings_err_email_phone')); return; }
    if (!form.billing_address.trim()) { Alert.alert(t('common_error'), t('cleaner_settings_err_billing_address')); return; }
    if (!form.legal_status.trim()) { Alert.alert(t('common_error'), t('cleaner_settings_err_legal_status')); return; }

    var billingOk = !!(form.first_name.trim() && form.last_name.trim() && form.billing_address.trim() && form.legal_status.trim() && form.email.trim() && form.phone.trim());

    setSaving(true);
    supabase.from('cleaners').update({
      first_name: form.first_name.trim(), last_name: form.last_name.trim(),
      company_name: form.company_name.trim(), contact_name: form.contact_name.trim() || (form.first_name.trim() + ' ' + form.last_name.trim()),
      email: form.email.trim(), phone: form.phone.trim(), city: form.city.trim(),
      address: form.address.trim(), bio: form.bio.trim(),
      price_per_cleaning: form.price_per_cleaning ? parseFloat(form.price_per_cleaning) : null,
      billing_address: form.billing_address.trim(), legal_status: form.legal_status.trim(), siret: form.siret.trim(),
      billing_complete: billingOk,
    }).eq('user_id', props.session.user.id).then(function(r) {
      setSaving(false);
      if (r.error) Alert.alert(t('common_error'), r.error.message);
      else { Alert.alert(t('cleaner_settings_profile_updated')); setEditing(false); }
    });
  }

  function getCleanerPlanLabel(p) {
    if (p === 'business') return t('cleaner_plan_label_business');
    if (p === 'pro') return t('cleaner_plan_label_pro');
    if (p === 'trial') return t('cleaner_plan_label_trial');
    return t('cleaner_plan_label_free');
  }

  var billingComplete = profile && profile.billing_complete;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hdr}><Text style={s.hdrT}>{t('cleaner_settings_profile_title')}</Text><Text style={s.hdrSub}>🧹 {t('role_cleaner')}</Text></View>
      <ScrollView style={{flex:1,backgroundColor:T.bg}} contentContainerStyle={{padding:16}} keyboardShouldPersistTaps="handled">
        {!billingComplete && <View style={s.warningCard}><Text style={s.warningT}>{t('cleaner_settings_warning_title')}</Text><Text style={s.warningS}>{t('cleaner_settings_warning_msg')}</Text></View>}

        <Text style={s.secTitle}>{t('cleaner_settings_sec_personal')}</Text>
        <View style={s.formCard}>
          {[{k:'first_name',l:t('cleaner_settings_label_firstname'),p:t('cleaner_settings_ph_firstname')},{k:'last_name',l:t('cleaner_settings_label_lastname'),p:t('cleaner_settings_ph_lastname')},{k:'company_name',l:t('cleaner_settings_label_company'),p:t('cleaner_settings_ph_company')},{k:'email',l:t('cleaner_settings_label_email'),p:t('cleaner_settings_ph_email')},{k:'phone',l:t('cleaner_settings_label_phone'),p:t('cleaner_settings_ph_phone')},{k:'city',l:t('cleaner_settings_label_city'),p:t('cleaner_settings_ph_city')},{k:'price_per_cleaning',l:t('cleaner_settings_label_rate'),p:t('cleaner_settings_ph_rate'),kb:'numeric'}].map(function(f) {
            return <View key={f.k}><Text style={s.label}>{f.l}</Text>{editing ? <TextInput style={s.input} value={form[f.k]} onChangeText={function(v){upd(f.k,v);}} placeholder={f.p} placeholderTextColor={T.muted} keyboardType={f.kb||'default'} /> : <Text style={s.readOnly}>{form[f.k]||'—'}</Text>}</View>;
          })}
        </View>

        <Text style={s.secTitle}>{t('cleaner_settings_sec_billing')}</Text>
        <View style={[s.formCard, !billingComplete && {borderColor:T.error}]}>
          {[{k:'billing_address',l:t('cleaner_settings_label_billing_address'),p:t('cleaner_settings_ph_billing_address')},{k:'legal_status',l:t('cleaner_settings_label_legal_status'),p:t('cleaner_settings_ph_legal_status')},{k:'siret',l:t('cleaner_settings_label_siret'),p:t('cleaner_settings_ph_siret')}].map(function(f) {
            return <View key={f.k}><Text style={s.label}>{f.l}</Text>{editing ? <TextInput style={s.input} value={form[f.k]} onChangeText={function(v){upd(f.k,v);}} placeholder={f.p} placeholderTextColor={T.muted} /> : <Text style={s.readOnly}>{form[f.k]||'—'}</Text>}</View>;
          })}
        </View>

        {editing ? (
          <View style={{flexDirection:'row',gap:10}}>
            <TouchableOpacity style={[s.btn,{flex:1,backgroundColor:T.bg,borderWidth:1,borderColor:T.border}]} onPress={function(){setEditing(false);}}><Text style={[s.btnT,{color:T.sub}]}>{t('cleaner_settings_btn_cancel')}</Text></TouchableOpacity>
            <TouchableOpacity style={[s.btn,{flex:2}]} onPress={save} disabled={saving}>{saving?<ActivityIndicator color="#fff" size="small"/>:<Text style={s.btnT}>{t('cleaner_settings_btn_save')}</Text>}</TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[s.btn,{backgroundColor:T.blue}]} onPress={function(){setEditing(true);}}><Text style={s.btnT}>{t('cleaner_settings_btn_edit')}</Text></TouchableOpacity>
        )}

        <View style={{backgroundColor:'#E8F4FB',borderRadius:14,padding:16,marginBottom:16,borderWidth:1,borderColor:'rgba(28,95,138,0.2)'}}>
          <Text style={{fontSize:15,fontWeight:'700',color:'#1C5F8A',marginBottom:8}}>{t('cleaner_settings_payments_title')}</Text>

          {profile && profile.stripe_account_id ? (
            <View style={{backgroundColor:'#E8F9EE',borderRadius:10,padding:10,borderWidth:1,borderColor:'rgba(52,199,89,0.2)',marginBottom:10}}>
              <Text style={{fontSize:13,fontWeight:'600',color:'#34C759'}}>{t('cleaner_settings_stripe_connected')}</Text>
              <Text style={{fontSize:11,color:'#6B6B6B',marginTop:4}}>{t('cleaner_settings_stripe_connected_desc')}</Text>
            </View>
          ) : (
            <TouchableOpacity style={{backgroundColor:'#635BFF',borderRadius:12,paddingVertical:12,alignItems:'center',marginBottom:10}} onPress={function(){
              fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/manage-subscription',{
                method:'POST', headers:{'Content-Type':'application/json'},
                body:JSON.stringify({action:'connect',cleaner_user_id:props.session.user.id})
              }).then(function(r){return r.json();}).then(function(data){
                if(data.onboarding_url){Linking.openURL(data.onboarding_url);}
                else if(data.error && data.error.indexOf('Connect') !== -1){Alert.alert(t('cleaner_settings_stripe_connect_title'),t('cleaner_settings_stripe_connect_msg'));}
                else{Alert.alert(t('common_error'),data.error||t('cleaner_settings_stripe_contact_support'));}
              }).catch(function(e){Alert.alert(t('cleaner_settings_stripe_network_error'),e.message);});
            }}>
              <Text style={{color:'#fff',fontSize:13,fontWeight:'700'}}>{t('cleaner_settings_stripe_configure')}</Text>
            </TouchableOpacity>
          )}

        </View>

        <View style={{backgroundColor:T.card,borderRadius:14,padding:16,marginBottom:16,borderWidth:1.5,borderColor:cleanerPlan==='business'||cleanerPlan==='trial'?'#C8965A':cleanerPlan==='pro'?'#1C5F8A':T.border}}>
          <Text style={{fontSize:13,fontWeight:'600',color:T.muted,marginBottom:10}}>{t('cleaner_settings_preview_title')}</Text>
          {(cleanerPlan==='business'||cleanerPlan==='trial') && <View style={{position:'absolute',top:0,right:12,backgroundColor:'#9B59B6',paddingHorizontal:8,paddingVertical:2,borderBottomLeftRadius:8,borderBottomRightRadius:8}}><Text style={{color:'#fff',fontSize:9,fontWeight:'700'}}>{t('cleaner_settings_badge_priority')}</Text></View>}
          {cleanerPlan==='pro' && <View style={{position:'absolute',top:0,right:12,backgroundColor:'#1C5F8A',paddingHorizontal:8,paddingVertical:2,borderBottomLeftRadius:8,borderBottomRightRadius:8}}><Text style={{color:'#fff',fontSize:9,fontWeight:'700'}}>{t('cleaner_settings_badge_boost')}</Text></View>}
          <View style={{flexDirection:'row',alignItems:'center',gap:12,marginBottom:10}}>
            <View style={{width:50,height:50,borderRadius:25,backgroundColor:'#E8F4FB',alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:24}}>🧹</Text></View>
            <View style={{flex:1}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
                <Text style={{fontSize:16,fontWeight:'700',color:T.text}}>{profile ? (profile.company_name||profile.contact_name||t('cleaner_settings_preview_your_name')) : t('cleaner_settings_preview_your_name')}</Text>
                {(cleanerPlan==='business'||cleanerPlan==='trial') && <Text style={{fontSize:14,color:'#1C5F8A'}}>✓</Text>}
              </View>
              <Text style={{fontSize:12,color:T.muted}}>{profile ? (profile.city||t('cleaner_settings_preview_your_city')) : t('cleaner_settings_preview_your_city')}</Text>
            </View>
            <Text style={{fontSize:14,fontWeight:'700',color:T.accent}}>{profile ? (profile.price_per_cleaning||'--') : '--'} {t('cleaner_settings_eur_per_hour')}</Text>
          </View>
          <View style={{flexDirection:'row',gap:6,flexWrap:'wrap'}}>
            <View style={{backgroundColor:'#E8FBE8',borderRadius:6,paddingHorizontal:8,paddingVertical:4}}><Text style={{fontSize:10,color:'#34C759',fontWeight:'600'}}>⭐ {avgRating}</Text></View>
            {(cleanerPlan==='business'||cleanerPlan==='trial') && <View style={{backgroundColor:'#E8F4FB',borderRadius:6,paddingHorizontal:8,paddingVertical:4}}><Text style={{fontSize:10,color:'#1C5F8A',fontWeight:'600'}}>{t('cleaner_settings_preview_verified')}</Text></View>}
          </View>
        </View>

        <View style={{backgroundColor:'#F0F7FB',borderRadius:14,padding:16,marginBottom:16,borderWidth:1.5,borderColor:'rgba(28,95,138,0.2)'}}>
          <Text style={{fontSize:15,fontWeight:'700',color:'#1C5F8A',marginBottom:4}}>{t('cleaner_settings_subscription_title')}</Text>
          <Text style={{fontSize:11,color:'#6B6B6B',marginBottom:12}}>{t('cleaner_settings_current_plan_label')} <Text style={{fontWeight:'700',color:cleanerPlan==='business'?'#C8965A':cleanerPlan==='pro'?'#1C5F8A':cleanerPlan==='trial'?'#C8965A':'#141414'}}>{getCleanerPlanLabel(cleanerPlan)}</Text></Text>

          {cleanerPlan==='free' && <View style={{marginBottom:10}}>
            <Text style={{fontSize:12,fontWeight:'600',color:'#1C5F8A',marginBottom:4}}>{t('cleaner_settings_pro_title')}</Text>
            <Text style={{fontSize:10,color:'#6B6B6B',lineHeight:14}}>{t('cleaner_settings_pro_desc')}</Text>
            <TouchableOpacity style={{backgroundColor:'#1C5F8A',borderRadius:8,paddingVertical:10,alignItems:'center',marginTop:6}} onPress={function(){
              fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/manage-subscription',{
                method:'POST',headers:{'Content-Type':'application/json'},
                body:JSON.stringify({action:'create',plan:'cleaner_pro',customer_email:props.session.user.email})
              }).then(function(r){return r.json();}).then(function(data){
                if(data.url){WebBrowser.openBrowserAsync(data.url).then(function(){
                  fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/manage-subscription',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'verify_payment',session_url:data.url})}).then(function(vr){return vr.json();}).then(function(vd){
                    if(vd&&vd.paid){supabase.from('profiles').update({subscription_plan:'pro',subscription_status:'active'}).eq('id',props.session.user.id).then(function(){Alert.alert(t('cleaner_settings_plan_pro_active'));});}
                    else{Alert.alert(t('cleaner_settings_payment_not_finalized_title'),t('cleaner_settings_payment_not_finalized_msg'));}
                  }).catch(function(){Alert.alert(t('cleaner_settings_verification_pending'));});
                });}
                else{Alert.alert(t('cleaner_settings_coming_soon_title'),t('cleaner_settings_coming_soon_msg'));}
              }).catch(function(e){Alert.alert(t('common_error'),e.message);});
            }}><Text style={{color:'#fff',fontSize:12,fontWeight:'700'}}>{t('cleaner_settings_choose_pro')}</Text></TouchableOpacity>
          </View>}

          {cleanerPlan!=='business' && <View>
            <Text style={{fontSize:12,fontWeight:'600',color:'#C8965A',marginBottom:4}}>{t('cleaner_settings_business_title')}</Text>
            <Text style={{fontSize:10,color:'#6B6B6B',lineHeight:14}}>{t('cleaner_settings_business_desc')}</Text>
            <TouchableOpacity style={{backgroundColor:'#C8965A',borderRadius:8,paddingVertical:10,alignItems:'center',marginTop:6}} onPress={function(){
              fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/manage-subscription',{
                method:'POST',headers:{'Content-Type':'application/json'},
                body:JSON.stringify({action:'create',plan:'cleaner_business',customer_email:props.session.user.email})
              }).then(function(r){return r.json();}).then(function(data){
                if(data.url){WebBrowser.openBrowserAsync(data.url).then(function(){
                  fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/manage-subscription',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'verify_payment',session_url:data.url})}).then(function(vr){return vr.json();}).then(function(vd){
                    if(vd&&vd.paid){supabase.from('profiles').update({subscription_plan:'business',subscription_status:'active'}).eq('id',props.session.user.id).then(function(){Alert.alert(t('cleaner_settings_plan_business_active'));});}
                    else{Alert.alert(t('cleaner_settings_payment_not_finalized_title'),t('cleaner_settings_payment_not_finalized_msg'));}
                  }).catch(function(){Alert.alert(t('cleaner_settings_verification_pending'));});
                });}
                else{Alert.alert(t('cleaner_settings_coming_soon_title'),t('cleaner_settings_coming_soon_msg'));}
              }).catch(function(e){Alert.alert(t('common_error'),e.message);});
            }}><Text style={{color:'#fff',fontSize:12,fontWeight:'700'}}>{t('cleaner_settings_choose_business')}</Text></TouchableOpacity>
          </View>}

          {cleanerPlan==='business' && <View style={{backgroundColor:'#FFF4E6',borderRadius:10,padding:10,borderWidth:1,borderColor:'rgba(200,150,90,0.3)'}}>
            <Text style={{fontSize:13,fontWeight:'700',color:'#C8965A'}}>{t('cleaner_settings_business_active_title')}</Text>
            <Text style={{fontSize:11,color:'#6B6B6B',marginTop:4}}>{t('cleaner_settings_business_active_desc')}</Text>
          </View>}
        </View>

        <TouchableOpacity style={{backgroundColor:'#FFF4E6',borderRadius:14,padding:16,marginBottom:16,borderWidth:1.5,borderColor:'rgba(200,150,90,0.3)',flexDirection:'row',alignItems:'center',gap:12}} onPress={function(){
          var code = 'MHK-' + (props.session.user.id || '').substring(0,6).toUpperCase();
          Share.share({ message: t('cleaner_settings_referral_share_msg', { code: code }), title: t('cleaner_settings_referral_share_title') });
        }}>
          <Text style={{fontSize:28}}>🎁</Text>
          <View style={{flex:1}}>
            <Text style={{fontSize:14,fontWeight:'700',color:'#C8965A'}}>{t('cleaner_settings_referral_title')}</Text>
            <Text style={{fontSize:11,color:'#8B7355',marginTop:2}}>{t('cleaner_settings_referral_subtitle')}</Text>
          </View>
          <Text style={{fontSize:16,color:'#C8965A'}}>📤</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.logoutBtn} onPress={props.onLogout}><Text style={s.logoutBtnT}>{t('cleaner_settings_btn_logout')}</Text></TouchableOpacity>
        <View style={s.dangerZone}>
          <TouchableOpacity style={s.deleteBtn} disabled={deleting} onPress={function(){setDeleting(true);deleteAccountWithConfirmation(props.session,'cleaner',props.onLogout).then(function(){setDeleting(false);});}}>
            {deleting?<ActivityIndicator color="#fff" size="small"/>:<Text style={s.deleteBtnT}>{t('cleaner_settings_delete_btn')}</Text>}
          </TouchableOpacity>
        </View>
        <View style={{height:50}}/>
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
  safe:{flex:1,backgroundColor:T.dark},hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18,paddingVertical:14,backgroundColor:T.dark},hdrT:{fontSize:18,fontWeight:'600',color:'#fff'},hdrSub:{fontSize:12,color:'rgba(255,255,255,0.5)'},
  warningCard:{backgroundColor:'#FFF3E0',borderRadius:14,padding:14,marginBottom:14,borderWidth:1,borderColor:'#FF9500'},warningT:{fontSize:13,fontWeight:'700',color:'#E65100'},warningS:{fontSize:11,color:'#E65100',marginTop:4},
  secTitle:{fontSize:15,fontWeight:'600',color:T.text,marginBottom:10,marginTop:16},
  formCard:{backgroundColor:T.card,borderRadius:14,padding:14,borderWidth:1,borderColor:T.border,marginBottom:16},
  label:{fontSize:10,fontWeight:'700',color:T.muted,letterSpacing:0.5,marginBottom:4,marginTop:10},
  input:{backgroundColor:T.bg,borderWidth:1,borderColor:T.border,borderRadius:10,paddingHorizontal:12,paddingVertical:10,fontSize:14,color:T.text},
  readOnly:{fontSize:14,color:T.text,paddingVertical:6},
  btn:{backgroundColor:T.accent,borderRadius:12,paddingVertical:14,alignItems:'center',marginBottom:14},btnT:{color:'#fff',fontSize:14,fontWeight:'700'},
  logoutBtn:{backgroundColor:T.card,borderRadius:14,paddingVertical:16,alignItems:'center',borderWidth:1,borderColor:T.border,marginBottom:24},logoutBtnT:{fontSize:15,fontWeight:'600',color:T.blue},
  dangerZone:{backgroundColor:'#FFF5F5',borderRadius:14,padding:14,borderWidth:1,borderColor:'rgba(255,59,48,0.2)'},
  deleteBtn:{backgroundColor:T.error,borderRadius:12,paddingVertical:14,alignItems:'center'},deleteBtnT:{color:'#fff',fontSize:14,fontWeight:'700'},
legalSection:{backgroundColor:T.card,borderRadius:14,marginBottom:16,borderWidth:1,borderColor:T.border,overflow:'hidden'}
,legalSectionTitle:{fontSize:11,fontWeight:'700',color:T.muted,letterSpacing:0.5,paddingHorizontal:16,paddingTop:14,paddingBottom:8,textTransform:'uppercase'}
,legalRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderTopWidth:1,borderTopColor:T.border}
,legalRowT:{fontSize:14,color:T.text,flex:1}
,legalRowArrow:{fontSize:18,color:T.muted}});