import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SUPABASE_ANON, EDGE_URL } from '../../config/supabase';
import T from '../../theme';
import { t, useLang } from '../../i18n';


export default function GuestChat(props) {
  useLang();
  var property = props.session && props.session.guestProperty ? props.session.guestProperty : null;
  var _msgs = useState([]); var msgs = _msgs[0]; var setMsgs = _msgs[1];
  var _input = useState(''); var input = _input[0]; var setInput = _input[1];
  var _loading = useState(false); var loading = _loading[0]; var setLoading = _loading[1];

  function send() {
    var msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    var newMsgs = msgs.concat([{ role: 'user', text: msg }]);
    setMsgs(newMsgs);
    setLoading(true);

    var propName = property ? property.name : t('guest_chat_fallback_property');
    var propAddress = property ? (property.address || '') : t('guest_chat_fallback_no_address');
    var propCity = property ? (property.city || '') : '';
    var propWifiName = property ? (property.wifi_name || '?') : '?';
    var propWifiPass = property ? (property.wifi_password || '?') : '?';
    var propAccessCode = property ? (property.access_code || t('guest_chat_fallback_no_access_code')) : '?';
    var propAccessInfo = property ? (property.access_info || t('guest_chat_fallback_no_access_info')) : '';
    var propCheckin = property ? (property.check_in_time || property.checkin || '15:00') : '15:00';
    var propCheckout = property ? (property.check_out_time || property.checkout || '11:00') : '11:00';
    var propRules = property ? (property.rules || t('guest_chat_fallback_no_rules')) : '';
    var propAmenities = property ? (property.amenities || t('guest_chat_fallback_no_amenities')) : '';
    var propContact = property ? (property.contacts || t('guest_chat_fallback_contact_app')) : '';
    var propWelcome = property ? (property.welcome_message || '') : '';

    var sp = t('guest_chat_sp_intro', { property: propName }) + ' ' +
      t('guest_chat_sp_style') + ' ' +
      t('guest_chat_sp_info_header') + '\n' +
      t('guest_chat_sp_info_address', { address: propAddress, city: propCity }) + '\n' +
      t('guest_chat_sp_info_wifi', { name: propWifiName, password: propWifiPass }) + '\n' +
      t('guest_chat_sp_info_access_code', { code: propAccessCode }) + '\n' +
      t('guest_chat_sp_info_access_instr', { info: propAccessInfo }) + '\n' +
      t('guest_chat_sp_info_times', { checkin: propCheckin, checkout: propCheckout }) + '\n' +
      t('guest_chat_sp_info_rules', { rules: propRules }) + '\n' +
      t('guest_chat_sp_info_amenities', { amenities: propAmenities }) + '\n' +
      t('guest_chat_sp_info_contact', { contact: propContact }) + '\n' +
      t('guest_chat_sp_info_welcome', { message: propWelcome }) + '\n\n' +
      t('guest_chat_sp_help_header') + '\n' +
      t('guest_chat_sp_help_1') + '\n' +
      t('guest_chat_sp_help_2') + '\n' +
      t('guest_chat_sp_help_3') + '\n' +
      t('guest_chat_sp_help_4') + '\n' +
      t('guest_chat_sp_help_5') + '\n' +
      t('guest_chat_sp_urgent') + '\n' +
      t('guest_chat_sp_identity');

    fetch(EDGE_URL + '/ai-concierge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON },
      body: JSON.stringify({ message: msg, systemPrompt: sp })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      setLoading(false);
      setMsgs(newMsgs.concat([{ role: 'ai', text: d.response || d.reply || t('guest_chat_err_unavailable') }]));
    })
    .catch(function() {
      setLoading(false);
      setMsgs(newMsgs.concat([{ role: 'ai', text: t('guest_chat_err_service') }]));
    });
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex:1}} keyboardVerticalOffset={0}>
      <View style={s.hdr}><Text style={s.hdrT}>{t('guest_chat_header')}</Text><Text style={s.hdrSub}>{t('guest_chat_header_sub')}</Text></View>
      <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 8 }}>
        {msgs.length === 0 && (
          <View style={s.empty}><Text style={{ fontSize: 36, marginBottom: 10 }}>🤖</Text><Text style={s.emptyT}>{t('guest_chat_empty_title')}</Text><Text style={s.emptyS}>{t('guest_chat_empty_subtitle')}</Text>
            <View style={{marginTop:16,gap:8,width:'100%'}}>
              <TouchableOpacity style={s.sugBtn} onPress={function(){setInput(t('guest_chat_sug_wifi_q'));}}><Text style={s.sugBtnT}>{t('guest_chat_sug_wifi_label')}</Text></TouchableOpacity>
              <TouchableOpacity style={s.sugBtn} onPress={function(){setInput(t('guest_chat_sug_restaurants_q'));}}><Text style={s.sugBtnT}>{t('guest_chat_sug_restaurants_label')}</Text></TouchableOpacity>
              <TouchableOpacity style={s.sugBtn} onPress={function(){setInput(t('guest_chat_sug_checkout_q'));}}><Text style={s.sugBtnT}>{t('guest_chat_sug_checkout_label')}</Text></TouchableOpacity>
              <TouchableOpacity style={s.sugBtn} onPress={function(){setInput(t('guest_chat_sug_supermarket_q'));}}><Text style={s.sugBtnT}>{t('guest_chat_sug_supermarket_label')}</Text></TouchableOpacity>
            </View>
          </View>
        )}
        {msgs.map(function(m, i) {
          var isUser = m.role === 'user';
          return (
            <View key={i} style={[s.bw, isUser && { alignItems: 'flex-end' }]}>
              <View style={[s.bubble, isUser ? s.bUser : s.bAi]}>
                <Text style={[s.bText, isUser && { color: '#fff' }]}>{m.text}</Text>
              </View>
            </View>
          );
        })}
        {loading && <View style={s.bw}><View style={s.bAi}><ActivityIndicator color="#1C5F8A" size="small" /></View></View>}
      </ScrollView>
      <View style={s.iw}>
        <TextInput style={s.inp} placeholder={t('guest_chat_input_placeholder')} placeholderTextColor={T.muted} value={input} onChangeText={setInput} multiline maxLength={500} />
        <TouchableOpacity style={[s.sBtn, (!input.trim() || loading) && { opacity: 0.4 }]} onPress={send} disabled={!input.trim() || loading}>
          <Text style={{ color: '#fff', fontSize: 16 }}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.dark },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, backgroundColor: T.dark },
  hdrT: { fontSize: 18, fontWeight: '600', color: '#fff' }, hdrSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  empty: { alignItems: 'center', paddingVertical: 50 }, emptyT: { fontSize: 20, fontWeight: '600', color: T.text, marginBottom: 6 }, emptyS: { fontSize: 13, color: T.muted, textAlign: 'center', lineHeight: 20 },
  sugBtn: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' }, sugBtnT: { fontSize: 13, color: T.blue, fontWeight: '500' },
  bw: { marginBottom: 10 },
  bubble: { maxWidth: '82%', padding: 12, borderRadius: 18 },
  bUser: { backgroundColor: '#1C5F8A', borderBottomRightRadius: 6, alignSelf: 'flex-end' },
  bAi: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderBottomLeftRadius: 6, alignSelf: 'flex-start', padding: 12, borderRadius: 18 },
  bText: { fontSize: 14, lineHeight: 22, color: T.text },
  iw: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, paddingBottom: 14, gap: 8, alignItems: 'flex-end', backgroundColor: T.card, borderTopWidth: 1, borderTopColor: T.border },
  inp: { flex: 1, borderWidth: 1.5, borderColor: T.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, backgroundColor: T.bg, color: T.text, maxHeight: 100 },
  sBtn: { width: 42, height: 42, backgroundColor: '#1C5F8A', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});