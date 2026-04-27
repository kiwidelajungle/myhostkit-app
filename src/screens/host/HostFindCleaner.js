import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, Linking, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import T from '../../theme';
import { track } from '../../utils/monitoring';
import { t, useLang } from '../../i18n';


export default function HostFindCleaner(props) {
  useLang();
  var _date = useState(''); var date = _date[0]; var setDate = _date[1];
  var _city = useState(''); var city = _city[0]; var setCity = _city[1];
  var _results = useState([]); var results = _results[0]; var setResults = _results[1];
  var _searching = useState(false); var searching = _searching[0]; var setSearching = _searching[1];
  var _booking = useState(null); var booking = _booking[0]; var setBooking = _booking[1];
  var _properties = useState([]); var properties = _properties[0]; var setProperties = _properties[1];
  var _selProp = useState(null); var selProp = _selProp[0]; var setSelProp = _selProp[1];
  var _notes = useState(''); var notes = _notes[0]; var setNotes = _notes[1];
  var _loading = useState(false); var loading = _loading[0]; var setLoading = _loading[1];
  var _favorites = useState({}); var favorites = _favorites[0]; var setFavorites = _favorites[1];
  var _showFavs = useState(false); var showFavs = _showFavs[0]; var setShowFavs = _showFavs[1];
  var _favCleaners = useState([]); var favCleaners = _favCleaners[0]; var setFavCleaners = _favCleaners[1];

  useFocusEffect(useCallback(function() {
    props.supabase.from('properties').select('*').eq('user_id', props.session.user.id).then(function(r) {
      if (r.data) { setProperties(r.data); if (r.data.length && !selProp) setSelProp(r.data[0]); }
    });
    loadFavorites();
  }, []));

  function loadFavorites() {
    supabase.from('favorites').select('cleaner_id').eq('host_id', props.session.user.id).then(function(r) {
      if (r.data) {
        var map = {};
        r.data.forEach(function(f) { map[f.cleaner_id] = true; });
        setFavorites(map);
      }
    });
    supabase.from('favorites').select('*, cleaners(*)').eq('host_id', props.session.user.id).then(function(r) {
      if (r.data) setFavCleaners(r.data.filter(function(f) { return f.cleaners; }));
    });
  }

  function toggleFavorite(cleanerId) {
    if (favorites[cleanerId]) {
      supabase.from('favorites').delete().eq('host_id', props.session.user.id).eq('cleaner_id', cleanerId).then(function() {
        var n = {}; for (var k in favorites) n[k] = favorites[k]; delete n[cleanerId]; setFavorites(n);
        loadFavorites();
      });
    } else {
      supabase.from('favorites').insert({ host_id: props.session.user.id, cleaner_id: cleanerId }).then(function(r) {
        if (r.error) { Alert.alert(t('common_error'), r.error.message); return; }
        var n = {}; for (var k in favorites) n[k] = favorites[k]; n[cleanerId] = true; setFavorites(n);
        loadFavorites();
      });
    }
  }

  function search() {
    if (!date) { Alert.alert(t('common_error'), t('host_find_cleaner_err_no_date')); return; }
    setSearching(true); setResults([]);
    props.supabase.from('cleaner_availability').select('*, cleaners(*)').eq('date', date).eq('is_available', true).eq('status', 'available').then(function(r) {
      var data = (r.data || []).filter(function(a) { return a.cleaners && a.cleaners.active; });
      if (city.trim()) {
        var c = city.trim().toLowerCase();
        data = data.filter(function(a) { return a.cleaners.city && a.cleaners.city.toLowerCase().indexOf(c) !== -1; });
      }
      if (data.length > 0) {
        var userIds = data.map(function(a) { return a.cleaners.user_id; }).filter(Boolean);
        props.supabase.from('profiles').select('id,subscription_plan').in('id', userIds).then(function(pr) {
          var planMap = {};
          if (pr.data) pr.data.forEach(function(p) { planMap[p.id] = p.subscription_plan || 'free'; });
          data.forEach(function(a) {
            var plan = planMap[a.cleaners.user_id] || 'free';
            a.cleaners._plan = plan;
            a.cleaners._priority = plan === 'business' ? 3 : plan === 'pro' ? 2 : plan === 'trial' ? 2 : 0;
            a.cleaners._verified = plan === 'business' || plan === 'trial';
            a.cleaners._boosted = plan !== 'free';
          });
          data.sort(function(a, b) { return (b.cleaners._priority || 0) - (a.cleaners._priority || 0); });
          var cleanerIds = data.map(function(a) { return a.cleaners.id; }).filter(Boolean);
          props.supabase.from('reviews').select('reviewed_id, rating').eq('reviewed_type', 'cleaner').in('reviewed_id', cleanerIds).then(function(rv) {
            if (rv.data && rv.data.length > 0) {
              var ratingMap = {};
              rv.data.forEach(function(r2) {
                if (!ratingMap[r2.reviewed_id]) ratingMap[r2.reviewed_id] = { sum: 0, count: 0 };
                ratingMap[r2.reviewed_id].sum += r2.rating;
                ratingMap[r2.reviewed_id].count++;
              });
              data.forEach(function(a) {
                var rm = ratingMap[a.cleaners.id];
                if (rm) a.cleaners.rating = (rm.sum / rm.count).toFixed(1);
              });
            }
            setResults(data);
            setSearching(false);
          });
        });
      } else {
        setResults(data);
        setSearching(false);
      }
    });
  }

  function bookCleaner(avail) {
    var cleaner = avail.cleaners;
    var prop = selProp;
    if (!prop && properties.length > 0) { prop = properties[0]; setSelProp(prop); }
    if (!prop) { Alert.alert(t('host_find_cleaner_err_no_prop_title'), t('host_find_cleaner_err_no_prop_msg')); return; }
    setLoading(true);
    props.supabase.from('cleaning_bookings').insert({
      property_id: prop.id, cleaner_id: cleaner.id, host_id: props.session.user.id,
      date: date, time: avail.time_start + ' - ' + avail.time_end, notes: notes,
      status: 'pending', cleaner_validated: false,
    }).select().then(function(r) {
      var bid = r.data && r.data.length ? r.data[0].id : null;
      props.supabase.from('cleaner_availability').update({ status: 'booked', booked_by: props.session.user.id, property_id: prop.id }).eq('id', avail.id).then(function() {});
      props.supabase.from('cleaning_chats').insert({ host_id: props.session.user.id, cleaner_id: cleaner.id, booking_id: bid }).then(function() {});
      setLoading(false); setBooking(null); setNotes('');
      track('cleaning_booking_sent', { cleaner_id: cleaner.id });
      Alert.alert(t('host_find_cleaner_booking_sent_title'), t('host_find_cleaner_booking_sent_msg', { cleaner: cleaner.company_name }));
      fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/send-email', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          to: cleaner.email,
          subject: t('host_find_cleaner_email_subject', { property: prop.name, date: date }),
          body: t('host_find_cleaner_email_body', { name: cleaner.contact_name, property: prop.name, date: date, time: avail.time_start + ' - ' + avail.time_end }),
        }),
      }).catch(function(){});
      search();
    });
  }

  var quickDates = [];
  for (var i = 0; i < 7; i++) {
    var d = new Date();
    d.setDate(d.getDate() + i);
    var dayKeys = ['host_find_cleaner_day_sun','host_find_cleaner_day_mon','host_find_cleaner_day_tue','host_find_cleaner_day_wed','host_find_cleaner_day_thu','host_find_cleaner_day_fri','host_find_cleaner_day_sat'];
    quickDates.push({ date: d.toISOString().split('T')[0], label: i === 0 ? t('host_find_cleaner_today_short') : t(dayKeys[d.getDay()]) + ' ' + d.getDate() });
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hdr}>
        <Text style={s.hdrT}>{t('host_find_cleaner_header')}</Text>
        <TouchableOpacity style={s.favToggle} onPress={function(){setShowFavs(!showFavs);}}>
          <Text style={s.favToggleT}>{showFavs ? t('host_find_cleaner_toggle_search') : t('host_find_cleaner_toggle_favs', { count: Object.keys(favorites).length })}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {showFavs ? (
          <View>
            <Text style={s.sec}>{t('host_find_cleaner_favs_title')}</Text>
            {favCleaners.length === 0 ? <View style={s.emptyCard}><Text style={s.emptyT}>{t('host_find_cleaner_favs_empty_title')}</Text><Text style={s.emptyS}>{t('host_find_cleaner_favs_empty_msg')}</Text></View>
            : favCleaners.map(function(fav, i) {
              var c = fav.cleaners;
              return <View key={i} style={s.resultCard}>
                <View style={s.resultH}>
                  <View style={s.resultAv}><Text style={{fontSize:22}}>🧹</Text></View>
                  <View style={{flex:1}}><Text style={s.resultName}>{c.company_name}</Text><Text style={s.resultContact}>{c.contact_name} · {c.city}</Text></View>
                  {c.price_per_cleaning && <Text style={s.priceT}>{t('host_find_cleaner_price_unit', { price: c.price_per_cleaning })}</Text>}
                </View>
                <TouchableOpacity style={s.unfavBtn} onPress={function(){toggleFavorite(c.id);}}><Text style={s.unfavBtnT}>{t('host_find_cleaner_favs_remove_btn')}</Text></TouchableOpacity>
              </View>;
            })}
          </View>
        ) : (
          <View>
            <Text style={s.sec}>{t('host_find_cleaner_date_label')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12}} contentContainerStyle={{gap:8}}>
              {quickDates.map(function(qd) { var active = date === qd.date; return <TouchableOpacity key={qd.date} style={[s.datePill, active && s.datePillActive]} onPress={function(){setDate(qd.date);}}><Text style={[s.datePillT, active && {color:'#fff'}]}>{qd.label}</Text></TouchableOpacity>; })}
            </ScrollView>
            <Text style={s.sec}>{t('host_find_cleaner_city_label')}</Text>
            <TextInput style={s.input} placeholder={t('host_find_cleaner_city_placeholder')} placeholderTextColor={T.muted} value={city} onChangeText={setCity} />
            <TouchableOpacity style={s.searchBtn} onPress={search} disabled={searching || !date}>
              {searching ? <ActivityIndicator color="#fff" /> : <Text style={s.searchBtnT}>{t('host_find_cleaner_search_btn')}</Text>}
            </TouchableOpacity>

            {results.length > 0 && <View>
              <Text style={[s.sec,{marginTop:20}]}>{results.length === 1 ? t('host_find_cleaner_results_single') : t('host_find_cleaner_results_plural', { count: results.length })}</Text>
              {results.map(function(avail, i) {
                var c = avail.cleaners; if (!c) return null;
                var isFav = favorites[c.id];
                var isBeingBooked = booking && booking.id === avail.id;
                return <View key={i} style={[s.resultCard, c._boosted && {borderColor:'#C8965A',borderWidth:1.5}]}>
                  {c._boosted && <View style={{position:'absolute',top:-1,right:12,backgroundColor:c._plan==='business'?'#9B59B6':'#1C5F8A',paddingHorizontal:8,paddingVertical:2,borderBottomLeftRadius:8,borderBottomRightRadius:8}}><Text style={{color:'#fff',fontSize:9,fontWeight:'700'}}>{c._plan==='business'?t('host_find_cleaner_badge_priority'):t('host_find_cleaner_badge_boosted')}</Text></View>}
                  <View style={s.resultH}>
                    <View style={s.resultAv}><Text style={{fontSize:22}}>🧹</Text></View>
                    <View style={{flex:1}}>
                      <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
                        <Text style={s.resultName}>{c.company_name}</Text>
                        {c._verified && <Text style={{fontSize:12,color:'#1C5F8A'}}>✓</Text>}
                      </View>
                      <Text style={s.resultContact}>{c.contact_name} · {c.city}</Text>
                    </View>
                    <TouchableOpacity onPress={function(){toggleFavorite(c.id);}} style={s.favBtn}>
                      <Text style={{fontSize:20}}>{isFav ? '⭐' : '☆'}</Text>
                    </TouchableOpacity>
                    {c.price_per_cleaning && <Text style={s.priceT}>{t('host_find_cleaner_price_unit', { price: c.price_per_cleaning })}</Text>}
                  </View>
                  <View style={s.resultMeta}><Text style={s.metaItem}>🕐 {avail.time_start} - {avail.time_end}</Text><Text style={s.metaItem}>⭐ {c.rating || '5.0'}</Text>{c._verified && <Text style={{fontSize:10,color:'#1C5F8A',fontWeight:'600'}}>{t('host_find_cleaner_badge_verified')}</Text>}</View>
                  {isBeingBooked ? (
                    <View style={s.bookingForm}>
                      <Text style={s.bfLabel}>{t('host_find_cleaner_bf_property_label')}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6}}>
                        {properties.map(function(p) { var act = selProp && selProp.id === p.id; return <TouchableOpacity key={p.id} style={[s.propPill, act && s.propPillAct]} onPress={function(){setSelProp(p);}}><Text style={[s.propPillT, act && {color:'#fff'}]}>{p.name}</Text></TouchableOpacity>; })}
                      </ScrollView>
                      <Text style={s.bfLabel}>{t('host_find_cleaner_bf_notes_label')}</Text>
                      <TextInput style={s.bfInput} placeholder={t('host_find_cleaner_bf_notes_placeholder')} placeholderTextColor={T.muted} value={notes} onChangeText={setNotes} multiline />
                      <View style={{flexDirection:'row',gap:10,marginTop:12}}>
                        <TouchableOpacity style={s.cancelBtn} onPress={function(){setBooking(null);}}><Text style={s.cancelBtnT}>{t('host_find_cleaner_bf_cancel')}</Text></TouchableOpacity>
                        <TouchableOpacity style={s.confirmBtn} onPress={function(){bookCleaner(avail);}} disabled={loading}>
                          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmBtnT}>{t('host_find_cleaner_bf_send')}</Text>}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity style={s.bookBtn} onPress={function(){setBooking(avail);}}><Text style={s.bookBtnT}>{t('host_find_cleaner_book_btn')}</Text></TouchableOpacity>
                  )}
                </View>;
              })}
            </View>}

            {results.length === 0 && date && !searching && <View style={s.emptyCard}><Text style={{fontSize:40,marginBottom:10}}>🔍</Text><Text style={s.emptyT}>{t('host_find_cleaner_empty_results')}</Text></View>}
          </View>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  safe:{flex:1,backgroundColor:T.dark},hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18,paddingVertical:14,backgroundColor:T.dark},hdrT:{fontSize:18,fontWeight:'600',color:'#fff'},
  favToggle:{backgroundColor:'rgba(200,150,90,0.2)',paddingHorizontal:12,paddingVertical:6,borderRadius:10},favToggleT:{fontSize:11,fontWeight:'700',color:T.accent},
  sec:{fontSize:14,fontWeight:'600',color:T.text,marginBottom:8,marginTop:4},
  datePill:{backgroundColor:T.card,paddingHorizontal:16,paddingVertical:10,borderRadius:12,borderWidth:1,borderColor:T.border},datePillActive:{backgroundColor:T.accent,borderColor:T.accent},datePillT:{fontSize:13,fontWeight:'600',color:T.text},
  input:{backgroundColor:T.card,borderWidth:1,borderColor:T.border,borderRadius:12,paddingHorizontal:14,paddingVertical:12,fontSize:14,color:T.text,marginBottom:12},
  searchBtn:{backgroundColor:T.blue,borderRadius:14,paddingVertical:15,alignItems:'center',marginTop:4},searchBtnT:{color:'#fff',fontSize:15,fontWeight:'700'},
  resultCard:{backgroundColor:T.card,borderRadius:16,padding:16,marginBottom:12,borderWidth:1,borderColor:T.border},
  resultH:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:10},resultAv:{width:48,height:48,borderRadius:14,backgroundColor:'#E8F4FB',alignItems:'center',justifyContent:'center'},
  resultName:{fontSize:16,fontWeight:'600',color:T.text},resultContact:{fontSize:12,color:T.muted,marginTop:1},
  priceT:{fontSize:14,fontWeight:'700',color:T.accentDark},
  favBtn:{padding:6},
  resultMeta:{flexDirection:'row',gap:12,marginBottom:12},metaItem:{fontSize:12,color:T.sub,backgroundColor:T.bg,paddingHorizontal:8,paddingVertical:4,borderRadius:8},
  bookBtn:{backgroundColor:T.accent,borderRadius:12,paddingVertical:13,alignItems:'center'},bookBtnT:{color:'#fff',fontSize:14,fontWeight:'700'},
  bookingForm:{backgroundColor:T.bg,borderRadius:12,padding:14,marginTop:4},
  bfLabel:{fontSize:10,fontWeight:'700',color:T.muted,letterSpacing:0.5,marginBottom:6,marginTop:10},
  bfInput:{backgroundColor:T.card,borderWidth:1,borderColor:T.border,borderRadius:10,paddingHorizontal:12,paddingVertical:10,fontSize:13,color:T.text,minHeight:50,textAlignVertical:'top'},
  propPill:{backgroundColor:T.card,paddingHorizontal:12,paddingVertical:8,borderRadius:10,borderWidth:1,borderColor:T.border},propPillAct:{backgroundColor:T.accent,borderColor:T.accent},propPillT:{fontSize:12,fontWeight:'600',color:T.text},
  cancelBtn:{flex:1,backgroundColor:T.card,borderRadius:10,paddingVertical:12,alignItems:'center',borderWidth:1,borderColor:T.border},cancelBtnT:{fontSize:13,fontWeight:'600',color:T.sub},
  confirmBtn:{flex:2,backgroundColor:T.blue,borderRadius:10,paddingVertical:12,alignItems:'center'},confirmBtnT:{fontSize:13,fontWeight:'700',color:'#fff'},
  emptyCard:{backgroundColor:T.card,borderRadius:16,padding:30,alignItems:'center',borderWidth:1,borderColor:T.border,marginTop:20},emptyT:{fontSize:16,fontWeight:'600',color:T.text,marginBottom:6},emptyS:{fontSize:13,color:T.muted,textAlign:'center'},
  unfavBtn:{backgroundColor:'#FFF5F5',borderRadius:10,paddingVertical:10,alignItems:'center',borderWidth:1,borderColor:'rgba(255,59,48,0.15)'},unfavBtnT:{fontSize:12,fontWeight:'600',color:T.error},
});