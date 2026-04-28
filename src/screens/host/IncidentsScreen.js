import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../config/supabase';
import T from '../../theme';
import { t, useLang } from '../../i18n';

export default function IncidentsScreen(props) {
  useLang();
  var session = props.session;
  var _list = useState([]); var list = _list[0]; var setList = _list[1];
  var _loading = useState(true); var loading = _loading[0]; var setLoading = _loading[1];
  var _refreshing = useState(false); var refreshing = _refreshing[0]; var setRefreshing = _refreshing[1];
  var _filter = useState('all'); var filter = _filter[0]; var setFilter = _filter[1];

  function load() {
    supabase.from('incidents').select('*, properties(name)').eq('host_id', session.user.id).order('created_at', { ascending: false }).then(function(r) {
      if (r.data) setList(r.data);
      setLoading(false); setRefreshing(false);
    });
  }

  useEffect(function() { load(); }, []);

  function markSeen(id) {
    supabase.from('incidents').update({ status: 'seen' }).eq('id', id).then(function() { load(); });
  }

  function markResolved(id) {
    Alert.alert(t('inc_mark_resolved_title'), t('inc_mark_resolved_msg'), [
      { text: t('common_cancel'), style: 'cancel' },
      { text: t('inc_resolved'), onPress: function() { supabase.from('incidents').update({ status: 'resolved' }).eq('id', id).then(function() { load(); }); } }
    ]);
  }

  function statusColor(s) {
    if (s === 'new') return '#FF3B30';
    if (s === 'seen') return '#FF9500';
    return '#34C759';
  }

  function statusLabel(s) {
    if (s === 'new') return t('inc_status_new');
    if (s === 'seen') return t('inc_status_seen');
    return t('inc_status_resolved');
  }

  function timeAgo(d) {
    var diff = (Date.now() - new Date(d).getTime()) / 1000;
    if (diff < 60) return t('inc_just_now');
    if (diff < 3600) return t('inc_time_min_ago', { n: Math.floor(diff/60) });
    if (diff < 86400) return t('inc_time_h_ago', { n: Math.floor(diff/3600) });
    if (diff < 604800) return t('inc_time_d_ago', { n: Math.floor(diff/86400) });
    return new Date(d).toLocaleDateString('fr-FR');
  }

  var counts = { all: list.length, new: 0, seen: 0, resolved: 0 };
  list.forEach(function(it) { counts[it.status] = (counts[it.status] || 0) + 1; });

  var filtered = filter === 'all' ? list : list.filter(function(it) { return it.status === filter; });

  return (
    <View style={s.safe}>
      {loading ? (
        <View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator color={T.accent} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={{padding:16, paddingBottom: 40}} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={function(){setRefreshing(true);load();}} tintColor={T.accent} />}>
          <View style={s.headerRow}>
            <View>
              <Text style={s.title}>{t('inc_title')}</Text>
              <Text style={s.subtitle}>{counts.all} </Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 16}} contentContainerStyle={{gap: 8}}>
            {[{k:'all', label:t('inc_filter_all')}, {k:'new', label:t('inc_filter_new')}, {k:'seen', label:t('inc_status_seen')}, {k:'resolved', label:t('inc_filter_resolved')}].map(function(f) {
              var active = filter === f.k;
              return (
                <TouchableOpacity key={f.k} style={[s.chip, active && s.chipActive]} onPress={function(){setFilter(f.k);}}>
                  <Text style={[s.chipT, active && s.chipTActive]}>{f.label}</Text>
                  {counts[f.k] > 0 && <View style={[s.chipBadge, active && s.chipBadgeActive]}><Text style={[s.chipBadgeT, active && s.chipBadgeTActive]}>{counts[f.k]}</Text></View>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {filtered.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}><Text style={{fontSize:32}}>OK</Text></View>
              <Text style={s.emptyT}>{t('inc_empty_title')}</Text>
              <Text style={s.emptyS}>{filter === 'all' ? t('inc_empty_desc') : t('inc_empty_filter')}</Text>
            </View>
          ) : filtered.map(function(it) {
            return (
              <View key={it.id} style={s.card}>
                <View style={s.cardHeader}>
                  <View style={[s.statusDot, {backgroundColor: statusColor(it.status)}]} />
                  <Text style={[s.statusText, {color: statusColor(it.status)}]}>{statusLabel(it.status)}</Text>
                  <View style={{flex: 1}} />
                  <Text style={s.time}>{timeAgo(it.created_at)}</Text>
                </View>

                <Text style={s.prop}>{it.properties ? it.properties.name : '(logement supprime)'}</Text>
                <Text style={s.desc}>{it.description}</Text>

                {it.status !== 'resolved' && (
                  <View style={s.actions}>
                    {it.status === 'new' && (
                      <TouchableOpacity style={s.btnSec} onPress={function(){markSeen(it.id);}}>
                        <Text style={s.btnSecT}>{t('inc_mark_seen')}</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={s.btnPri} onPress={function(){markResolved(it.id);}}>
                      <Text style={s.btnPriT}>{t('inc_mark_resolved_btn')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

var s = StyleSheet.create({
  safe: {flex:1, backgroundColor:'#F8F8F6'},
  headerRow: {flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: 16, marginTop: 4},
  title: {fontSize: 24, fontWeight: '700', color: T.text, letterSpacing: -0.5},
  subtitle: {fontSize: 13, color: T.muted, marginTop: 2},

  chip: {flexDirection:'row', alignItems:'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E5E5'},
  chipActive: {backgroundColor: T.dark, borderColor: T.dark},
  chipT: {fontSize: 12, fontWeight: '600', color: T.text},
  chipTActive: {color: '#fff'},
  chipBadge: {minWidth: 20, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10, backgroundColor: '#F0F0F0', alignItems: 'center'},
  chipBadgeActive: {backgroundColor: 'rgba(255,255,255,0.2)'},
  chipBadgeT: {fontSize: 10, fontWeight: '700', color: T.text},
  chipBadgeTActive: {color: '#fff'},

  empty: {alignItems:'center', paddingVertical: 60, paddingHorizontal: 30},
  emptyIcon: {width: 64, height: 64, borderRadius: 32, backgroundColor: '#E8F8EC', alignItems:'center', justifyContent:'center', marginBottom: 16},
  emptyT: {fontSize: 17, fontWeight: '600', color: T.text, marginBottom: 6},
  emptyS: {fontSize: 13, color: T.muted, textAlign:'center', lineHeight: 19},

  card: {backgroundColor:'#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2},
  cardHeader: {flexDirection:'row', alignItems:'center', gap: 8, marginBottom: 10},
  statusDot: {width: 8, height: 8, borderRadius: 4},
  statusText: {fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5},
  time: {fontSize: 11, color: T.muted, fontWeight: '500'},

  prop: {fontSize: 15, fontWeight: '700', color: T.text, marginBottom: 6, letterSpacing: -0.2},
  desc: {fontSize: 14, color: T.text, lineHeight: 20},

  actions: {flexDirection:'row', gap: 8, marginTop: 14},
  btnSec: {flex: 1, backgroundColor:'#F5F5F5', borderRadius: 10, paddingVertical: 11, alignItems:'center'},
  btnSecT: {fontSize: 13, fontWeight: '600', color: T.text},
  btnPri: {flex: 1, backgroundColor: T.dark, borderRadius: 10, paddingVertical: 11, alignItems:'center'},
  btnPriT: {fontSize: 13, fontWeight: '600', color: '#fff'},
});
