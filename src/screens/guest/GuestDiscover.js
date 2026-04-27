import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SUPABASE_ANON, EDGE_URL } from '../../config/supabase';
import { t, useLang } from '../../i18n';

var T = { accent: '#C8965A', dark: '#141414', bg: '#FAFAF8', card: '#FFFFFF', text: '#141414', sub: '#6B6B6B', muted: '#9B9B9B', border: 'rgba(0,0,0,0.06)', blue: '#1C5F8A' };

var QUICK = [
  { emoji: '🍽', labelKey: 'guest_discover_quick_restaurants', qKey: 'guest_discover_q_restaurants' },
  { emoji: '🚌', labelKey: 'guest_discover_quick_bus_metro', qKey: 'guest_discover_q_bus_metro' },
  { emoji: '🛒', labelKey: 'guest_discover_quick_supermarket', qKey: 'guest_discover_q_supermarket' },
  { emoji: '🏥', labelKey: 'guest_discover_quick_pharmacy', qKey: 'guest_discover_q_pharmacy' },
  { emoji: '☕', labelKey: 'guest_discover_quick_cafes', qKey: 'guest_discover_q_cafes' },
  { emoji: '🏖', labelKey: 'guest_discover_quick_beaches', qKey: 'guest_discover_q_beaches' },
  { emoji: '🏛', labelKey: 'guest_discover_quick_museums', qKey: 'guest_discover_q_museums' },
  { emoji: '🌳', labelKey: 'guest_discover_quick_parks', qKey: 'guest_discover_q_parks' },
];

export default function GuestDiscover(props) {
  useLang();
  var p = props.session && props.session.guestProperty ? props.session.guestProperty : null;
  var _input = useState(''); var input = _input[0]; var setInput = _input[1];
  var _results = useState([]); var results = _results[0]; var setResults = _results[1];
  var _loading = useState(false); var loading = _loading[0]; var setLoading = _loading[1];

  var location = p ? (p.address || '') + ' ' + (p.city || '') : '';
  var city = p ? (p.city || '') : '';

  function search(query) {
    setLoading(true);
    var sp = t('guest_discover_sp', { city: city, location: location });
    var searchMsg = query + ' ' + t('guest_discover_search_near') + ' ' + location;
    fetch(EDGE_URL + '/ai-concierge', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON }, body: JSON.stringify({ message: searchMsg, systemPrompt: sp }) })
    .then(function(r) { return r.json(); }).then(function(d) {
      setLoading(false);
      var text = d.response || d.reply || t('guest_discover_no_results');
      var items = text.split('\n').filter(function(l) { return l.trim().length > 10; });
      setResults(items);
    }).catch(function() { setLoading(false); setResults([t('guest_discover_service_error')]); });
  }

  function openMaps(text) {
    var match = text.match(/\[MAPS:([^\]]+)\]/);
    var query = match ? match[1] : text.substring(0, 60);
    Linking.openURL('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query));
  }

  function quickSearch(q) { setInput(q); search(q); }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hdr}><Text style={s.hdrT}>{t('guest_discover_header')}</Text><Text style={s.hdrSub}>{t('guest_discover_header_sub')}</Text></View>
      <ScrollView style={{flex:1,backgroundColor:T.bg}} contentContainerStyle={{padding:16}} keyboardShouldPersistTaps="handled">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,marginBottom:14}}>
          {QUICK.map(function(q,i) {
            return <TouchableOpacity key={i} style={s.quickPill} onPress={function(){quickSearch(t(q.qKey));}}><Text style={{fontSize:18}}>{q.emoji}</Text><Text style={s.quickT}>{t(q.labelKey)}</Text></TouchableOpacity>;
          })}
        </ScrollView>

        <View style={s.searchRow}>
          <TextInput style={s.searchInput} placeholder={t('guest_discover_search_placeholder')} placeholderTextColor={T.muted} value={input} onChangeText={setInput} autoCorrect={true} returnKeyType="search" onSubmitEditing={function(){if(input.trim())search(input.trim());}} />
          <TouchableOpacity style={s.searchBtn} onPress={function(){if(input.trim())search(input.trim());}} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.searchBtnT}>🔍</Text>}
          </TouchableOpacity>
        </View>

        {results.length > 0 && (
          <View style={s.resultsCard}>
            <Text style={s.resultsTitle}>{t('guest_discover_results_title')}</Text>
            {results.map(function(item, i) {
              var clean = item.replace(/\[MAPS:[^\]]+\]/g, '').trim();
              if (!clean) return null;
              return (
                <TouchableOpacity key={i} style={s.resultItem} onPress={function(){openMaps(item);}}>
                  <Text style={s.resultText}>{clean}</Text>
                  <Text style={s.resultAction}>{t('guest_discover_result_action')}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {results.length === 0 && !loading && (
          <View style={s.emptyCard}>
            <Text style={{fontSize:44,marginBottom:12}}>🧭</Text>
            <Text style={s.emptyT}>{t('guest_discover_empty_title')}</Text>
            <Text style={s.emptyS}>{t('guest_discover_empty_subtitle')}</Text>
          </View>
        )}
        <View style={{height:30}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  safe:{flex:1,backgroundColor:T.dark},hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18,paddingVertical:14,backgroundColor:T.dark},hdrT:{fontSize:18,fontWeight:'600',color:'#fff'},hdrSub:{fontSize:12,color:'rgba(255,255,255,0.5)'},
  quickPill:{backgroundColor:T.card,borderRadius:14,padding:12,alignItems:'center',borderWidth:1,borderColor:T.border,minWidth:70},quickT:{fontSize:10,fontWeight:'600',color:T.text,marginTop:4},
  searchRow:{flexDirection:'row',gap:8,marginBottom:14},
  searchInput:{flex:1,backgroundColor:T.card,borderWidth:1,borderColor:T.border,borderRadius:14,paddingHorizontal:14,paddingVertical:12,fontSize:14,color:T.text},
  searchBtn:{width:48,height:48,backgroundColor:T.blue,borderRadius:14,alignItems:'center',justifyContent:'center'},searchBtnT:{fontSize:18},
  resultsCard:{backgroundColor:T.card,borderRadius:16,padding:16,borderWidth:1,borderColor:T.border},
  resultsTitle:{fontSize:14,fontWeight:'700',color:T.blue,marginBottom:12},
  resultItem:{paddingVertical:12,borderBottomWidth:1,borderBottomColor:T.border},
  resultText:{fontSize:13,color:T.text,lineHeight:20},resultAction:{fontSize:12,color:T.blue,fontWeight:'600',marginTop:6},
  emptyCard:{backgroundColor:T.card,borderRadius:16,padding:30,alignItems:'center',borderWidth:1,borderColor:T.border},
  emptyT:{fontSize:16,fontWeight:'600',color:T.text,marginBottom:6},emptyS:{fontSize:13,color:T.muted,textAlign:'center',lineHeight:20},
});