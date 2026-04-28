import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../config/supabase';
import T from '../theme';
import { t, useLang } from '../i18n';

export default function CompleteProfileScreen(props) {
  useLang();
  var role = props.role;
  var session = props.session;
  var onComplete = props.onComplete;

  var _firstName = useState(''); var firstName = _firstName[0]; var setFirstName = _firstName[1];
  var _lastName = useState(''); var lastName = _lastName[0]; var setLastName = _lastName[1];
  var _phone = useState(''); var phone = _phone[0]; var setPhone = _phone[1];
  var _city = useState(''); var city = _city[0]; var setCity = _city[1];
  var _address = useState(''); var address = _address[0]; var setAddress = _address[1];
  var _siret = useState(''); var siret = _siret[0]; var setSiret = _siret[1];
  var _companyName = useState(''); var companyName = _companyName[0]; var setCompanyName = _companyName[1];
  var _kbisAccepted = useState(false); var kbisAccepted = _kbisAccepted[0]; var setKbisAccepted = _kbisAccepted[1];
  var _kbisUrl = useState(''); var kbisUrl = _kbisUrl[0]; var setKbisUrl = _kbisUrl[1];
  var _saving = useState(false); var saving = _saving[0]; var setSaving = _saving[1];
  var _loading = useState(true); var loading = _loading[0]; var setLoading = _loading[1];

  var isCleaner = role === 'cleaner';

  useEffect(function() {
    if (isCleaner) {
      supabase.from('cleaners').select('*').eq('user_id', session.user.id).maybeSingle().then(function(r) {
        if (r.data) {
          setFirstName(r.data.first_name || ''); setLastName(r.data.last_name || ''); setPhone(r.data.phone || '');
          setCity(r.data.city || ''); setAddress(r.data.address || ''); setSiret(r.data.siret || '');
          setCompanyName(r.data.company_name || ''); setKbisUrl(r.data.kbis_url || '');
        }
        setLoading(false);
      });
    } else {
      supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle().then(function(r) {
        if (r.data) {
          setFirstName(r.data.first_name || ''); setLastName(r.data.last_name || ''); setPhone(r.data.phone || '');
          setCity(r.data.billing_city || ''); setAddress(r.data.billing_address || ''); setSiret(r.data.siret || '');
        }
        setLoading(false);
      });
    }
  }, []);



  async function save() {
    if (!firstName.trim()) { Alert.alert(t('common_error'), t('cprof_err_first')); return; }
    if (!lastName.trim()) { Alert.alert(t('common_error'), t('cprof_err_last')); return; }
    if (!phone.trim()) { Alert.alert(t('common_error'), t('cprof_err_phone')); return; }
    if (!city.trim()) { Alert.alert(t('common_error'), t('cprof_err_city')); return; }
    if (!address.trim()) { Alert.alert(t('common_error'), t('cprof_err_address')); return; }
    if (!siret.trim()) { Alert.alert(t('common_error'), t('cprof_err_siret')); return; }
    if (isCleaner && !companyName.trim()) { Alert.alert(t('common_error'), t('cprof_err_company')); return; }
    
    setSaving(true);
    
    if (isCleaner) {
      var existing = await supabase.from('cleaners').select('id').eq('user_id', session.user.id).maybeSingle();
      var payload = {
        user_id: session.user.id, first_name: firstName.trim(), last_name: lastName.trim(),
        contact_name: firstName.trim() + ' ' + lastName.trim(),
        phone: phone.trim(), city: city.trim(), address: address.trim(), siret: siret.trim(),
        company_name: companyName.trim(), kbis_pending: true, profile_complete: true,
      };
      var saveRes;
      if (existing.data) saveRes = await supabase.from('cleaners').update(payload).eq('user_id', session.user.id);
      else saveRes = await supabase.from('cleaners').insert(payload);
      if (saveRes.error) { Alert.alert('Erreur', saveRes.error.message); setSaving(false); return; }
    }
    var profPayload = {
      first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim(),
      billing_city: city.trim(), billing_address: address.trim(), siret: siret.trim(),
      profile_complete: true,
    };
    if (isCleaner) profPayload.company_name = companyName.trim();
    var pr = await supabase.from('profiles').update(profPayload).eq('id', session.user.id);
    if (pr.error) { Alert.alert('Erreur profile', pr.error.message); setSaving(false); return; }
    setSaving(false);
    Alert.alert(t('cprof_done_title'), t('cprof_done_msg'), [{ text: 'OK', onPress: function() { if (onComplete) onComplete(); } }]);
  }

  if (loading) return <SafeAreaView style={s.safe}><View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator color={T.accent} size="large" /></View></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex:1}}>
        <View style={s.hdr}><Text style={s.hdrT}>{t('cprof_title')}</Text></View>
        <ScrollView contentContainerStyle={{padding:18}} keyboardShouldPersistTaps="handled">
          <Text style={s.intro}>Pour utiliser MyHostKit, merci de completer toutes les informations ci-dessous. Toutes sont obligatoires.</Text>

          <Text style={s.label}>{t('cprof_first_name')}</Text>
          <TextInput style={s.input} value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
          <Text style={s.label}>{t('cprof_last_name')}</Text>
          <TextInput style={s.input} value={lastName} onChangeText={setLastName} autoCapitalize="words" />
          <Text style={s.label}>{t('cprof_phone')}</Text>
          <TextInput style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Text style={s.label}>{t('cprof_city')}</Text>
          <TextInput style={s.input} value={city} onChangeText={setCity} autoCapitalize="words" />
          <Text style={s.label}>{t('cprof_address')}</Text>
          <TextInput style={s.input} value={address} onChangeText={setAddress} />
          <Text style={s.label}>{t('cprof_siret')}</Text>
          <TextInput style={s.input} value={siret} onChangeText={setSiret} keyboardType="numeric" maxLength={14} />

          {isCleaner && <View>
            <Text style={s.label}>{t('cprof_company')}</Text>
            <TextInput style={s.input} value={companyName} onChangeText={setCompanyName} />
          </View>}

          <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnT}>{t('cprof_save')}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  safe: { flex:1, backgroundColor:T.bg },
  hdr: { paddingHorizontal:18, paddingVertical:16, backgroundColor:T.dark },
  hdrT: { fontSize:18, fontWeight:'700', color:'#fff' },
  intro: { fontSize:13, color:T.muted, marginBottom:16, lineHeight:18 },
  label: { fontSize:12, fontWeight:'600', color:T.text, marginTop:12, marginBottom:6 },
  input: { backgroundColor:'#fff', borderWidth:1, borderColor:'#ddd', borderRadius:10, paddingHorizontal:14, paddingVertical:12, fontSize:14, color:T.text },
  fileBtn: { backgroundColor:'#fff', borderWidth:1, borderColor:T.accent, borderRadius:10, paddingVertical:14, paddingHorizontal:14, alignItems:'center' },
  fileBtnT: { fontSize:13, fontWeight:'600', color:T.accent },
  saveBtn: { backgroundColor:T.accent, borderRadius:12, paddingVertical:16, alignItems:'center', marginTop:24, marginBottom:30 },
  saveBtnT: { color:'#fff', fontSize:15, fontWeight:'700' },
});
