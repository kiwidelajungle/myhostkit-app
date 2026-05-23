import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t, useLang } from '../../i18n';

var T = { accent: '#C8965A', dark: '#141414', bg: '#FAFAF8', card: '#FFFFFF', text: '#141414', sub: '#6B6B6B', muted: '#9B9B9B', border: 'rgba(0,0,0,0.06)', blue: '#1C5F8A', success: '#34C759', error: '#FF3B30' };

export default function GuestSettings(props) {
  useLang();
  var p = props.session && props.session.guestProperty ? props.session.guestProperty : null;

  function doCheckout() {
    Alert.alert(t('guest_settings_checkout_alert_title'), t('guest_settings_checkout_alert_msg'), [
      { text: t('guest_settings_btn_cancel') },
      { text: t('guest_settings_checkout_confirm_btn'), onPress: function() {
        var subject = encodeURIComponent('Keyla — Check-out : ' + (p ? p.name : 'Logement'));
        var body = encodeURIComponent('Bonjour,\n\nLe voyageur a confirmé son départ de :\n\n🏠 ' + (p ? p.name : '') + '\n📍 ' + (p ? (p.address||'')+ ' ' + (p.city||'') : '') + '\n📅 ' + new Date().toLocaleDateString('fr-FR') + '\n🕐 ' + new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) + '\n\nLe logement est libre pour le ménage.\n\nCordialement,\nVia Keyla');
        Linking.openURL('mailto:myhostkit.conciergerie@gmail.com?subject=' + subject + '&body=' + body);
        Alert.alert(t('guest_settings_checkout_done_title'), t('guest_settings_checkout_done_msg'));
        if (props.onLogout) props.onLogout();
      }}
    ]);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hdr}><Text style={s.hdrT}>{t('guest_settings_header')}</Text><Text style={s.hdrSub}>✈️ {t('role_guest')}</Text></View>
      <ScrollView style={{flex:1,backgroundColor:T.bg}} contentContainerStyle={{padding:16}}>
        {p && (
          <View style={s.infoCard}>
            <Text style={s.infoTitle}>🏠 {p.name}</Text>
            <Text style={s.infoSub}>{p.address||''}{p.city?', '+p.city:''}</Text>
            <Text style={s.infoSub}>{t('guest_settings_code_label')} {p.guest_token||'—'}</Text>
          </View>
        )}

        <Text style={s.sec}>{t('guest_settings_sec_checkout')}</Text>
        <TouchableOpacity style={s.checkoutBtn} onPress={doCheckout}>
          <Text style={s.checkoutBtnT}>{t('guest_settings_checkout_btn')}</Text>
        </TouchableOpacity>
        <Text style={s.checkoutNote}>{t('guest_settings_checkout_note')}</Text>

        <Text style={s.sec}>{t('guest_settings_sec_support')}</Text>
        <TouchableOpacity style={s.assistBtn} onPress={function(){Linking.openURL('mailto:myhostkit.conciergerie@gmail.com?subject='+encodeURIComponent('Demande voyageur — '+(p?p.name:'')));}}><Text style={s.assistBtnT}>{t('guest_settings_contact_btn')}</Text></TouchableOpacity>

        <Text style={s.sec}>{t('guest_settings_sec_about')}</Text>
        <View style={s.aboutCard}>
          <Text style={s.aboutT}>{t('guest_settings_about_title')}</Text>
          <Text style={s.aboutS}>{t('guest_settings_about_desc')}</Text>
          <Text style={s.aboutS}>contact@myhostkit.com</Text>
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={function(){if(props.onLogout)props.onLogout();}}>
          <Text style={s.logoutBtnT}>{t('guest_settings_logout_btn')}</Text>
        </TouchableOpacity>
        <View style={{height:50}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  safe:{flex:1,backgroundColor:T.dark},hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18,paddingVertical:14,backgroundColor:T.dark},hdrT:{fontSize:18,fontWeight:'600',color:'#fff'},hdrSub:{fontSize:12,color:'rgba(255,255,255,0.5)'},
  infoCard:{backgroundColor:T.card,borderRadius:14,padding:16,borderWidth:1,borderColor:T.border,marginBottom:16},infoTitle:{fontSize:16,fontWeight:'600',color:T.text,marginBottom:4},infoSub:{fontSize:12,color:T.muted,marginTop:2},
  sec:{fontSize:15,fontWeight:'600',color:T.text,marginTop:18,marginBottom:10},
  checkoutBtn:{backgroundColor:T.accent,borderRadius:14,paddingVertical:16,alignItems:'center'},checkoutBtnT:{color:'#fff',fontSize:15,fontWeight:'700'},
  checkoutNote:{fontSize:11,color:T.muted,textAlign:'center',marginTop:8,fontStyle:'italic'},
  assistBtn:{backgroundColor:T.card,borderRadius:14,paddingVertical:14,alignItems:'center',borderWidth:1,borderColor:T.border},assistBtnT:{fontSize:14,fontWeight:'600',color:T.blue},
  aboutCard:{backgroundColor:T.card,borderRadius:14,padding:16,borderWidth:1,borderColor:T.border},aboutT:{fontSize:14,fontWeight:'600',color:T.text,marginBottom:4},aboutS:{fontSize:12,color:T.muted,marginTop:2},
  logoutBtn:{backgroundColor:T.error,borderRadius:14,paddingVertical:16,alignItems:'center',marginTop:24},logoutBtnT:{color:'#fff',fontSize:15,fontWeight:'700'},
});