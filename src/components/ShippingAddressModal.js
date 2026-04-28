import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import T from '../theme';
import { t, useLang } from '../i18n';

export default function ShippingAddressModal(props) {
  useLang();
  var _name = useState(''); var name = _name[0]; var setName = _name[1];
  var _address = useState(''); var address = _address[0]; var setAddress = _address[1];
  var _postalCode = useState(''); var postalCode = _postalCode[0]; var setPostalCode = _postalCode[1];
  var _city = useState(''); var city = _city[0]; var setCity = _city[1];
  var _phone = useState(''); var phone = _phone[0]; var setPhone = _phone[1];

  useEffect(function() {
    if (props.visible && props.prefill) {
      setName(props.prefill.name || '');
      setAddress(props.prefill.address || '');
      setPostalCode(props.prefill.postalCode || '');
      setCity(props.prefill.city || '');
      setPhone(props.prefill.phone || '');
    }
  }, [props.visible]);

  function validate() {
    if (!name.trim()) { Alert.alert(t('common_error'), t('ship_err_name')); return; }
    if (!address.trim()) { Alert.alert(t('common_error'), t('ship_err_address')); return; }
    if (!postalCode.trim()) { Alert.alert(t('common_error'), t('ship_err_postal')); return; }
    if (!city.trim()) { Alert.alert(t('common_error'), t('ship_err_city')); return; }
    if (!phone.trim()) { Alert.alert(t('common_error'), t('ship_err_phone')); return; }
    if (props.onConfirm) props.onConfirm({ name: name.trim(), address: address.trim(), postalCode: postalCode.trim(), city: city.trim(), phone: phone.trim() });
  }

  return (
    <Modal visible={props.visible} animationType="slide" transparent={true} onRequestClose={props.onClose}>
      <View style={s.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.wrapper}>
          <View style={s.card}>
            <View style={s.header}>
              <Text style={s.title}>{t('ship_title')}</Text>
              <TouchableOpacity onPress={props.onClose} style={s.closeBtn}><Text style={s.closeBtnT}>X</Text></TouchableOpacity>
            </View>
            <ScrollView style={{maxHeight: 500}} contentContainerStyle={{padding: 20}} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {props.recapText ? (
                <View style={s.recap}>
                  <Text style={s.recapText}>{props.recapText}</Text>
                  {props.totalText ? <Text style={s.recapTotal}>{props.totalText}</Text> : null}
                </View>
              ) : null}
              <Text style={s.label}>{t('ship_full_name')}</Text>
              <TextInput style={s.input} placeholder="Jean Dupont" placeholderTextColor="#aaa" value={name} onChangeText={setName} autoCapitalize="words" />
              <Text style={s.label}>{t('ship_address')}</Text>
              <TextInput style={s.input} placeholder="12 rue de la Paix" placeholderTextColor="#aaa" value={address} onChangeText={setAddress} />
              <View style={{flexDirection:'row', gap: 10}}>
                <View style={{flex: 1}}>
                  <Text style={s.label}>{t('ship_postal')}</Text>
                  <TextInput style={s.input} placeholder="75001" placeholderTextColor="#aaa" value={postalCode} onChangeText={setPostalCode} keyboardType="numeric" maxLength={10} />
                </View>
                <View style={{flex: 2}}>
                  <Text style={s.label}>{t('ship_city')}</Text>
                  <TextInput style={s.input} placeholder="Paris" placeholderTextColor="#aaa" value={city} onChangeText={setCity} autoCapitalize="words" />
                </View>
              </View>
              <Text style={s.label}>{t('ship_phone')}</Text>
              <TextInput style={s.input} placeholder="06 12 34 56 78" placeholderTextColor="#aaa" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <Text style={s.note}>{t('ship_note')}</Text>
            </ScrollView>
            <View style={s.actions}>
              <TouchableOpacity style={s.btnCancel} onPress={props.onClose}><Text style={s.btnCancelT}>{t('common_cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={s.btnConfirm} onPress={validate}><Text style={s.btnConfirmT}>{t('ship_continue')}</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

var s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  wrapper: { width: '100%' },
  card: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: Platform.OS === 'ios' ? 20 : 10, maxHeight: '92%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 17, fontWeight: '700', color: T.text },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  closeBtnT: { fontSize: 14, fontWeight: '600', color: T.text },
  recap: { backgroundColor: '#F8F8F8', borderRadius: 10, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: T.accent },
  recapText: { fontSize: 12, color: T.muted, lineHeight: 18 },
  recapTotal: { fontSize: 14, fontWeight: '700', color: T.text, marginTop: 6 },
  label: { fontSize: 12, fontWeight: '600', color: T.text, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: T.text },
  note: { fontSize: 11, color: T.muted, marginTop: 14, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' },
  btnCancel: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  btnCancelT: { fontSize: 14, fontWeight: '600', color: T.text },
  btnConfirm: { flex: 2, paddingVertical: 14, borderRadius: 10, backgroundColor: T.accent, alignItems: 'center' },
  btnConfirmT: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
