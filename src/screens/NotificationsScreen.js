import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import T from '../theme';
import AnimCard from '../components/AnimCard';
import { t, useLang } from '../i18n';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) { UIManager.setLayoutAnimationEnabledExperimental(true); }


export default function NotificationsScreen(props) {
  useLang();
  var role = props.role;
  var session = props.session;
  var onNavigate = props.onNavigate;
  var _notifs = useState([]); var notifs = _notifs[0]; var setNotifs = _notifs[1];
  var _refreshing = useState(false); var refreshing = _refreshing[0]; var setRefreshing = _refreshing[1];

  function load() {
    if (role === 'host') { loadHostNotifs(); }
    else { loadCleanerNotifs(); }
  }

  function loadHostNotifs() {
    var allNotifs = [];
    supabase.from('cleaning_bookings').select('*, cleaners(company_name), properties(name)')
      .eq('host_id', session.user.id).eq('cleaner_validated', false).in('status', ['pending'])
      .order('created_at', { ascending: false }).limit(10)
      .then(function(r) {
        if (r.data) r.data.forEach(function(b) {
          allNotifs.push({ type: 'booking_pending', icon: '⏳', title: t('notifications_host_booking_pending_title'), desc: t('notifications_host_booking_pending_desc', { cleaner: b.cleaners ? b.cleaners.company_name : t('notifications_fallback_cleaner'), property: b.properties ? b.properties.name : '', date: b.date }), color: '#FF9500', target: 'FindCleaner', id: b.id, time: b.created_at });
        });
        supabase.from('cleaning_bookings').select('*, cleaners(company_name), properties(name)')
          .eq('host_id', session.user.id).eq('report_sent', true).neq('payment_status', 'paid')
          .order('created_at', { ascending: false }).limit(10)
          .then(function(r2) {
            if (r2.data) r2.data.forEach(function(b) {
              allNotifs.push({ type: 'report_received', icon: '📸', title: t('notifications_host_report_received_title'), desc: t('notifications_host_report_received_desc', { cleaner: b.cleaners ? b.cleaners.company_name : '', property: b.properties ? b.properties.name : '', date: b.date }), color: T.accent, target: 'Dashboard', id: b.id, time: b.created_at });
            });
            supabase.from('cleaning_chats').select('*, cleaners(company_name)')
              .eq('host_id', session.user.id).gt('host_unread', 0)
              .then(function(r3) {
                if (r3.data) r3.data.forEach(function(c) {
                  allNotifs.push({ type: 'message', icon: '💬', title: c.host_unread === 1 ? t('notifications_host_messages_single') : t('notifications_host_messages_plural', { count: c.host_unread }), desc: c.cleaners ? c.cleaners.company_name : t('notifications_host_messages_desc_fallback'), color: T.blue, target: 'Messages', id: c.id, time: c.last_message_at });
                });
                supabase.from('host_inventory').select('*, properties:property_id(name)')
                  .eq('user_id', session.user.id)
                  .then(function(r4) {
                    if (r4.data) {
                      var critical = r4.data.filter(function(it) { return it.quantity <= it.min_quantity; });
                      if (critical.length > 0) {
                        allNotifs.push({ type: 'stock_low', icon: '⚠️', title: critical.length === 1 ? t('notifications_host_stock_title_single') : t('notifications_host_stock_title_plural', { count: critical.length }), desc: critical.slice(0, 3).map(function(it) { return it.item_name; }).join(', '), color: T.error, target: 'Inventory', time: new Date().toISOString() });
                      }
                    }
                    allNotifs.sort(function(a, b) { return new Date(b.time || 0) - new Date(a.time || 0); });
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setNotifs(allNotifs);
                  });
              });
          });
      });
  }

  function loadCleanerNotifs() {
    var allNotifs = [];
    supabase.from('cleaners').select('id').eq('user_id', session.user.id).single().then(function(cr) {
      if (!cr.data) { setNotifs([]); return; }
      var cid = cr.data.id;
      supabase.from('cleaning_bookings').select('*, properties(name)')
        .eq('cleaner_id', cid).eq('cleaner_validated', false).in('status', ['pending'])
        .order('created_at', { ascending: false }).limit(10)
        .then(function(r) {
          if (r.data) r.data.forEach(function(b) {
            allNotifs.push({ type: 'booking_to_validate', icon: '🔔', title: t('notifications_cleaner_booking_to_validate_title'), desc: t('notifications_cleaner_booking_to_validate_desc', { property: b.properties ? b.properties.name : t('notifications_fallback_property'), date: b.date, time: b.time || '' }), color: T.error, target: 'CDash', id: b.id, time: b.created_at });
          });
          var today = new Date().toISOString().split('T')[0];
          supabase.from('cleaning_bookings').select('*, properties(name)')
            .eq('cleaner_id', cid).eq('status', 'confirmed').gte('date', today)
            .order('date', { ascending: true }).limit(5)
            .then(function(r2) {
              if (r2.data) r2.data.forEach(function(b) {
                allNotifs.push({ type: 'upcoming', icon: '📅', title: t('notifications_cleaner_upcoming_title'), desc: t('notifications_cleaner_upcoming_desc', { property: b.properties ? b.properties.name : '', date: b.date, time: b.time || '' }), color: T.success, target: 'CDash', id: b.id, time: b.created_at });
              });
              supabase.from('cleaning_chats').select('*')
                .eq('cleaner_id', cid).gt('cleaner_unread', 0)
                .then(function(r3) {
                  if (r3.data) r3.data.forEach(function(c) {
                    allNotifs.push({ type: 'message', icon: '💬', title: c.cleaner_unread === 1 ? t('notifications_cleaner_messages_single') : t('notifications_cleaner_messages_plural', { count: c.cleaner_unread }), desc: t('notifications_cleaner_messages_desc_fallback'), color: T.blue, target: 'CMessages', id: c.id, time: c.last_message_at });
                  });
                  supabase.from('cleaning_bookings').select('*, properties(name)')
                    .eq('cleaner_id', cid).eq('payment_status', 'paid')
                    .order('payment_date', { ascending: false }).limit(5)
                    .then(function(r4) {
                      if (r4.data) r4.data.forEach(function(b) {
                        allNotifs.push({ type: 'paid', icon: '💰', title: t('notifications_cleaner_paid_title', { amount: b.payment_amount || 0 }), desc: t('notifications_cleaner_paid_desc', { property: b.properties ? b.properties.name : '', date: b.date }), color: T.success, target: 'CDash', id: b.id, time: b.payment_date });
                      });
                      var yesterday = new Date(Date.now() - 86400000).toISOString();
                      supabase.from('team_messages').select('*').like('conversation_id', '%' + session.user.id + '%').gt('created_at', yesterday).neq('sender_id', session.user.id).order('created_at', { ascending: false }).limit(10).then(function(r5) {
                        if (r5.data) r5.data.forEach(function(tm) {
                          allNotifs.push({ type: 'team_msg', icon: '👥', title: t('notifications_cleaner_team_msg_title', { sender: tm.sender_name || t('notifications_cleaner_team_msg_sender_fallback') }), desc: tm.text ? (tm.text.length > 40 ? tm.text.substring(0, 40) + '...' : tm.text) : t('notifications_cleaner_team_msg_photo'), color: '#1C5F8A', target: 'CTeam', id: tm.id, time: tm.created_at });
                        });
                        supabase.from('team_missions').select('*').eq('owner_id', session.user.id).eq('status', 'pending').order('mission_date', { ascending: true }).limit(5).then(function(r6) {
                          if (r6.data) r6.data.forEach(function(mi) {
                            allNotifs.push({ type: 'mission', icon: '📋', title: t('notifications_cleaner_mission_title', { title: mi.title }), desc: mi.mission_date ? t('notifications_cleaner_mission_desc_date', { date: mi.mission_date }) : t('notifications_cleaner_mission_desc_no_date'), color: '#C8965A', target: 'CTeam', id: mi.id, time: mi.created_at });
                          });
                          allNotifs.sort(function(a, b) { return new Date(b.time || 0) - new Date(a.time || 0); });
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setNotifs(allNotifs);
                        });
                      });
                    });
                });
            });
        });
    });
  }

  useFocusEffect(useCallback(function() { load(); }, []));
  function refresh() { setRefreshing(true); load(); setTimeout(function() { setRefreshing(false); }, 800); }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    var diff = (new Date() - new Date(dateStr)) / 1000;
    if (diff < 60) return t('notifications_time_just_now');
    if (diff < 3600) return t('notifications_time_min', { n: Math.floor(diff / 60) });
    if (diff < 86400) return t('notifications_time_hour', { n: Math.floor(diff / 3600) });
    return t('notifications_time_day', { n: Math.floor(diff / 86400) });
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hdr}>
        <Text style={s.hdrT}>{t('notifications_header')}</Text>
        <View style={s.badge}><Text style={s.badgeT}>{notifs.length}</Text></View>
      </View>
      <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={T.accent} />}>
        {notifs.length === 0 ? (
          <View style={s.empty}><Text style={{ fontSize: 40, marginBottom: 12 }}>🔔</Text><Text style={s.emptyT}>{t('notifications_empty_title')}</Text><Text style={s.emptyS}>{t('notifications_empty_msg')}</Text></View>
        ) : notifs.map(function(n, i) {
          return (
            <TouchableOpacity key={i} activeOpacity={0.7} onPress={function() {
              if (onNavigate && n.target) onNavigate(n.target);
            }}>
              <AnimCard style={[s.notifCard, { borderLeftColor: n.color }]} delay={i * 50}>
                <View style={s.notifRow}>
                  <Text style={s.notifIcon}>{n.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.notifTitle}>{n.title}</Text>
                    <Text style={s.notifDesc}>{n.desc}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.notifTime}>{timeAgo(n.time)}</Text>
                    <Text style={s.notifArrow}>→</Text>
                  </View>
                </View>
              </AnimCard>
            </TouchableOpacity>
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
  badge: { backgroundColor: 'rgba(255,59,48,0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeT: { fontSize: 12, fontWeight: '700', color: T.error },
  empty: { backgroundColor: T.card, borderRadius: 16, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: T.border, marginTop: 20 },
  emptyT: { fontSize: 16, fontWeight: '600', color: T.text, marginBottom: 6 },
  emptyS: { fontSize: 13, color: T.muted, textAlign: 'center' },
  notifCard: { backgroundColor: T.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4 },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifIcon: { fontSize: 24 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: T.text },
  notifDesc: { fontSize: 12, color: T.muted, marginTop: 2 },
  notifTime: { fontSize: 10, color: T.muted },
  notifArrow: { fontSize: 14, color: T.blue, fontWeight: '700', marginTop: 4 },
});