import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T } from '../../config/theme';
import { supabase, SUPABASE_ANON, EDGE_URL } from '../../config/supabase';
import { t, useLang, getLang } from '../../i18n';

function timeNow() {
  var locale = getLang() === 'en' ? 'en-US' : 'fr-FR';
  return new Date().toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'});
}

export default function HostChat(props) {
  useLang();
  var _p = useState([]); var list = _p[0]; var setList = _p[1];
  var _s = useState(null); var sel = _s[0]; var setSel = _s[1];
  var _m = useState([]); var msgs = _m[0]; var setMsgs = _m[1];
  var _i = useState(''); var input = _i[0]; var setInput = _i[1];
  var _b = useState(false); var busy = _b[0]; var setBusy = _b[1];
  var ref = useRef(null);

  useEffect(function(){supabase.from('properties').select('*').eq('user_id',props.session.user.id).then(function(r){if(r.data&&r.data.length){setList(r.data);setSel(r.data[0])}});},[]);
  useEffect(function(){if(sel)setMsgs([{id:'0',role:'ai',text:t('host_chat_welcome_msg',{property:sel.name}),time:timeNow()}]);},[sel]);

  function send() {
    var m = input.trim(); if(!m||busy||!sel) return;
    setInput('');
    setMsgs(function(prev){return prev.concat({id:Date.now()+'',role:'user',text:m,time:timeNow()})});
    setBusy(true);
    fetch(EDGE_URL+'/ai-concierge',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+SUPABASE_ANON},body:JSON.stringify({property_id:sel.id,user_id:props.session.user.id,guest_name:t('host_chat_test_guest_name'),message:m})})
    .then(function(r){return r.json()})
    .then(function(d){setMsgs(function(prev){return prev.concat({id:(Date.now()+1)+'',role:'ai',text:d.response||d.reply||t('host_chat_err_generic'),time:timeNow()})});setBusy(false);})
    .catch(function(){setMsgs(function(prev){return prev.concat({id:(Date.now()+1)+'',role:'ai',text:t('host_chat_err_connection'),time:timeNow()})});setBusy(false);});
  }

  function renderMsg(item) {
    var m = item.item;
    return <View style={[s.mw,m.role==='user'&&{alignItems:'flex-end'}]}><View style={[s.bubble,m.role==='user'?s.bU:s.bA]}><Text style={[s.bT,m.role==='user'&&{color:'#fff'}]}>{m.text}</Text><Text style={[s.bt,m.role==='user'&&{color:'rgba(255,255,255,0.4)'}]}>{m.time}</Text></View></View>;
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hdr}><Text style={s.hdrT}>{t('host_chat_header')}</Text></View>
      {list.length > 1 && <ScrollView horizontal style={s.pSel} showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:16,gap:8}}>
        {list.map(function(p){return <TouchableOpacity key={p.id} style={[s.pPill,sel&&sel.id===p.id&&s.pPillA]} onPress={function(){setSel(p)}}><Text style={[s.pPillT,sel&&sel.id===p.id&&{color:'#fff'}]}>{p.name}</Text></TouchableOpacity>})}
      </ScrollView>}
      <KeyboardAvoidingView style={{flex:1,backgroundColor:T.bg}} behavior={Platform.OS==='ios'?'padding':undefined} keyboardVerticalOffset={90}>
        <FlatList ref={ref} data={msgs} renderItem={renderMsg} keyExtractor={function(i){return i.id}} contentContainerStyle={{padding:16}} onContentSizeChange={function(){ref.current&&ref.current.scrollToEnd({animated:true})}}/>
        <View style={s.iw}>
          <TextInput style={s.inp} placeholder={t('host_chat_input_placeholder')} placeholderTextColor={T.muted} value={input} onChangeText={setInput} multiline/>
          <TouchableOpacity style={[s.sBtn,(!input.trim()||busy)&&{opacity:0.4}]} onPress={send} disabled={!input.trim()||busy}>
            {busy?<ActivityIndicator color="#fff" size="small"/>:<Text style={{color:'#fff',fontSize:16}}>➤</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
var s = StyleSheet.create({
  safe:{flex:1,backgroundColor:T.dark},hdr:{paddingHorizontal:18,paddingVertical:14,backgroundColor:T.dark},hdrT:{fontSize:18,fontWeight:'600',color:'#fff'},
  pSel:{backgroundColor:T.dark2,paddingVertical:10},pPill:{backgroundColor:T.dark3,paddingHorizontal:14,paddingVertical:7,borderRadius:10},pPillA:{backgroundColor:T.accent},pPillT:{fontSize:12,fontWeight:'600',color:T.muted},
  mw:{marginBottom:10},bubble:{maxWidth:'82%',padding:12,borderRadius:18},
  bA:{backgroundColor:T.card,borderWidth:1,borderColor:T.border,borderBottomLeftRadius:6,alignSelf:'flex-start'},bU:{backgroundColor:T.dark,borderBottomRightRadius:6,alignSelf:'flex-end'},
  bT:{fontSize:14,lineHeight:22,color:T.text},bt:{fontSize:10,color:T.muted,marginTop:4},
  iw:{flexDirection:'row',padding:14,gap:8,alignItems:'flex-end',backgroundColor:T.card,borderTopWidth:1,borderTopColor:T.border},
  inp:{flex:1,borderWidth:1.5,borderColor:T.border,borderRadius:14,paddingHorizontal:14,paddingVertical:10,fontSize:14,backgroundColor:T.bg,color:T.text,maxHeight:100},
  sBtn:{width:42,height:42,backgroundColor:T.dark,borderRadius:14,alignItems:'center',justifyContent:'center'},
});