import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../config/supabase';
import T from '../../theme';
import { t, useLang, getLang } from '../../i18n';


export default function HostGuestChat(props) {
  useLang();
  var _properties = useState([]); var properties = _properties[0]; var setProperties = _properties[1];
  var _selProp = useState(null); var selProp = _selProp[0]; var setSelProp = _selProp[1];
  var _msgs = useState([]); var msgs = _msgs[0]; var setMsgs = _msgs[1];
  var _input = useState(''); var input = _input[0]; var setInput = _input[1];
  var _sending = useState(false); var sending = _sending[0]; var setSending = _sending[1];
  var ref = useRef(null);
  var pollRef = useRef(null);

  useEffect(function() {
    supabase.from('properties').select('*').eq('user_id', props.session.user.id).then(function(r) {
      if (r.data && r.data.length) { setProperties(r.data); setSelProp(r.data[0]); }
    });
    return function() { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(function() {
    if (!selProp) return;
    loadMessages();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(loadMessages, 5000);
  }, [selProp]);

  function loadMessages() {
    if (!selProp) return;
    supabase.from('host_guest_messages').select('*').eq('property_id', selProp.id).order('created_at', { ascending: true }).limit(100).then(function(r) {
      if (r.data) setMsgs(r.data);
    });
  }

  function send() {
    var m = input.trim();
    if (!m || sending || !selProp) return;
    setInput(''); setSending(true);
    supabase.from('host_guest_messages').insert({
      property_id: selProp.id,
      sender_role: 'host',
      sender_id: props.session.user.id,
      message: m,
    }).then(function(r) {
      setSending(false);
      if (r.error) { Alert.alert(t('common_error'), r.error.message); return; }
      loadMessages();
    });
  }

  function renderMsg(item) {
    var m = item.item;
    var isMe = m.sender_role === 'host';
    var locale = getLang() === 'en' ? 'en-US' : 'fr-FR';
    var time = m.created_at ? new Date(m.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '';
    function reportMsg() {
      var preview = (m.message || '').substring(0, 80);
      Alert.alert(t('host_guest_chat_report_title'), t('host_guest_chat_report_msg', { preview: preview }), [
        { text: t('host_guest_chat_report_cancel'), style: 'cancel' },
        { text: t('host_guest_chat_report_confirm'), style: 'destructive', onPress: function() {
          var reporter = props.session ? props.session.user.email : t('host_guest_chat_report_email_fallback_host');
          fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/send-email', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
              to: 'myhostkit.contact@gmail.com',
              subject: t('host_guest_chat_report_email_subject'),
              body: t('host_guest_chat_report_email_body', {
                reporter: reporter,
                sender: m.sender_role,
                date: m.created_at || '',
                message: m.message || '',
              }),
            })
          }).then(function(){Alert.alert(t('host_guest_chat_report_success_title'), t('host_guest_chat_report_success_msg'));}).catch(function(){Alert.alert(t('common_error'), t('host_guest_chat_report_error'));});
        }}
      ]);
    }
    return (
      <View style={[s.mw, isMe && { alignItems: 'flex-end' }]}>
        <TouchableOpacity activeOpacity={0.8} onLongPress={reportMsg} delayLongPress={500} style={[s.bubble, isMe ? s.bMe : s.bOther]}>
          {!isMe && <Text style={s.senderLabel}>{t('host_guest_chat_sender_guest')}</Text>}
          <Text style={[s.bText, isMe && { color: '#fff' }]}>{m.message}</Text>
          <Text style={[s.bTime, isMe && { color: 'rgba(255,255,255,0.5)' }]}>{time}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hdr}>
        <Text style={s.hdrT}>{t('host_guest_chat_header')}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.propBar} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {properties.map(function(p) {
          var active = selProp && selProp.id === p.id;
          return <TouchableOpacity key={p.id} style={[s.propPill, active && s.propPillA]} onPress={function() { setSelProp(p); }}>
            <Text style={[s.propPillT, active && { color: '#fff' }]}>{p.name}</Text>
          </TouchableOpacity>;
        })}
      </ScrollView>

      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: T.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList ref={ref} data={msgs} renderItem={renderMsg} keyExtractor={function(i) { return i.id; }} contentContainerStyle={{ padding: 16, paddingBottom: 8 }} onContentSizeChange={function() { ref.current && ref.current.scrollToEnd({ animated: true }); }}
          ListEmptyComponent={<View style={s.emptyChat}><Text style={{ fontSize: 32, marginBottom: 8 }}>💬</Text><Text style={s.emptyChatT}>{t('host_guest_chat_empty_title')}</Text><Text style={s.emptyChatS}>{t('host_guest_chat_empty_msg')}</Text></View>}
        />
        <View style={s.iw}>
          <TextInput style={s.inp} placeholder={t('host_guest_chat_input_placeholder')} placeholderTextColor={T.muted} value={input} onChangeText={setInput} multiline maxLength={500} />
          <TouchableOpacity style={[s.sBtn, (!input.trim() || sending) && { opacity: 0.4 }]} onPress={send} disabled={!input.trim() || sending}>
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontSize: 16 }}>➤</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

var ScrollView = require('react-native').ScrollView;

var s = StyleSheet.create({
  safe:{flex:1,backgroundColor:T.dark},hdr:{paddingHorizontal:18,paddingVertical:14,backgroundColor:T.dark},hdrT:{fontSize:18,fontWeight:'600',color:'#fff'},
  propBar:{backgroundColor:T.dark,paddingVertical:8,maxHeight:52},
  propPill:{backgroundColor:'rgba(255,255,255,0.1)',paddingHorizontal:14,paddingVertical:8,borderRadius:10},propPillA:{backgroundColor:T.accent},propPillT:{fontSize:12,fontWeight:'600',color:'rgba(255,255,255,0.6)'},
  mw:{marginBottom:10},bubble:{maxWidth:'82%',padding:12,borderRadius:18},
  bMe:{backgroundColor:T.blue,borderBottomRightRadius:6,alignSelf:'flex-end'},bOther:{backgroundColor:T.card,borderWidth:1,borderColor:T.border,borderBottomLeftRadius:6,alignSelf:'flex-start'},
  senderLabel:{fontSize:10,color:T.accent,fontWeight:'700',marginBottom:4},
  bText:{fontSize:14,lineHeight:22,color:T.text},bTime:{fontSize:10,color:T.muted,marginTop:4},
  emptyChat:{alignItems:'center',paddingVertical:60},emptyChatT:{fontSize:16,fontWeight:'600',color:T.text,marginBottom:4},emptyChatS:{fontSize:13,color:T.muted,textAlign:'center',paddingHorizontal:20},
  iw:{flexDirection:'row',paddingHorizontal:14,paddingVertical:10,paddingBottom:14,gap:8,alignItems:'flex-end',backgroundColor:T.card,borderTopWidth:1,borderTopColor:T.border},
  inp:{flex:1,borderWidth:1.5,borderColor:T.border,borderRadius:14,paddingHorizontal:14,paddingVertical:10,fontSize:14,backgroundColor:T.bg,color:T.text,maxHeight:100},
  sBtn:{width:42,height:42,backgroundColor:T.blue,borderRadius:14,alignItems:'center',justifyContent:'center'},
});