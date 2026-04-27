import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../config/supabase';
import T from '../theme';
import { t, useLang, getLang } from '../i18n';


function timeStr() {
  var locale = getLang() === 'en' ? 'en-US' : 'fr-FR';
  return new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export default function CleaningChat(props) {
  useLang();
  var chatId = props.chatId;
  var myRole = props.myRole;
  var otherName = props.otherName || t('cleaning_chat_fallback_contact');
  var companyName = props.companyName || '';
  var propertyName = props.propertyName || '';
  var session = props.session;

  var _msgs = useState([]); var msgs = _msgs[0]; var setMsgs = _msgs[1];
  var _input = useState(''); var input = _input[0]; var setInput = _input[1];
  var _sending = useState(false); var sending = _sending[0]; var setSending = _sending[1];
  var _loading = useState(true); var loading = _loading[0]; var setLoading = _loading[1];
  var ref = useRef(null);
  var pollRef = useRef(null);

  function loadMessages() {
    supabase.from('cleaning_chat_messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true }).then(function(r) {
      setLoading(false);
      if (r.data) setMsgs(r.data);
      var unreadField = myRole === 'host' ? 'host_unread' : 'cleaner_unread';
      var upd = {}; upd[unreadField] = 0;
      supabase.from('cleaning_chats').update(upd).eq('id', chatId).then(function() {});
    });
  }

  useEffect(function() {
    loadMessages();
    var channel = supabase.channel('chat-' + chatId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cleaning_chat_messages', filter: 'chat_id=eq.' + chatId }, function(payload) {
        setMsgs(function(prev) { return prev.concat([payload.new]); });
      })
      .subscribe();
    return function() { supabase.removeChannel(channel); };
  }, [chatId]);

  function send() {
    var m = input.trim();
    if (!m || sending) return;
    setInput('');
    setSending(true);

    supabase.from('cleaning_chat_messages').insert({
      chat_id: chatId,
      sender_id: session.user.id,
      sender_role: myRole,
      message: m,
    }).then(function(r) {
      setSending(false);
      if (r.error) { Alert.alert(t('common_error'), r.error.message); return; }
      var otherField = myRole === 'host' ? 'cleaner_unread' : 'host_unread';
      supabase.rpc('increment_field', { row_id: chatId, table_name: 'cleaning_chats', field_name: otherField }).then(function() {});
      supabase.from('cleaning_chats').select(otherField).eq('id', chatId).single().then(function(cr) {
        if (cr.data) {
          var upd = {}; upd[otherField] = (cr.data[otherField] || 0) + 1; upd.last_message_at = new Date().toISOString();
          supabase.from('cleaning_chats').update(upd).eq('id', chatId).then(function() {});
        }
      });
      loadMessages();
    });
  }

  function renderMsg(item) {
    var m = item.item;
    var isMe = m.sender_role === myRole;
    var locale = getLang() === 'en' ? 'en-US' : 'fr-FR';
    var time = m.created_at ? new Date(m.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '';
    function reportMsg() {
      var preview = (m.message || '').substring(0, 80);
      Alert.alert(t('cleaning_chat_report_title'), t('cleaning_chat_report_msg', { preview: preview }), [
        { text: t('cleaning_chat_report_cancel'), style: 'cancel' },
        { text: t('cleaning_chat_report_confirm'), style: 'destructive', onPress: function() {
          var reporter = props.session ? props.session.user.email : t('cleaning_chat_report_email_fallback_anon');
          fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/send-email', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
              to: 'myhostkit.contact@gmail.com',
              subject: t('cleaning_chat_report_email_subject'),
              body: t('cleaning_chat_report_email_body', {
                reporter: reporter,
                sender: m.sender_role,
                date: m.created_at || '',
                message: m.message || '',
              }),
            })
          }).then(function(){Alert.alert(t('cleaning_chat_report_success_title'), t('cleaning_chat_report_success_msg'));}).catch(function(){Alert.alert(t('common_error'), t('cleaning_chat_report_error'));});
        }}
      ]);
    }
    return (
      <View style={[s.mw, isMe && { alignItems: 'flex-end' }]}>
        <TouchableOpacity activeOpacity={0.8} onLongPress={reportMsg} delayLongPress={500} style={[s.bubble, isMe ? s.bMe : s.bOther]}>
          {!isMe && <Text style={s.senderName}>{otherName}</Text>}
          <Text style={[s.bText, isMe && { color: '#fff' }]}>{m.message}</Text>
          <Text style={[s.bTime, isMe && { color: 'rgba(255,255,255,0.5)' }]}>{time}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderHeader() {
    var displayName = otherName;
    var subtitle = '';
    if (myRole === 'host') {
      displayName = companyName || otherName;
      subtitle = companyName && otherName !== companyName ? otherName : '';
    } else {
      displayName = otherName;
    }

    return (
      <View style={s.hdr}>
        <TouchableOpacity onPress={props.onBack} style={s.backBtn}><Text style={s.backT}>{t('cleaning_chat_back_btn')}</Text></TouchableOpacity>
        <View style={s.hdrCenter}>
          <Text style={s.hdrT} numberOfLines={1}>{displayName}</Text>
          {subtitle ? <Text style={s.hdrSub} numberOfLines={1}>{subtitle}</Text> : null}
          {propertyName ? (
            <View style={s.propertyBadge}>
              <Text style={s.propertyBadgeT}>🏠 {propertyName}</Text>
            </View>
          ) : null}
        </View>
        <View style={s.onlineBadge}><View style={s.onlineDot} /><Text style={s.onlineT}>{t('cleaning_chat_online_badge')}</Text></View>
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {renderHeader()}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg }}><ActivityIndicator color="#1C5F8A" size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {renderHeader()}

      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: T.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList ref={ref} data={msgs} renderItem={renderMsg} keyExtractor={function(i) { return i.id; }} contentContainerStyle={{ padding: 16, paddingBottom: 8 }} onContentSizeChange={function() { ref.current && ref.current.scrollToEnd({ animated: true }); }}
          ListEmptyComponent={<View style={s.emptyChat}><Text style={{ fontSize: 32, marginBottom: 8 }}>💬</Text><Text style={s.emptyChatT}>{t('cleaning_chat_empty_title')}</Text><Text style={s.emptyChatS}>{t('cleaning_chat_empty_msg')}</Text></View>}
        />

        <View style={s.iw}>
          <TextInput style={s.inp} placeholder={t('cleaning_chat_input_placeholder')} placeholderTextColor={T.muted} value={input} onChangeText={setInput} multiline maxLength={1000} />
          <TouchableOpacity style={[s.sBtn, (!input.trim() || sending) && { opacity: 0.4 }]} onPress={send} disabled={!input.trim() || sending}>
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontSize: 16 }}>➤</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.dark },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: T.dark },
  hdrCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  hdrT: { fontSize: 16, fontWeight: '600', color: '#fff' },
  hdrSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  propertyBadge: { backgroundColor: 'rgba(28,95,138,0.25)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginTop: 4 },
  propertyBadgeT: { fontSize: 10, color: '#8CC4E8', fontWeight: '600' },
  backBtn: { width: 70 }, backT: { fontSize: 14, color: T.accent, fontWeight: '600' },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(52,199,89,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, width: 60, justifyContent: 'center' },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34C759' }, onlineT: { fontSize: 10, color: '#34C759', fontWeight: '600' },
  mw: { marginBottom: 10 }, bubble: { maxWidth: '82%', padding: 12, borderRadius: 18 },
  bMe: { backgroundColor: '#1C5F8A', borderBottomRightRadius: 6, alignSelf: 'flex-end' },
  bOther: { backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderBottomLeftRadius: 6, alignSelf: 'flex-start' },
  senderName: { fontSize: 10, color: '#1C5F8A', fontWeight: '700', marginBottom: 4 },
  bText: { fontSize: 14, lineHeight: 22, color: T.text }, bTime: { fontSize: 10, color: T.muted, marginTop: 4 },
  emptyChat: { alignItems: 'center', paddingVertical: 60 }, emptyChatT: { fontSize: 16, fontWeight: '600', color: T.text, marginBottom: 4 }, emptyChatS: { fontSize: 13, color: T.muted },
  iw: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, paddingBottom: 14, gap: 8, alignItems: 'flex-end', backgroundColor: T.card, borderTopWidth: 1, borderTopColor: T.border },
  inp: { flex: 1, borderWidth: 1.5, borderColor: T.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, backgroundColor: T.bg, color: T.text, maxHeight: 100 },
  sBtn: { width: 42, height: 42, backgroundColor: '#1C5F8A', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});