import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../config/supabase';
import T from '../../theme';
import { t, useLang, getLang } from '../../i18n';


export default function CleanerHistory(props) {
  useLang();
  var _h = useState([]); var history = _h[0]; var setHistory = _h[1];
  var _r = useState(false); var refreshing = _r[0]; var setRefreshing = _r[1];

  function load() {
    supabase.from('cleaners').select('id').eq('user_id', props.session.user.id).single().then(function(cr) {
      if (!cr.data) return;
      supabase.from('cleaning_bookings').select('*, properties(name, address, city)').eq('cleaner_id', cr.data.id).order('date', { ascending: false }).limit(50).then(function(r) {
        if (r.data) setHistory(r.data);
      });
    });
  }

  useEffect(function() { load(); }, []);
  function refresh() { setRefreshing(true); load(); setTimeout(function() { setRefreshing(false); }, 800); }

  var completed = history.filter(function(h) { return h.status === 'completed'; }).length;
  var pending = history.filter(function(h) { return h.status === 'pending' || h.status === 'confirmed'; }).length;

  function getStatusText(status) {
    if (status === 'completed') return t('cleaner_history_status_completed');
    if (status === 'pending') return t('cleaner_history_status_pending');
    if (status === 'confirmed') return t('cleaner_history_status_confirmed');
    return status;
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hdr}><Text style={s.hdrT}>{t('cleaner_history_header')}</Text><View style={s.badge}><Text style={s.badgeT}>{t('cleaner_history_badge_total', { count: history.length })}</Text></View></View>
      <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={T.accent} />}>
        <View style={s.statsRow}>
          <View style={s.stat}><Text style={[s.statV, { color: T.success }]}>{completed}</Text><Text style={s.statL}>{t('cleaner_history_stat_completed')}</Text></View>
          <View style={s.stat}><Text style={[s.statV, { color: '#FF9500' }]}>{pending}</Text><Text style={s.statL}>{t('cleaner_history_stat_in_progress')}</Text></View>
          <View style={s.stat}><Text style={[s.statV, { color: T.accent }]}>{history.length}</Text><Text style={s.statL}>{t('cleaner_history_stat_total')}</Text></View>
        </View>

        {history.length === 0 ? (
          <View style={s.empty}><Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text><Text style={s.emptyT}>{t('cleaner_history_empty_title')}</Text><Text style={s.emptyS}>{t('cleaner_history_empty_msg')}</Text></View>
        ) : history.map(function(h, i) {
          var statusColor = h.status === 'completed' ? T.success : h.status === 'pending' ? '#FF9500' : '#1C5F8A';
          var statusText = getStatusText(h.status);
          var propName = h.properties ? h.properties.name : t('cleaner_history_fallback_property');
          var propAddr = h.properties ? (h.properties.address || h.properties.city || '') : '';
          var proofId = h.id ? h.id.substring(0, 8) : i;
          var locale = getLang() === 'en' ? 'en-US' : 'fr-FR';
          var proofText = h.created_at
            ? t('cleaner_history_proof_with_date', { id: proofId, date: new Date(h.created_at).toLocaleString(locale) })
            : t('cleaner_history_proof_no_date', { id: proofId });
          return (
            <View key={i} style={[s.histCard, { borderLeftColor: statusColor }]}>
              <View style={s.histH}>
                <View style={{ flex: 1 }}>
                  <Text style={s.histName}>{propName}</Text>
                  <Text style={s.histAddr}>{propAddr}</Text>
                </View>
                <Text style={[s.histStatus, { color: statusColor }]}>{statusText}</Text>
              </View>
              <View style={s.histMeta}>
                <Text style={s.histDate}>📅 {h.date}</Text>
                {h.time && <Text style={s.histDate}>🕐 {h.time}</Text>}
                {h.report_sent && <Text style={[s.histDate, { color: T.success }]}>{t('cleaner_history_report_sent')}</Text>}
              </View>
              {h.report_notes && <Text style={s.histNotes}>📝 {h.report_notes}</Text>}
              {h.notes && <Text style={s.histNotes}>💬 {h.notes}</Text>}
              <Text style={s.histProof}>{proofText}</Text>
            </View>
          );
        })}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.dark }, hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, backgroundColor: T.dark }, hdrT: { fontSize: 18, fontWeight: '600', color: '#fff' },
  badge: { backgroundColor: 'rgba(200,150,90,0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }, badgeT: { fontSize: 12, fontWeight: '700', color: T.accent },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  stat: { flex: 1, backgroundColor: T.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: T.border }, statV: { fontSize: 20, fontWeight: '700', marginBottom: 2 }, statL: { fontSize: 8, fontWeight: '700', color: T.muted, letterSpacing: 0.5 },
  empty: { backgroundColor: T.card, borderRadius: 16, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: T.border }, emptyT: { fontSize: 16, fontWeight: '600', color: T.text, marginBottom: 6 }, emptyS: { fontSize: 13, color: T.muted, textAlign: 'center' },
  histCard: { backgroundColor: T.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4 },
  histH: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }, histName: { fontSize: 15, fontWeight: '600', color: T.text }, histAddr: { fontSize: 12, color: T.muted, marginTop: 1 },
  histStatus: { fontSize: 12, fontWeight: '700' },
  histMeta: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 6 }, histDate: { fontSize: 12, color: T.sub },
  histNotes: { fontSize: 12, color: T.sub, lineHeight: 18, marginTop: 4 },
  histProof: { fontSize: 10, color: T.muted, marginTop: 8, fontStyle: 'italic', borderTopWidth: 1, borderTopColor: T.border, paddingTop: 6 },
});