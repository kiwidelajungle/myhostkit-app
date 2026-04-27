import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../config/supabase';
import { syncIcalForProperty } from '../../utils/icalSync';
import { showNavigationChoice } from '../../utils/navigation';
import { Linking } from 'react-native';
import { getUserPlan, canAddProperty, canUseFeature, isPaid, getLimits } from '../../utils/subscription';
import T from '../../theme';
import { track, captureError } from '../../utils/monitoring';
import { t, useLang } from '../../i18n';

var Location = null;
try { Location = require('expo-location'); } catch(e) { Location = null; }


export default function HostProperties(props) {
  useLang();
  var _list = useState([]); var list = _list[0]; var setList = _list[1];
  var _showAdd = useState(false); var showAdd = _showAdd[0]; var setShowAdd = _showAdd[1];
  var _editingId = useState(null); var editingId = _editingId[0]; var setEditingId = _editingId[1];
  var _form = useState({ name: '', address: '', city: '', type: '', rooms: '', capacity: '', access_code: '', access_info: '', wifi_name: '', wifi_password: '', checkin: '15:00', checkout: '11:00', rules: '', contacts: '', welcome_message: '', ical_url: '', latitude: '', longitude: '' });
  var form = _form[0]; var setForm = _form[1];
  var _loading = useState(false); var loading = _loading[0]; var setLoading = _loading[1];
  var _userPlan = useState('free'); var userPlan = _userPlan[0]; var setUserPlan = _userPlan[1];

  function load() {
    supabase.from('properties').select('*').eq('user_id', props.session.user.id).order('created_at', { ascending: false }).then(function(r) {
      if (r.data) setList(r.data);
    });
  }
  useEffect(function() { load(); getUserPlan(props.session.user.id).then(function(p){setUserPlan(p);}); }, []);

  function update(k, v) { var n = {}; for (var x in form) n[x] = form[x]; n[k] = v; setForm(n); }

  function add() {
    if (!form.name.trim()) { Alert.alert(t('common_error'), t('host_properties_err_name_required')); return; }
    setLoading(true);

    if (editingId) {
      supabase.from('properties').update({
        name: form.name.trim(), address: form.address.trim(), city: form.city.trim(),
        type: form.type, rooms: parseInt(form.rooms) || null, capacity: parseInt(form.capacity) || null,
        access_code: form.access_code.trim(), access_info: form.access_info.trim(),
        wifi_name: form.wifi_name.trim(), wifi_password: form.wifi_password.trim(),
        checkin: form.checkin, checkout: form.checkout, check_in_time: form.checkin, check_out_time: form.checkout,
        rules: form.rules.trim(), contacts: form.contacts.trim(), welcome_message: form.welcome_message.trim(), ical_url: form.ical_url ? form.ical_url.trim() : null, latitude: form.latitude ? parseFloat(form.latitude) : null, longitude: form.longitude ? parseFloat(form.longitude) : null,
      }).eq('id', editingId).then(function(r) {
        setLoading(false);
        if (r.error) { Alert.alert(t('common_error'), r.error.message); return; }
        track('property_edited');
      Alert.alert(t('host_properties_modified_title'), form.name);
        setForm({ name:'',address:'',city:'',type:'',rooms:'',capacity:'',access_code:'',access_info:'',wifi_name:'',wifi_password:'',checkin:'15:00',checkout:'11:00',rules:'',contacts:'',welcome_message:'' });
        setShowAdd(false); setEditingId(null); load();
      });
      return;
    }

    var token = '';
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (var i = 0; i < 6; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));

    supabase.from('properties').insert({
      user_id: props.session.user.id,
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      type: form.type || null,
      rooms: parseInt(form.rooms) || null,
      capacity: parseInt(form.capacity) || null,
      access_code: form.access_code.trim(),
      access_info: form.access_info.trim(),
      wifi_name: form.wifi_name.trim(),
      wifi_password: form.wifi_password.trim(),
      checkin: form.checkin, checkout: form.checkout,
      check_in_time: form.checkin, check_out_time: form.checkout,
      rules: form.rules.trim(),
      contacts: form.contacts.trim(),
      welcome_message: form.welcome_message.trim(), ical_url: form.ical_url ? form.ical_url.trim() : null,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      guest_token: token,
      status: 'active',
    }).then(function(r) {
      setLoading(false);
      if (r.error) { Alert.alert(t('common_error'), r.error.message); return; }
      track('property_added', { name: form.name });
      Alert.alert(t('host_properties_added_title'), t('host_properties_added_msg', { name: form.name, token: token }));
      setForm({ name:'',address:'',city:'',type:'',rooms:'',capacity:'',access_code:'',access_info:'',wifi_name:'',wifi_password:'',checkin:'15:00',checkout:'11:00',rules:'',contacts:'',welcome_message:'' });
      setShowAdd(false);
      load();
    });
  }

  function remove(id, name) {
    Alert.alert(t('host_properties_delete_title', { name: name }), t('host_properties_delete_msg'), [
      { text: t('host_properties_delete_cancel') },
      { text: t('host_properties_delete_confirm'), style: 'destructive', onPress: function() {
        supabase.from('host_inventory').delete().eq('property_id', id).then(function() {
          supabase.from('properties').delete().eq('id', id).then(function() { load(); });
        });
      }}
    ]);
  }

  function editProperty(p) {
    setEditingId(p.id);
    setForm({ name: p.name||'', address: p.address||'', city: p.city||'', type: p.type||'', rooms: String(p.rooms||''), capacity: String(p.capacity||''), access_code: p.access_code||'', access_info: p.access_info||'', wifi_name: p.wifi_name||'', wifi_password: p.wifi_password||'', checkin: p.checkin||p.check_in_time||'15:00', checkout: p.checkout||p.check_out_time||'11:00', rules: p.rules||'', contacts: p.contacts||'', welcome_message: p.welcome_message||'', ical_url: p.ical_url||'', latitude: p.latitude ? String(p.latitude) : '', longitude: p.longitude ? String(p.longitude) : '' });
    setShowAdd(true);
  }

  function shareCode(p) {
    Share.share({ message: t('host_properties_share_msg', { name: p.name, code: p.guest_token, address: (p.address||'') + ' ' + (p.city||'') }) });
  }

  function copyCode(code) {
    try { require('react-native').Clipboard.setString(code); } catch(e) {}
    Alert.alert(t('host_properties_copy_success'), code);
  }

  function getFrozenLabel(plan) {
    if (plan === 'free') return t('host_properties_frozen_free');
    if (plan === 'starter') return t('host_properties_frozen_starter');
    return t('host_properties_frozen_other', { plan: plan });
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hdr}>
        <Text style={s.hdrT}>{t('host_properties_header')}</Text>
        <TouchableOpacity style={s.addBtnH} onPress={function() { if(showAdd){setShowAdd(false);setEditingId(null);}else{if(!canAddProperty(userPlan,list.length)){Alert.alert(t('host_properties_limit_title'), userPlan==='free'?t('host_properties_limit_free_msg'):t('host_properties_limit_starter_msg'),[{text:t('host_properties_limit_later')},{text:t('host_properties_limit_see_plans'),onPress:function(){props.navigation.navigate('Settings');}}]);return;}setEditingId(null);setForm({name:'',address:'',city:'',type:'',rooms:'',capacity:'',access_code:'',access_info:'',wifi_name:'',wifi_password:'',checkin:'15:00',checkout:'11:00',rules:'',contacts:'',welcome_message:''});setShowAdd(true);} }}><Text style={s.addBtnHT}>{showAdd ? t('host_properties_btn_close') : t('host_properties_btn_add')}</Text></TouchableOpacity>
      </View>
      <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {showAdd && (
          <View style={[s.formCard, editingId && {borderColor:T.accent}]}>
            <Text style={s.formTitle}>{editingId ? t('host_properties_form_edit') : t('host_properties_form_new')}</Text>
            <TextInput style={s.input} placeholder={t('host_properties_ph_name')} placeholderTextColor={T.muted} value={form.name} onChangeText={function(v) { update('name', v); }} autoCorrect={true} />
            <TextInput style={s.input} placeholder={t('host_properties_ph_address')} placeholderTextColor={T.muted} value={form.address} onChangeText={function(v) { update('address', v); }} autoCorrect={true} />
            <TextInput style={s.input} placeholder={t('host_properties_ph_city')} placeholderTextColor={T.muted} value={form.city} onChangeText={function(v) { update('city', v); }} autoCorrect={true} />

            <View style={{backgroundColor:'#F0F7FB',borderRadius:10,padding:10,marginVertical:6,borderWidth:1,borderColor:'rgba(28,95,138,0.15)'}}>
              <Text style={{fontSize:11,fontWeight:'700',color:'#1C5F8A',marginBottom:6}}>{t('host_properties_gps_title')}</Text>
              <View style={{flexDirection:'row',gap:6,marginBottom:6}}>
                <TextInput style={[s.input,{flex:1,marginVertical:0}]} placeholder={t('host_properties_ph_latitude')} placeholderTextColor={T.muted} value={form.latitude} onChangeText={function(v){update('latitude',v);}} keyboardType="numeric" />
                <TextInput style={[s.input,{flex:1,marginVertical:0}]} placeholder={t('host_properties_ph_longitude')} placeholderTextColor={T.muted} value={form.longitude} onChangeText={function(v){update('longitude',v);}} keyboardType="numeric" />
              </View>
              <TouchableOpacity style={{backgroundColor:'#1C5F8A',borderRadius:8,padding:10,alignItems:'center',flexDirection:'row',justifyContent:'center',gap:6}} onPress={function(){
                if (!Location) { Alert.alert(t('host_properties_gps_install_title'), t('host_properties_gps_install_msg')); return; }
                Alert.alert(t('host_properties_gps_confirm_title'), t('host_properties_gps_confirm_msg'), [
                  { text: t('host_properties_gps_btn_cancel'), style: 'cancel' },
                  { text: t('host_properties_gps_btn_capture'), onPress: function(){
                    Location.requestForegroundPermissionsAsync().then(function(perm){
                      if (perm.status !== 'granted') { Alert.alert(t('host_properties_gps_denied_title'), t('host_properties_gps_denied_msg')); return; }
                      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation }).then(function(loc){
                        var lat = loc.coords.latitude.toFixed(6);
                        var lng = loc.coords.longitude.toFixed(6);
                        var n = {}; for (var x in form) n[x] = form[x]; n.latitude = lat; n.longitude = lng; setForm(n);
                        Alert.alert(t('host_properties_gps_captured_title'), t('host_properties_gps_captured_msg', { lat: lat, lng: lng, accuracy: Math.round(loc.coords.accuracy) }));
                      }).catch(function(e){ Alert.alert(t('host_properties_gps_error_title'), e.message); });
                    });
                  }}
                ]);
              }}>
                <Text style={{color:'#fff',fontSize:13,fontWeight:'700'}}>{t('host_properties_gps_use_btn')}</Text>
              </TouchableOpacity>
            </View>
            <View style={{flexDirection:'row',gap:8}}>
              <View style={{flex:1}}><TextInput style={s.input} placeholder={t('host_properties_ph_type')} placeholderTextColor={T.muted} value={form.type} onChangeText={function(v){update('type',v);}} /></View>
              <View style={{flex:1}}><TextInput style={s.input} placeholder={t('host_properties_ph_rooms')} placeholderTextColor={T.muted} value={form.rooms} onChangeText={function(v){update('rooms',v);}} keyboardType="number-pad" /></View>
              <View style={{flex:1}}><TextInput style={s.input} placeholder={t('host_properties_ph_capacity')} placeholderTextColor={T.muted} value={form.capacity} onChangeText={function(v){update('capacity',v);}} keyboardType="number-pad" /></View>
            </View>
            <TextInput style={s.input} placeholder={t('host_properties_ph_contacts')} placeholderTextColor={T.muted} value={form.contacts} onChangeText={function(v) { update('contacts', v); }} keyboardType="phone-pad" />
            <TextInput style={s.input} placeholder={t('host_properties_ph_access_code')} placeholderTextColor={T.muted} value={form.access_code} onChangeText={function(v) { update('access_code', v); }} />
            <TextInput style={[s.input, { height: 60, textAlignVertical: 'top' }]} placeholder={t('host_properties_ph_access_info')} placeholderTextColor={T.muted} value={form.access_info} onChangeText={function(v) { update('access_info', v); }} multiline autoCorrect={true} />
            <View style={{flexDirection:'row',gap:8}}>
              <View style={{flex:1}}><TextInput style={s.input} placeholder={t('host_properties_ph_wifi')} placeholderTextColor={T.muted} value={form.wifi_name} onChangeText={function(v){update('wifi_name',v);}} autoCorrect={false} /></View>
              <View style={{flex:1}}><TextInput style={s.input} placeholder={t('host_properties_ph_wifi_pw')} placeholderTextColor={T.muted} value={form.wifi_password} onChangeText={function(v){update('wifi_password',v);}} autoCorrect={false} /></View>
            </View>
            <View style={{flexDirection:'row',gap:8}}>
              <View style={{flex:1}}><TextInput style={s.input} placeholder={t('host_properties_ph_checkin')} placeholderTextColor={T.muted} value={form.checkin} onChangeText={function(v){update('checkin',v);}} /></View>
              <View style={{flex:1}}><TextInput style={s.input} placeholder={t('host_properties_ph_checkout')} placeholderTextColor={T.muted} value={form.checkout} onChangeText={function(v){update('checkout',v);}} /></View>
            </View>
            <TextInput style={[s.input,{height:50,textAlignVertical:'top'}]} placeholder={t('host_properties_ph_rules')} placeholderTextColor={T.muted} value={form.rules} onChangeText={function(v){update('rules',v);}} multiline autoCorrect={true} />
            <TextInput style={[s.input,{height:50,textAlignVertical:'top'}]} placeholder={t('host_properties_ph_welcome')} placeholderTextColor={T.muted} value={form.welcome_message} onChangeText={function(v){update('welcome_message',v);}} multiline autoCorrect={true} />
            <TextInput style={s.input} placeholder={t('host_properties_ph_ical')} placeholderTextColor={T.muted} value={form.ical_url} onChangeText={function(v){update('ical_url',v);}} autoCorrect={false} autoCapitalize="none" keyboardType="url" />
            <TouchableOpacity style={{backgroundColor:'#E8F4FB',borderRadius:10,padding:10,marginBottom:12,borderWidth:1,borderColor:'rgba(28,95,138,0.15)'}} onPress={function(){Alert.alert(t('host_properties_ical_help_title'), t('host_properties_ical_help_msg'));}}><Text style={{fontSize:11,color:'#1C5F8A',fontWeight:'600'}}>{t('host_properties_ical_help_link')}</Text></TouchableOpacity>
            <View style={{flexDirection:'row',gap:10}}>
              {editingId && <TouchableOpacity style={{flex:1,backgroundColor:T.bg,borderRadius:12,paddingVertical:14,alignItems:'center',borderWidth:1,borderColor:T.border}} onPress={function(){setShowAdd(false);setEditingId(null);}}><Text style={{color:T.sub,fontWeight:'600'}}>{t('host_properties_btn_cancel')}</Text></TouchableOpacity>}
              <TouchableOpacity style={[s.saveBtn,{flex:editingId?2:1}]} onPress={add} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnT}>{editingId ? t('host_properties_btn_save_edit') : t('host_properties_btn_save_add')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {list.length === 0 && !showAdd ? (
          <View style={s.empty}><Text style={{ fontSize: 40, marginBottom: 12 }}>🏠</Text><Text style={s.emptyT}>{t('host_properties_empty_title')}</Text><Text style={s.emptyS}>{t('host_properties_empty_msg')}</Text></View>
        ) : list.map(function(p, i) {
          var maxProp = getLimits(userPlan).maxProperties;
          var isFrozen = i >= maxProp;
          if (isFrozen) {
            return (
              <View key={p.id||i} style={[s.propCard, {opacity: 0.5, borderColor: '#DC3232'}]}>
                <View style={{flexDirection:'row',alignItems:'center',gap:10,marginBottom:8}}>
                  <Text style={{fontSize:24}}>🏠</Text>
                  <View style={{flex:1}}>
                    <Text style={s.propName}>🏠 {p.name}</Text>
                    <Text style={{fontSize:11,color:'#DC3232',fontWeight:'600'}}>{getFrozenLabel(userPlan)}</Text>
                    <Text style={{fontSize:10,color:'#9B9B9B',marginTop:2}}>{t('host_properties_frozen_desc')}</Text>
                  </View>
                </View>
                <TouchableOpacity style={{backgroundColor:'#C8965A',borderRadius:10,paddingVertical:10,alignItems:'center'}} onPress={function(){props.navigation.navigate('Settings');}}>
                  <Text style={{color:'#fff',fontSize:12,fontWeight:'700'}}>{t('host_properties_frozen_unlock_btn')}</Text>
                </TouchableOpacity>
              </View>
            );
          }
          return (
            <View key={p.id||i} style={s.propCard}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.propName}>🏠 {p.name}</Text>
                  <Text style={s.propAddr}>{p.address || ''}{p.city ? ', ' + p.city : ''}</Text>
                  {p.type && <Text style={s.propMeta}>{p.type}{p.rooms?' · '+p.rooms+' '+t('host_properties_card_rooms'):''}{p.capacity?' · '+p.capacity+' '+t('host_properties_card_people'):''}</Text>}
                </View>
                <View style={{flexDirection:'row',gap:10}}>
                  <TouchableOpacity onPress={function(){editProperty(p);}}><Text style={{color:T.blue,fontSize:11,fontWeight:'600'}}>{t('host_properties_card_edit')}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={function() { remove(p.id, p.name); }}><Text style={{ color: T.error, fontSize: 11, fontWeight: '600' }}>{t('host_properties_card_delete')}</Text></TouchableOpacity>
                </View>
              </View>
              {p.access_code && <Text style={s.propInfo}>{t('host_properties_card_code_label')} {p.access_code}</Text>}
              {p.wifi_name && <Text style={s.propInfo}>{t('host_properties_card_wifi_label')} {p.wifi_name} / {p.wifi_password}</Text>}
              {(p.checkin||p.check_in_time) && <Text style={s.propInfo}>{t('host_properties_card_checkin_inout', { checkin: p.checkin||p.check_in_time, checkout: p.checkout||p.check_out_time })}</Text>}
              {p.contacts && <Text style={s.propInfo}>📞 {p.contacts}</Text>}
              {(p.address || p.city || p.latitude) && <TouchableOpacity style={{backgroundColor:'#F0F7FB',borderRadius:10,padding:12,marginTop:10,flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:'rgba(28,95,138,0.2)'}} onPress={function(){ showNavigationChoice((p.address||'') + (p.city ? ', ' + p.city : ''), p.latitude, p.longitude); }}>
                <View style={{width:44,height:44,backgroundColor:'#1C5F8A',borderRadius:22,alignItems:'center',justifyContent:'center'}}>
                  <Text style={{fontSize:20}}>⚙️</Text>
                </View>
                <View style={{flex:1}}>
                  <Text style={{fontSize:13,fontWeight:'700',color:'#1C5F8A'}}>{t('host_properties_route_title')} {p.latitude && p.longitude ? t('host_properties_route_accurate') : ''}</Text>
                  <Text style={{fontSize:11,color:T.muted,marginTop:2}}>{t('host_properties_route_apps')}</Text>
                </View>
                <Text style={{fontSize:18,color:'#1C5F8A'}}>⬺</Text>
              </TouchableOpacity>}
              {p.guest_token && <View style={s.codeBox}>
                <View style={{flex:1}}><Text style={s.codeLabel}>{t('host_properties_code_unique_label')}</Text><Text style={s.codeValue}>{p.guest_token}</Text></View>
                <TouchableOpacity style={s.copyBtn} onPress={function(){copyCode(p.guest_token);}}><Text style={s.copyBtnT}>{t('host_properties_code_copy_btn')}</Text></TouchableOpacity>
                <TouchableOpacity style={s.shareBtn} onPress={function(){shareCode(p);}}><Text style={s.shareBtnT}>{t('host_properties_code_share_btn')}</Text></TouchableOpacity>
              </View>}
              {p.ical_url && <TouchableOpacity style={{backgroundColor:'#E8F4FB',borderRadius:10,padding:10,marginTop:8,flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,borderColor:'rgba(28,95,138,0.15)'}} onPress={function(){Alert.alert(t('host_properties_sync_title'), t('host_properties_sync_msg'),[{text:t('host_properties_sync_btn_cancel')},{text:t('host_properties_sync_btn_sync'),onPress:function(){(canUseFeature(userPlan,'icalSync')?syncIcalForProperty(p.id,p.ical_url,props.session.user.id):Promise.resolve({added:0,error:t('host_properties_sync_not_available')})).then(function(res){if(res.error)Alert.alert(t('common_error'),res.error);else Alert.alert(t('host_properties_sync_done_title'), res.added === 1 ? t('host_properties_sync_done_msg_single') : t('host_properties_sync_done_msg_plural', { count: res.added }));});}}]);}}><Text style={{fontSize:14}}>📅</Text><Text style={{fontSize:12,color:T.blue,fontWeight:'600',flex:1}}>{t('host_properties_sync_label', { lastSync: p.last_sync_at ? t('host_properties_sync_last_date', { date: new Date(p.last_sync_at).toLocaleDateString() }) : t('host_properties_sync_last_never') })}</Text><Text style={{fontSize:12,color:T.blue}}>⟳</Text></TouchableOpacity>}
            </View>
          );
        })}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.dark },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, backgroundColor: T.dark },
  hdrT: { fontSize: 18, fontWeight: '600', color: '#fff' },
  addBtnH: { backgroundColor: 'rgba(200,150,90,0.2)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 }, addBtnHT: { fontSize: 12, fontWeight: '700', color: T.accent },
  formCard: { backgroundColor: T.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: T.border },
  formTitle: { fontSize: 16, fontWeight: '600', color: T.text, marginBottom: 14, textAlign: 'center' },
  input: { backgroundColor: T.bg, borderWidth: 1, borderColor: T.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: T.text, marginBottom: 8 },
  saveBtn: { backgroundColor: '#1C5F8A', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 6 }, saveBtnT: { color: '#fff', fontWeight: '700', fontSize: 15 },
  propCard: { backgroundColor: T.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: T.border },
  propName: { fontSize: 16, fontWeight: '600', color: T.text }, propAddr: { fontSize: 12, color: T.muted, marginTop: 2 },
  propMeta: { fontSize: 11, color: T.sub, marginTop: 2 },
  propInfo: { fontSize: 12, color: T.sub, marginTop: 6 },
  codeBox: { flexDirection:'row', alignItems:'center', marginTop:10, padding:10, backgroundColor:'#E8F4FB', borderRadius:10, borderWidth:1, borderColor:'rgba(28,95,138,0.15)', gap:8, flexWrap:'wrap' },
  codeLabel: { fontSize:10, fontWeight:'600', color:T.blue }, codeValue: { fontSize:18, fontWeight:'700', color:T.blue, marginTop:2, letterSpacing:2 },
  copyBtn: { backgroundColor:T.accent, paddingHorizontal:12, paddingVertical:8, borderRadius:8 }, copyBtnT: { color:'#fff', fontSize:11, fontWeight:'700' },
  shareBtn: { backgroundColor:T.blue, paddingHorizontal:12, paddingVertical:8, borderRadius:8 }, shareBtnT: { color:'#fff', fontSize:11, fontWeight:'700' },
  empty: { backgroundColor: T.card, borderRadius: 16, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: T.border },
  emptyT: { fontSize: 16, fontWeight: '600', color: T.text, marginBottom: 6 }, emptyS: { fontSize: 13, color: T.muted, textAlign: 'center' },
});