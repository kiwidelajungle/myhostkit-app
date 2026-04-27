import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../config/supabase';
import CleaningChat from './CleaningChat';
import T from '../theme';
import { t, useLang, getLang } from '../i18n';


export default function CleaningChatList(props) {
  useLang();
  var myRole = props.role;
  var session = props.session;
  var _chats = useState([]); var chats = _chats[0]; var setChats = _chats[1];
  var _openChat = useState(null); var openChat = _openChat[0]; var setOpenChat = _openChat[1];
  var _refreshing = useState(false); var refreshing = _refreshing[0]; var setRefreshing = _refreshing[1];
  var _cleanerId = useState(null); var cleanerId = _cleanerId[0]; var setCleanerId = _cleanerId[1];
  var _propNames = useState({}); var propNames = _propNames[0]; var setPropNames = _propNames[1];

  function load() {
    if (myRole === 'host') {
      supabase.from('cleaning_chats').select('*, cleaners(company_name, contact_name)').eq('host_id', session.user.id).order('last_message_at', { ascending: false }).then(function(r) {
        if (r.data) {
          setChats(r.data);
          loadPropertyNames(r.data);
        }
      });
    } else {
      supabase.from('cleaners').select('id').eq('user_id', session.user.id).single().then(function(cr) {
        if (!cr.data) return;
        setCleanerId(cr.data.id);
        supabase.from('cleaning_chats').select('*').eq('cleaner_id', cr.data.id).order('last_message_at', { ascending: false }).then(function(r) {
          if (r.data) {
            setChats(r.data);
            loadPropertyNames(r.data);
          }
        });
      });
    }
  }

  function loadPropertyNames(chatList) {
    var bookingIds = [];
    chatList.forEach(function(c) { if (c.booking_id) bookingIds.push(c.booking_id); });
    if (bookingIds.length === 0) return;

    supabase.from('cleaning_bookings').select('id, properties(name)').in('id', bookingIds).then(function(r) {
      if (r.data) {
        var map = {};
        r.data.forEach(function(b) {
          if (b.properties) map[b.id] = b.properties.name;
        });
        setPropNames(map);
      }
    });
  }

  useEffect(function() { load(); var interval = setInterval(load, 10000); return function() { clearInterval(interval); }; }, []);
  function refresh() { setRefreshing(true); load(); setTimeout(function() { setRefreshing(false); }, 800); }

  if (openChat) {
    var otherName = myRole === 'host'
      ? (openChat.cleaners ? (openChat.cleaners.contact_name || openChat.cleaners.company_name) : t('cleaning_chat_list_fallback_cleaner'))
      : t('cleaning_chat_list_fallback_host');
    var companyName = myRole === 'host'
      ? (openChat.cleaners ? openChat.cleaners.company_name : '')
      : '';
    var propertyName = openChat.booking_id ? (propNames[openChat.booking_id] || '') : '';

    return <CleaningChat
      chatId={openChat.id}
      myRole={myRole}
      otherName={otherName}
      companyName={companyName}
      propertyName={propertyName}
      session={session}
      onBack={function() { setOpenChat(null); load(); }}
    />;
  }

  var totalUnread = 0;
  chats.forEach(function(c) { totalUnread += (myRole === 'host' ? c.host_unread : c.cleaner_unread) || 0; });
  var unreadText = totalUnread === 1
    ? t('cleaning_chat_list_unread_single')
    : t('cleaning_chat_list_unread_plural', { count: totalUnread });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hdr}>
        <Text style={s.hdrT}>{t('cleaning_chat_list_header')}</Text>
        {totalUnread > 0 && <View style={s.unreadBadge}><Text style={s.unreadT}>{unreadText}</Text></View>}
      </View>
      <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={T.accent} />}>
        {chats.length === 0 ? (
          <View style={s.empty}><Text style={{ fontSize: 40, marginBottom: 12 }}>💬</Text><Text style={s.emptyT}>{t('cleaning_chat_list_empty_title')}</Text><Text style={s.emptyS}>{myRole === 'host' ? t('cleaning_chat_list_empty_host') : t('cleaning_chat_list_empty_cleaner')}</Text></View>
        ) : chats.map(function(chat, i) {
          var unread = (myRole === 'host' ? chat.host_unread : chat.cleaner_unread) || 0;
          var name = myRole === 'host' ? (chat.cleaners ? chat.cleaners.company_name : t('cleaning_chat_list_fallback_cleaner')) : t('cleaning_chat_list_fallback_host');
          var sub = myRole === 'host' ? (chat.cleaners ? chat.cleaners.contact_name : '') : '';
          var pName = chat.booking_id ? (propNames[chat.booking_id] || '') : '';
          var locale = getLang() === 'en' ? 'en-US' : 'fr-FR';
          var time = chat.last_message_at ? new Date(chat.last_message_at).toLocaleDateString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
          return (
            <TouchableOpacity key={i} style={[s.chatCard, unread > 0 && s.chatCardUnread]} onPress={function() { setOpenChat(chat); }} activeOpacity={0.7}>
              <View style={s.chatAv}><Text style={{ fontSize: 20 }}>{myRole === 'host' ? '🧹' : '🏠'}</Text></View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[s.chatName, unread > 0 && { fontWeight: '700' }]}>{name}</Text>
                  {unread > 0 && <View style={s.unreadDot}><Text style={s.unreadDotT}>{unread}</Text></View>}
                </View>
                {sub ? <Text style={s.chatSub}>{sub}</Text> : null}
                {pName ? <Text style={s.chatProp}>🏠 {pName}</Text> : null}
              </View>
              <Text style={s.chatTime}>{time}</Text>
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
  unreadBadge: { backgroundColor: 'rgba(255,59,48,0.15)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  unreadT: { fontSize: 11, color: '#FF3B30', fontWeight: '700' },
  empty: { backgroundColor: T.card, borderRadius: 16, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: T.border, marginTop: 20 },
  emptyT: { fontSize: 16, fontWeight: '600', color: T.text, marginBottom: 6 }, emptyS: { fontSize: 13, color: T.muted, textAlign: 'center', lineHeight: 20 },
  chatCard: { backgroundColor: T.card, borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: T.border },
  chatCardUnread: { borderLeftWidth: 4, borderLeftColor: '#FF3B30', backgroundColor: '#FFFAFA' },
  chatAv: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#E8F4FB', alignItems: 'center', justifyContent: 'center' },
  chatName: { fontSize: 15, fontWeight: '500', color: T.text },
  chatSub: { fontSize: 12, color: T.muted, marginTop: 1 },
  chatProp: { fontSize: 11, color: '#1C5F8A', marginTop: 2, fontWeight: '500' },
  chatTime: { fontSize: 11, color: T.muted },
  unreadDot: { backgroundColor: '#FF3B30', minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  unreadDotT: { color: '#fff', fontSize: 11, fontWeight: '700' },
});