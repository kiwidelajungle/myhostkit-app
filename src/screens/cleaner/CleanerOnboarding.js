import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import T from '../../theme';
import { t, useLang } from '../../i18n';


export default function CleanerOnboarding(props) {
  useLang();
  var _l = useState(false); var loading = _l[0]; var setLoading = _l[1];
  var _f = useState({ first_name:'', last_name:'', company_name:'', email:'', phone:'', city:'', address:'', bio:'', price_per_cleaning:'', billing_address:'', legal_status:'', siret:'' });
  var form = _f[0]; var setForm = _f[1];
  function update(k,v) { var n={}; for(var x in form) n[x]=form[x]; n[k]=v; setForm(n); }

  function submit() {
    if (!form.first_name.trim()||!form.last_name.trim()) { Alert.alert(t('common_error'),t('cleaner_onboarding_err_name')); return; }
    if (!form.email.trim()) { Alert.alert(t('common_error'),t('cleaner_onboarding_err_email')); return; }
    if (!form.phone.trim()) { Alert.alert(t('common_error'),t('cleaner_onboarding_err_phone')); return; }
    if (!form.city.trim()) { Alert.alert(t('common_error'),t('cleaner_onboarding_err_city')); return; }
    if (!form.billing_address.trim()) { Alert.alert(t('common_error'),t('cleaner_onboarding_err_billing_address')); return; }
    if (!form.legal_status.trim()) { Alert.alert(t('common_error'),t('cleaner_onboarding_err_legal_status')); return; }
    setLoading(true);
    var contactName = form.first_name.trim() + ' ' + form.last_name.trim();
    props.supabase.from('cleaners').insert({
      user_id: props.session.user.id,
      first_name: form.first_name.trim(), last_name: form.last_name.trim(),
      company_name: form.company_name.trim() || contactName,
      contact_name: contactName,
      email: form.email.trim(), phone: form.phone.trim(), city: form.city.trim(),
      address: form.address.trim(), bio: form.bio.trim(),
      price_per_cleaning: form.price_per_cleaning ? parseFloat(form.price_per_cleaning) : null,
      billing_address: form.billing_address.trim(), legal_status: form.legal_status.trim(), siret: form.siret.trim(),
      billing_complete: true, active: true, verified: false,
    }).then(function(r) {
      setLoading(false);
      if (r.error) { Alert.alert(t('common_error'), r.error.message); return; }
      Alert.alert(t('cleaner_onboarding_success_title'), t('cleaner_onboarding_success_msg'));
      if (props.onComplete) props.onComplete();
    });
  }

  var fields = [
    { k:'first_name', labelKey:'cleaner_onboarding_label_first_name', phKey:'cleaner_onboarding_ph_first_name', secKey:'cleaner_onboarding_sec_identity' },
    { k:'last_name', labelKey:'cleaner_onboarding_label_last_name', phKey:'cleaner_onboarding_ph_last_name' },
    { k:'company_name', labelKey:'cleaner_onboarding_label_company', phKey:'cleaner_onboarding_ph_company' },
    { k:'email', labelKey:'cleaner_onboarding_label_email', phKey:'cleaner_onboarding_ph_email', kb:'email-address' },
    { k:'phone', labelKey:'cleaner_onboarding_label_phone', phKey:'cleaner_onboarding_ph_phone', kb:'phone-pad' },
    { k:'city', labelKey:'cleaner_onboarding_label_city', phKey:'cleaner_onboarding_ph_city', secKey:'cleaner_onboarding_sec_location' },
    { k:'address', labelKey:'cleaner_onboarding_label_address', phKey:'cleaner_onboarding_ph_address' },
    { k:'price_per_cleaning', labelKey:'cleaner_onboarding_label_price', phKey:'cleaner_onboarding_ph_price', kb:'numeric', secKey:'cleaner_onboarding_sec_pricing' },
    { k:'billing_address', labelKey:'cleaner_onboarding_label_billing_address', phKey:'cleaner_onboarding_ph_billing_address', secKey:'cleaner_onboarding_sec_billing' },
    { k:'legal_status', labelKey:'cleaner_onboarding_label_legal_status', phKey:'cleaner_onboarding_ph_legal_status' },
    { k:'siret', labelKey:'cleaner_onboarding_label_siret', phKey:'cleaner_onboarding_ph_siret' },
    { k:'bio', labelKey:'cleaner_onboarding_label_bio', phKey:'cleaner_onboarding_ph_bio', multi:true },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{flex:1}}>
        <ScrollView style={{flex:1,backgroundColor:T.bg}} contentContainerStyle={{padding:20}} keyboardShouldPersistTaps="handled">
          <View style={s.header}><Text style={{fontSize:48,marginBottom:12}}>🧹</Text><Text style={s.title}>{t('cleaner_onboarding_title')}</Text><Text style={s.subtitle}>{t('cleaner_onboarding_subtitle')}</Text></View>
          <View style={s.formCard}>
            {fields.map(function(f) {
              return <View key={f.k}>{f.secKey&&<Text style={s.secTitle}>{t(f.secKey)}</Text>}<Text style={s.label}>{t(f.labelKey)}</Text><TextInput style={[s.input,f.multi&&{height:100,textAlignVertical:'top'}]} placeholder={t(f.phKey)} placeholderTextColor={T.muted} value={form[f.k]} onChangeText={function(v){update(f.k,v);}} keyboardType={f.kb||'default'} autoCapitalize={f.kb==='email-address'?'none':'sentences'} multiline={f.multi} /></View>;
            })}
            <TouchableOpacity style={s.submitBtn} onPress={submit} disabled={loading}>
              {loading?<ActivityIndicator color="#fff"/>:<Text style={s.submitT}>{t('cleaner_onboarding_submit_btn')}</Text>}
            </TouchableOpacity>
          </View>
          <View style={{height:40}}/>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  safe:{flex:1,backgroundColor:T.bg},header:{alignItems:'center',paddingVertical:20},title:{fontSize:24,fontWeight:'700',color:T.text,marginBottom:6},subtitle:{fontSize:14,color:T.sub,textAlign:'center'},
  formCard:{backgroundColor:T.card,borderRadius:16,padding:18,borderWidth:1,borderColor:T.border,marginBottom:16},
  secTitle:{fontSize:15,fontWeight:'600',color:T.text,marginBottom:8,marginTop:16},
  label:{fontSize:11,fontWeight:'700',color:T.muted,marginBottom:6,marginTop:12,letterSpacing:0.5},
  input:{backgroundColor:T.bg,borderWidth:1,borderColor:T.border,borderRadius:12,paddingHorizontal:14,paddingVertical:12,fontSize:15,color:T.text},
  submitBtn:{backgroundColor:T.blue,borderRadius:14,paddingVertical:16,alignItems:'center',marginTop:24},submitT:{color:'#fff',fontSize:16,fontWeight:'700'},
});