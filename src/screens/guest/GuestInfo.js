import React from 'react';
import { View, Text, ScrollView, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import T from '../../theme';
import { t, useLang } from '../../i18n';


export default function GuestInfo(props) {
  useLang();
  var property = props.session && props.session.guestProperty ? props.session.guestProperty : null;
  if (!property) return null;

  var contacts = property.contacts ? property.contacts : '';
  var amenities = property.amenities ? property.amenities : '';
  var checkinInstructions = property.checkin_instructions || property.access_info || '';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hdr}><Text style={s.hdrT}>{t('guest_info_header')}</Text></View>
      <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={{ padding: 16 }}>
        {checkinInstructions ? (
          <View style={s.card}><Text style={s.cardTitle}>{t('guest_info_checkin_title')}</Text><Text style={s.cardText}>{checkinInstructions}</Text></View>
        ) : null}
        {amenities ? (
          <View style={s.card}><Text style={s.cardTitle}>{t('guest_info_amenities_title')}</Text><Text style={s.cardText}>{amenities}</Text></View>
        ) : null}
        {contacts ? (
          <View style={s.card}><Text style={s.cardTitle}>{t('guest_info_contacts_title')}</Text><Text style={s.cardText}>{contacts}</Text></View>
        ) : null}
        <View style={s.card}>
          <Text style={s.cardTitle}>{t('guest_info_emergency_title')}</Text>
          <TouchableOpacity onPress={function() { Linking.openURL('tel:15'); }}><Text style={s.emergLink}>{t('guest_info_emergency_samu')}</Text></TouchableOpacity>
          <TouchableOpacity onPress={function() { Linking.openURL('tel:17'); }}><Text style={s.emergLink}>{t('guest_info_emergency_police')}</Text></TouchableOpacity>
          <TouchableOpacity onPress={function() { Linking.openURL('tel:18'); }}><Text style={s.emergLink}>{t('guest_info_emergency_fire')}</Text></TouchableOpacity>
          <TouchableOpacity onPress={function() { Linking.openURL('tel:112'); }}><Text style={s.emergLink}>{t('guest_info_emergency_eu')}</Text></TouchableOpacity>
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.dark },
  hdr: { paddingHorizontal: 18, paddingVertical: 14, backgroundColor: T.dark },
  hdrT: { fontSize: 18, fontWeight: '600', color: '#fff' },
  card: { backgroundColor: T.card, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: T.border },
  cardTitle: { fontSize: 14, fontWeight: '700', color: T.text, marginBottom: 8 },
  cardText: { fontSize: 14, color: T.sub, lineHeight: 22 },
  emergLink: { fontSize: 15, color: '#1C5F8A', fontWeight: '600', paddingVertical: 6 },
});