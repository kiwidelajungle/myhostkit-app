import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showNavigationChoice } from '../../utils/navigation';
import T from '../../theme';
import { t, useLang, getLang } from '../../i18n';

export default function GuestHome(props) {
  useLang();
  var session = props.session;
  var property = session.guestProperty || {};
  var _showIncident = useState(false); var showIncident = _showIncident[0]; var setShowIncident = _showIncident[1];
  var _incidentText = useState(''); var incidentText = _incidentText[0]; var setIncidentText = _incidentText[1];
  var _showGuide = useState(false); var showGuide = _showGuide[0]; var setShowGuide = _showGuide[1];

  function sendIncident() {
    if (!incidentText.trim()) { Alert.alert(t('guest_home_incident_err_title'), t('guest_home_incident_err_msg')); return; }
    var subject = encodeURIComponent('MyHostKit — Incident logement : ' + (property.name || ''));
    var body = encodeURIComponent('Signalement d\'un probleme\n\nLogement : ' + (property.name || '') + '\nAdresse : ' + (property.address || '') + ' ' + (property.city || '') + '\n\nDescription :\n' + incidentText + '\n\nEnvoye via MyHostKit');
    Linking.openURL('mailto:myhostkit.contact@gmail.com?subject=' + subject + '&body=' + body);
    Alert.alert(t('guest_home_incident_sent_title'), t('guest_home_incident_sent_msg'));
    setIncidentText(''); setShowIncident(false);
  }

  function mapsSearch(query) {
    return 'https://www.google.com/maps/search/' + query + '+near+' + encodeURIComponent((property.address || '') + ' ' + (property.city || ''));
  }
  function guideQueries() {
    var en = getLang() === 'en';
    return {
      restaurants: en ? 'restaurants' : 'restaurants',
      supermarkets: en ? 'supermarket' : 'supermarche',
      pharmacies: en ? 'pharmacy' : 'pharmacie',
      tourist: en ? 'tourist+attractions' : 'tourisme',
    };
  }

  if (!property.name) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.hdr}><Text style={s.hdrT}>MyHostKit</Text></View>
        <View style={{ flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
          <Text style={{ fontSize: 50, marginBottom: 16 }}>🏠</Text>
          <Text style={{ fontSize: 18, fontWeight: '600', color: T.text, marginBottom: 8 }}>{t('guest_home_no_prop_title')}</Text>
          <Text style={{ fontSize: 14, color: T.muted, textAlign: 'center', lineHeight: 22 }}>{t('guest_home_no_prop_msg')}</Text>
          {props.onLogout && <TouchableOpacity style={s.logoutBtn} onPress={props.onLogout}><Text style={s.logoutBtnT}>{t('guest_home_btn_back_login')}</Text></TouchableOpacity>}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hdr}>
        <View><Text style={s.hdrT}>{property.name}</Text><Text style={s.hdrSub}>{t('guest_home_role_label')}</Text></View>
      </View>
      <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={{ padding: 16 }}>
        <View style={s.welcomeCard}>
          <Text style={s.welcomeEmoji}>👋</Text>
          <Text style={s.welcomeName}>{t('guest_home_welcome')}</Text>
          {property.address && <Text style={s.welcomeAddr}>📍 {property.address}{property.city ? ', ' + property.city : ''}</Text>}
          {property.welcome_message && <Text style={s.welcomeMsg}>{property.welcome_message}</Text>}
        </View>

        {(property.address || property.city || property.latitude) && (
          <TouchableOpacity style={{backgroundColor:'#F0F7FB',borderRadius:14,padding:14,marginBottom:14,flexDirection:'row',alignItems:'center',gap:12,borderWidth:1.5,borderColor:'rgba(28,95,138,0.2)'}} onPress={function(){ showNavigationChoice((property.address||'') + (property.city ? ', ' + property.city : ''), property.latitude, property.longitude); }}>
            <View style={{width:48,height:48,backgroundColor:'#1C5F8A',borderRadius:24,alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:22}}>🗺️</Text>
            </View>
            <View style={{flex:1}}>
              <Text style={{fontSize:14,fontWeight:'700',color:'#1C5F8A'}}>{property.latitude ? t('guest_home_gps_title_accurate') : t('guest_home_gps_title')}</Text>
              <Text style={{fontSize:11,color:'#6B6B6B',marginTop:2}}>{t('guest_home_gps_apps')}</Text>
            </View>
            <Text style={{fontSize:20,color:'#1C5F8A'}}>›</Text>
          </TouchableOpacity>
        )}

        {property.wifi_name && (
          <View style={s.infoCard}><Text style={s.infoEmoji}>📶</Text><View style={{ flex: 1 }}><Text style={s.infoLabel}>{t('guest_home_info_wifi_label')}</Text><Text style={s.infoValue}>{property.wifi_name}</Text><Text style={s.infoSub}>{t('guest_home_info_wifi_pw', { password: property.wifi_password || '—' })}</Text></View></View>
        )}
        {(property.checkin || property.check_in_time) && (
          <View style={s.infoCard}><Text style={s.infoEmoji}>🕐</Text><View style={{ flex: 1 }}><Text style={s.infoLabel}>{t('guest_home_info_hours_label')}</Text><Text style={s.infoValue}>{t('guest_home_info_hours_value', { checkin: property.checkin || property.check_in_time, checkout: property.checkout || property.check_out_time })}</Text></View></View>
        )}
        {property.access_code && (
          <View style={s.infoCard}><Text style={s.infoEmoji}>🔑</Text><View style={{ flex: 1 }}><Text style={s.infoLabel}>{t('guest_home_info_access_label')}</Text><Text style={s.infoValue}>{property.access_code}</Text>{property.access_info && <Text style={s.infoSub}>{property.access_info}</Text>}</View></View>
        )}
        {property.contacts && (
          <View style={s.infoCard}><Text style={s.infoEmoji}>📞</Text><View style={{ flex: 1 }}><Text style={s.infoLabel}>{t('guest_home_info_contact_label')}</Text><Text style={s.infoValue}>{property.contacts}</Text></View>
            <TouchableOpacity style={s.callBtn} onPress={function() { Linking.openURL('tel:' + property.contacts.replace(/\s/g, '')); }}><Text style={s.callBtnT}>{t('guest_home_info_call_btn')}</Text></TouchableOpacity>
          </View>
        )}
        {property.rules && (
          <View style={s.infoCard}><Text style={s.infoEmoji}>📜</Text><View style={{ flex: 1 }}><Text style={s.infoLabel}>{t('guest_home_info_rules_label')}</Text><Text style={s.infoValue}>{property.rules}</Text></View></View>
        )}
        {property.amenities && (
          <View style={s.infoCard}><Text style={s.infoEmoji}>✨</Text><View style={{ flex: 1 }}><Text style={s.infoLabel}>{t('guest_home_info_amenities_label')}</Text><Text style={s.infoValue}>{property.amenities}</Text></View></View>
        )}

        <TouchableOpacity style={s.guideBtn} onPress={function() { setShowGuide(!showGuide); }}>
          <Text style={s.guideBtnT}>{showGuide ? t('guest_home_guide_btn_close') : t('guest_home_guide_btn_open')}</Text>
        </TouchableOpacity>
        {showGuide && (
          <View style={s.guideCard}>
            <Text style={s.guideTitle}>{t('guest_home_guide_title')}</Text>
            <Text style={s.guideText}>📍 {property.city || t('guest_home_guide_city_fallback')}</Text>
            <TouchableOpacity style={s.guideLink} onPress={function() { Linking.openURL(mapsSearch(guideQueries().restaurants)); }}>
              <Text style={s.guideLinkT}>{t('guest_home_guide_restaurants')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.guideLink} onPress={function() { Linking.openURL(mapsSearch(guideQueries().supermarkets)); }}>
              <Text style={s.guideLinkT}>{t('guest_home_guide_supermarkets')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.guideLink} onPress={function() { Linking.openURL(mapsSearch(guideQueries().pharmacies)); }}>
              <Text style={s.guideLinkT}>{t('guest_home_guide_pharmacies')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.guideLink} onPress={function() { Linking.openURL(mapsSearch(guideQueries().tourist)); }}>
              <Text style={s.guideLinkT}>{t('guest_home_guide_tourist')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={s.incidentBtn} onPress={function() { setShowIncident(!showIncident); }}>
          <Text style={s.incidentBtnT}>{showIncident ? t('guest_home_incident_btn_close') : t('guest_home_incident_btn_open')}</Text>
        </TouchableOpacity>
        {showIncident && (
          <View style={s.incidentCard}>
            <Text style={s.incidentTitle}>{t('guest_home_incident_title')}</Text>
            <TextInput style={s.incidentInput} placeholder={t('guest_home_incident_placeholder')} placeholderTextColor={T.muted} value={incidentText} onChangeText={setIncidentText} multiline autoCorrect={true} />
            <TouchableOpacity style={s.incidentSend} onPress={sendIncident}><Text style={s.incidentSendT}>{t('guest_home_incident_send_btn')}</Text></TouchableOpacity>
          </View>
        )}

        {props.onLogout && <TouchableOpacity style={s.logoutBtn} onPress={props.onLogout}><Text style={s.logoutBtnT}>{t('guest_home_logout_btn')}</Text></TouchableOpacity>}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.dark },
  hdr: { paddingHorizontal: 18, paddingVertical: 14, backgroundColor: T.dark },
  hdrT: { fontSize: 18, fontWeight: '600', color: '#fff' }, hdrSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  welcomeCard: { backgroundColor: T.card, borderRadius: 18, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: T.border, marginBottom: 14 },
  welcomeEmoji: { fontSize: 44, marginBottom: 10 },
  welcomeName: { fontSize: 20, fontWeight: '700', color: T.text, marginBottom: 4 },
  welcomeAddr: { fontSize: 13, color: T.muted, marginBottom: 10 },
  welcomeMsg: { fontSize: 14, color: T.sub, lineHeight: 22, textAlign: 'center', marginTop: 6, fontStyle: 'italic' },
  infoCard: { backgroundColor: T.card, borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderColor: T.border },
  infoEmoji: { fontSize: 22, marginTop: 2 },
  infoLabel: { fontSize: 11, fontWeight: '700', color: T.muted, letterSpacing: 0.5, marginBottom: 4 },
  infoValue: { fontSize: 15, fontWeight: '500', color: T.text, lineHeight: 22 },
  infoSub: { fontSize: 12, color: T.muted, marginTop: 2 },
  callBtn: { backgroundColor: T.blue, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }, callBtnT: { color: '#fff', fontSize: 12, fontWeight: '700' },
  guideBtn: { backgroundColor: T.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: T.blue, marginBottom: 8, marginTop: 8 }, guideBtnT: { fontSize: 14, fontWeight: '600', color: T.blue },
  guideCard: { backgroundColor: T.card, borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: T.border },
  guideTitle: { fontSize: 15, fontWeight: '700', color: T.text, marginBottom: 12 },
  guideText: { fontSize: 13, color: T.muted, marginBottom: 12 },
  guideLink: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.border },
  guideLinkT: { fontSize: 14, color: T.blue, fontWeight: '500' },
  incidentBtn: { backgroundColor: T.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#FF9500', marginBottom: 8 }, incidentBtnT: { fontSize: 14, fontWeight: '600', color: '#FF9500' },
  incidentCard: { backgroundColor: '#FFF8F0', borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#FF9500' },
  incidentTitle: { fontSize: 15, fontWeight: '700', color: '#E65100', marginBottom: 12 },
  incidentInput: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: T.text, minHeight: 80, textAlignVertical: 'top', marginBottom: 12 },
  incidentSend: { backgroundColor: '#FF9500', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }, incidentSendT: { color: '#fff', fontSize: 14, fontWeight: '700' },
  logoutBtn: { backgroundColor: T.blue, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 16 }, logoutBtnT: { color: '#fff', fontSize: 14, fontWeight: '700' },
});