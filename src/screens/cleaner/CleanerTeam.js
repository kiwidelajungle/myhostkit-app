import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, RefreshControl, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../config/supabase';
import T from '../../theme';
import { t, useLang } from '../../i18n';

var EDGE = 'https://illovwqvszjuasftwkxh.supabase.co/functions/v1/send-email';

// Créer un conversation_id unique entre 2 users (trié pour que les 2 côtés aient le même)
function makeConvId(uid1, uid2) {
  var sorted = [uid1, uid2].sort();
  return 'private:' + sorted[0] + ':' + sorted[1];
}

export default function CleanerTeam(props) {
  useLang();
  var _tab = useState('members'); var tab = _tab[0]; var setTab = _tab[1];
  var _members = useState([]); var members = _members[0]; var setMembers = _members[1];
  var _groups = useState([]); var groups = _groups[0]; var setGroups = _groups[1];
  var _missions = useState([]); var missions = _missions[0]; var setMissions = _missions[1];
  var _messages = useState([]); var messages = _messages[0]; var setMessages = _messages[1];
  var _email = useState(''); var email = _email[0]; var setEmail = _email[1];
  var _name = useState(''); var name = _name[0]; var setName = _name[1];
  var _showAdd = useState(false); var showAdd = _showAdd[0]; var setShowAdd = _showAdd[1];
  var _showAddGroup = useState(false); var showAddGroup = _showAddGroup[0]; var setShowAddGroup = _showAddGroup[1];
  var _showAddMission = useState(false); var showAddMission = _showAddMission[0]; var setShowAddMission = _showAddMission[1];
  var _groupName = useState(''); var groupName = _groupName[0]; var setGroupName = _groupName[1];
  var _missionTitle = useState(''); var missionTitle = _missionTitle[0]; var setMissionTitle = _missionTitle[1];
  var _missionDate = useState(''); var missionDate = _missionDate[0]; var setMissionDate = _missionDate[1];
  var _missionDesc = useState(''); var missionDesc = _missionDesc[0]; var setMissionDesc = _missionDesc[1];
  var _refreshing = useState(false); var refreshing = _refreshing[0]; var setRefreshing = _refreshing[1];
  var _chatTarget = useState(null); var chatTarget = _chatTarget[0]; var setChatTarget = _chatTarget[1];
  var _chatMsg = useState(''); var chatMsg = _chatMsg[0]; var setChatMsg = _chatMsg[1];
  var _plan = useState('free'); var plan = _plan[0]; var setPlan = _plan[1];
  var _addToGroup = useState(null); var addToGroup = _addToGroup[0]; var setAddToGroup = _addToGroup[1];
  var scrollRef = useRef(null);
  var uid = props.session.user.id;
  var myName = props.session.user.email ? props.session.user.email.split('@')[0] : 'Moi';

  function load() {
    supabase.from('profiles').select('subscription_plan').eq('id', uid).single().then(function(r) { if (r.data) setPlan(r.data.subscription_plan || 'free'); });
    // Charger les membres — chercher aussi leur user_id dans profiles par email
    supabase.from('team_members').select('*').eq('owner_id', uid).order('created_at').then(function(r) {
      if (!r.data) { setMembers([]); return; }
      // Pour chaque membre, chercher son user_id dans profiles
      var ms = r.data;
      var emails = ms.map(function(m) { return m.member_email; });
      supabase.from('profiles').select('id, email').in('email', emails).then(function(pr) {
        var emailToUid = {};
        if (pr.data) pr.data.forEach(function(p) { emailToUid[p.email] = p.id; });
        ms.forEach(function(m) { m.user_id = emailToUid[m.member_email] || null; });
        setMembers(ms);
      });
    });
    supabase.from('team_groups').select('*, team_group_members(member_name, member_id)').eq('owner_id', uid).order('created_at').then(function(r) {
      if (r.data) setGroups(r.data);
      else supabase.from('team_groups').select('*').eq('owner_id', uid).order('created_at').then(function(r2) { if (r2.data) setGroups(r2.data); });
    });
    supabase.from('team_missions').select('*').eq('owner_id', uid).order('mission_date', { ascending: true }).then(function(r) { if (r.data) setMissions(r.data); });
  }

  function loadMessages(convId) {
    supabase.from('team_messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true }).limit(200).then(function(r) {
      if (r.data) setMessages(r.data);
      else setMessages([]);
      setTimeout(function() { if (scrollRef.current) scrollRef.current.scrollToEnd({ animated: true }); }, 300);
    });
  }

  useFocusEffect(useCallback(function() { load(); }, []));

  function sendMessage(text, imageUrl) {
    if (!chatTarget || !chatTarget.convId) return;
    var msgData = {
      conversation_id: chatTarget.convId,
      sender_id: uid,
      sender_name: myName,
      text: text || '',
      image_url: imageUrl || null,
    };
    supabase.from('team_messages').insert(msgData).then(function(res) {
      if (res.error) { Alert.alert(t('team_alert_send_error'), res.error.message); return; }
      setChatMsg('');
      setTimeout(function() { loadMessages(chatTarget.convId); }, 400);
    });
  }

  function openPrivateChat(member) {
    if (!member.user_id) {
      Alert.alert(t('team_alert_no_account_title'), t('team_alert_no_account_msg', { name: member.member_name, email: member.member_email }));
      return;
    }
    var convId = makeConvId(uid, member.user_id);
    setChatTarget({ convId: convId, name: member.member_name, type: 'private' });
    loadMessages(convId);
  }

  function openGroupChat(group) {
    var convId = 'group:' + group.id;
    setChatTarget({ convId: convId, name: group.group_name, type: 'group' });
    loadMessages(convId);
  }

  var canUseTeam = plan === 'business' || plan === 'trial';
  if (!canUseTeam) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.hdr}><Text style={s.hdrT}>{t('team_header_title')}</Text></View>
        <View style={{flex:1,backgroundColor:T.bg,alignItems:'center',justifyContent:'center',padding:30}}>
          <Text style={{fontSize:50,marginBottom:16}}>👥</Text>
          <Text style={{fontSize:18,fontWeight:'600',color:T.text,marginBottom:8}}>Fonctionnalite Business</Text>
          <Text style={{fontSize:14,color:T.muted,textAlign:'center',lineHeight:22,marginBottom:20}}>{t('team_paywall_text')}</Text>
          <TouchableOpacity style={{backgroundColor:'#C8965A',borderRadius:12,paddingVertical:14,paddingHorizontal:30}} onPress={function(){props.navigation.navigate('CSettings');}}><Text style={{color:'#fff',fontSize:14,fontWeight:'700'}}>Passer a Business</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── CHAT ───
  if (chatTarget) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.hdr}>
          <TouchableOpacity onPress={function(){setChatTarget(null);setMessages([]);}}><Text style={{fontSize:16,color:T.accent}}>← Retour</Text></TouchableOpacity>
          <Text style={[s.hdrT,{flex:1,textAlign:'center'}]}>{chatTarget.name}</Text>
          <Text style={{fontSize:12,color:T.muted}}>{chatTarget.type==='group'?'👥':'🔒'}</Text>
        </View>
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined} keyboardVerticalOffset={90}>
          <ScrollView ref={scrollRef} style={{flex:1,backgroundColor:T.bg}} contentContainerStyle={{padding:16}}>
            {messages.map(function(m,i) {
              var isMe = m.sender_id === uid;
              return (
                <View key={m.id||i} style={[s.msgBubble, isMe ? s.msgMe : s.msgOther]}>
                  {!isMe && <Text style={s.msgSender}>{m.sender_name||t('team_chat_default_sender')}</Text>}
                  {m.image_url ? <Image source={{uri:m.image_url}} style={s.msgImg} resizeMode="cover" /> : null}
                  {m.text ? <Text style={[s.msgText, isMe&&{color:'#fff'}]}>{m.text}</Text> : null}
                  <Text style={[s.msgTime, isMe&&{color:'rgba(255,255,255,0.6)'}]}>{new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</Text>
                </View>
              );
            })}
            {messages.length===0 && <Text style={{textAlign:'center',color:T.muted,marginTop:40}}>{t('team_chat_empty')}</Text>}
          </ScrollView>
          <View style={s.chatBar}>
            <TouchableOpacity style={s.photoBtn} onPress={function(){
              ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:0.5}).then(function(r) {
                if (!r.canceled && r.assets && r.assets[0]) sendMessage('', r.assets[0].uri);
              });
            }}><Text style={{fontSize:20}}>📷</Text></TouchableOpacity>
            <TextInput style={s.chatInput} placeholder="Message..." placeholderTextColor={T.muted} value={chatMsg} onChangeText={setChatMsg} />
            <TouchableOpacity style={s.sendBtn} onPress={function(){ if (chatMsg.trim()) sendMessage(chatMsg.trim(), null); }}><Text style={{fontSize:18}}>📤</Text></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── ADD TO GROUP ───
  if (addToGroup) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.hdr}>
          <TouchableOpacity onPress={function(){setAddToGroup(null);}}><Text style={{fontSize:16,color:T.accent}}>← Retour</Text></TouchableOpacity>
          <Text style={[s.hdrT,{flex:1,textAlign:'center'}]}>{t('team_modal_add_to_group')}</Text>
        </View>
        <ScrollView style={{flex:1,backgroundColor:T.bg}} contentContainerStyle={{padding:16}}>
          <Text style={s.sec}>{t('team_add_to_group_title', { name: addToGroup.group_name })}</Text>
          {members.map(function(m,i) {
            var alreadyIn = addToGroup.team_group_members && addToGroup.team_group_members.some(function(gm){return gm.member_id===m.id;});
            return (
              <TouchableOpacity key={m.id||i} style={[s.memberCard, alreadyIn&&{opacity:0.4}]} disabled={alreadyIn} onPress={function(){
                supabase.from('team_group_members').insert({ group_id:addToGroup.id, member_id:m.id, member_name:m.member_name }).then(function(r) {
                  if (r.error) Alert.alert(t('error_title'), r.error.message);
                  else { Alert.alert('Ajoute ✅'); load(); setAddToGroup(null); }
                });
              }}>
                <Text style={{fontSize:18}}>👤</Text>
                <View style={{flex:1}}>
                  <Text style={s.memberName}>{m.member_name}</Text>
                  <Text style={s.memberEmail}>{m.member_email}</Text>
                  {!m.user_id && <Text style={{fontSize:9,color:'#FF9500',marginTop:2}}>⚠ Pas encore inscrit sur Keyla</Text>}
                </View>
                <Text style={{color:alreadyIn?T.muted:'#34C759',fontWeight:'600',fontSize:12}}>{alreadyIn?t('team_already_member'):t('team_btn_add')}</Text>
              </TouchableOpacity>
            );
          })}
          {members.length===0 && <Text style={{textAlign:'center',color:T.muted,marginTop:30}}>{t('team_no_members_yet')}</Text>}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── FUNCTIONS ───
  function addMember() {
    if (!email.includes('@')||!name.trim()) { Alert.alert(t('error_title'),t('team_alert_required')); return; }
    supabase.from('team_members').insert({ owner_id:uid, member_email:email.trim(), member_name:name.trim(), can_view_bookings:true, can_view_property_info:true }).then(function(r) {
      if (r.error) { Alert.alert(t('error_title'), r.error.message); return; }
      Alert.alert(t('team_alert_added_title'), t('team_alert_added_msg', { name: name.trim() }));
      setEmail(''); setName(''); setShowAdd(false); load();
      fetch(EDGE, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ to:email.trim(), subject:'Keyla — Equipe', body:'Bonjour '+name.trim()+',\n\nVous avez ete ajoute a une equipe sur Keyla.\n\nSi vous n\'avez pas encore l\'application, telechargez-la pour communiquer avec votre equipe.\n\n— Keyla' }) });
    });
  }
  function removeMember(m) { Alert.alert(t('team_alert_remove_title', { name: m.member_name }),'',[ {text:t('team_btn_cancel')}, {text:t('team_btn_remove'),style:'destructive',onPress:function(){supabase.from('team_members').delete().eq('id',m.id).then(function(){load();});}} ]); }
  function createGroup() {
    if (!groupName.trim()) return;
    supabase.from('team_groups').insert({ owner_id:uid, group_name:groupName.trim() }).then(function(r) {
      if (r.error) Alert.alert(t('error_title'), r.error.message);
      else { Alert.alert(t('team_alert_group_created')); setGroupName(''); setShowAddGroup(false); load(); }
    });
  }
  function deleteGroup(g) { Alert.alert(t('team_alert_delete_title'),'',[ {text:t('team_btn_cancel')}, {text:t('team_btn_delete'),style:'destructive',onPress:function(){supabase.from('team_groups').delete().eq('id',g.id).then(function(){load();});}} ]); }
  function createMission() {
    if (!missionTitle.trim()) return;
    supabase.from('team_missions').insert({ owner_id:uid, title:missionTitle.trim(), mission_date:missionDate.trim()||null, description:missionDesc.trim()||'', status:'pending' }).then(function(r) {
      if (r.error) Alert.alert(t('error_title'), r.error.message);
      else { Alert.alert(t('team_alert_mission_created_title'), t('team_alert_mission_created_msg')); setMissionTitle(''); setMissionDate(''); setMissionDesc(''); setShowAddMission(false); load();
        members.forEach(function(m){ fetch(EDGE, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ to:m.member_email, subject:'Keyla — Mission: '+missionTitle.trim(), body:'Bonjour '+m.member_name+',\n\nNouvelle mission: '+missionTitle.trim()+(missionDate.trim()?' — '+missionDate.trim():'')+(missionDesc.trim()?'\n\n'+missionDesc.trim():'')+'\n\n— Keyla' }) }); });
      }
    });
  }
  function toggleMission(m) { supabase.from('team_missions').update({status:m.status==='done'?'pending':'done'}).eq('id',m.id).then(function(){load();}); }
  function deleteMission(m) { supabase.from('team_missions').delete().eq('id',m.id).then(function(){load();}); }
  function refresh() { setRefreshing(true); load(); setTimeout(function(){setRefreshing(false);},800); }

  // ─── MAIN ───
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hdr}><Text style={s.hdrT}>{t('team_header_title')}</Text><Text style={s.hdrSub}>{members.length} membre{members.length>1?'s':''}</Text></View>
      <View style={s.tabs}>
        {[{k:'members',l:t('team_tab_members')},{k:'groups',l:t('team_tab_groups')},{k:'private',l:t('team_tab_private')},{k:'missions',l:t('team_tab_missions')}].map(function(t2){
          var a=tab===t2.k; return <TouchableOpacity key={t2.k} style={[s.tabBtn,a&&{backgroundColor:T.accent,borderColor:T.accent}]} onPress={function(){setTab(t2.k);}}><Text style={[s.tabBtnT,a&&{color:'#fff'}]}>{t2.l}</Text></TouchableOpacity>;
        })}
      </View>
      <ScrollView style={{flex:1,backgroundColor:T.bg}} contentContainerStyle={{padding:16}} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={T.accent}/>}>
        {tab==='members' && <View>
          <TouchableOpacity style={s.addBtn} onPress={function(){setShowAdd(!showAdd);}}><Text style={s.addBtnT}>{showAdd?t('team_btn_close'):t('team_btn_add_member')}</Text></TouchableOpacity>
          {showAdd && <View style={s.addForm}><TextInput style={s.input} placeholder={t('team_placeholder_name')} placeholderTextColor={T.muted} value={name} onChangeText={setName} /><TextInput style={s.input} placeholder={t('team_placeholder_email')} placeholderTextColor={T.muted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" /><TouchableOpacity style={s.confirmBtn} onPress={addMember}><Text style={s.confirmBtnT}>Ajouter</Text></TouchableOpacity></View>}
          {members.map(function(m,i){ return <View key={m.id||i} style={s.memberCard}><Text style={{fontSize:18}}>👤</Text><View style={{flex:1}}><Text style={s.memberName}>{m.member_name}</Text><Text style={s.memberEmail}>{m.member_email}</Text>{m.user_id ? <Text style={{fontSize:9,color:'#34C759'}}>✓ Inscrit sur Keyla</Text> : <Text style={{fontSize:9,color:'#FF9500'}}>⚠ Pas encore inscrit</Text>}</View><TouchableOpacity style={{marginRight:8,opacity:m.user_id?1:0.3}} onPress={function(){openPrivateChat(m);}}><Text style={{fontSize:16}}>💬</Text></TouchableOpacity><TouchableOpacity onPress={function(){removeMember(m);}}><Text style={{color:'#DC3232',fontSize:11}}>✕</Text></TouchableOpacity></View>; })}
          {members.length===0&&!showAdd && <View style={s.empty}><Text style={{fontSize:40,marginBottom:12}}>👥</Text><Text style={s.emptyT}>{t('team_empty_members_title')}</Text><Text style={s.emptyS}>{t('team_empty_members_sub')}</Text></View>}
        </View>}
        {tab==='groups' && <View>
          <TouchableOpacity style={s.addBtn} onPress={function(){setShowAddGroup(!showAddGroup);}}><Text style={s.addBtnT}>{showAddGroup?t('team_btn_close'):t('team_btn_create_group')}</Text></TouchableOpacity>
          {showAddGroup && <View style={s.addForm}><TextInput style={s.input} placeholder={t('team_placeholder_group_name')} placeholderTextColor={T.muted} value={groupName} onChangeText={setGroupName} /><TouchableOpacity style={s.confirmBtn} onPress={createGroup}><Text style={s.confirmBtnT}>Creer</Text></TouchableOpacity></View>}
          {groups.map(function(g,i){
            var gmList=g.team_group_members||[];
            return <View key={g.id||i} style={s.groupCard}>
              <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:12,flex:1}} onPress={function(){openGroupChat(g);}}>
                <Text style={{fontSize:22}}>💬</Text>
                <View style={{flex:1}}><Text style={s.memberName}>{g.group_name}</Text><Text style={s.memberEmail}>{gmList.length} membre{gmList.length>1?'s':''}{gmList.length>0?' — '+gmList.map(function(gm){return gm.member_name;}).join(', '):''}</Text></View>
              </TouchableOpacity>
              <TouchableOpacity style={{paddingHorizontal:8}} onPress={function(){setAddToGroup(g);}}><Text style={{fontSize:14,color:'#34C759'}}>+👤</Text></TouchableOpacity>
              <TouchableOpacity onPress={function(){deleteGroup(g);}}><Text style={{color:'#DC3232',fontSize:11}}>✕</Text></TouchableOpacity>
            </View>;
          })}
          {groups.length===0&&!showAddGroup && <View style={s.empty}><Text style={{fontSize:40,marginBottom:12}}>💬</Text><Text style={s.emptyT}>{t('team_empty_groups')}</Text></View>}
        </View>}
        {tab==='private' && <View>
          {members.length>0 ? members.map(function(m,i){ return <TouchableOpacity key={m.id||i} style={[s.groupCard,!m.user_id&&{opacity:0.5}]} onPress={function(){openPrivateChat(m);}}><Text style={{fontSize:22}}>🔒</Text><View style={{flex:1}}><Text style={s.memberName}>{m.member_name}</Text><Text style={s.memberEmail}>{m.member_email}</Text>{!m.user_id && <Text style={{fontSize:9,color:'#FF9500'}}>⚠ Doit s'inscrire pour chatter</Text>}</View>{m.user_id && <Text style={{color:T.accent}}>›</Text>}</TouchableOpacity>; }) : <View style={s.empty}><Text style={{fontSize:40,marginBottom:12}}>🔒</Text><Text style={s.emptyT}>Ajoutez des membres d'abord</Text></View>}
        </View>}
        {tab==='missions' && <View>
          <TouchableOpacity style={s.addBtn} onPress={function(){setShowAddMission(!showAddMission);}}><Text style={s.addBtnT}>{showAddMission?t('team_btn_close'):t('team_btn_create_mission')}</Text></TouchableOpacity>
          {showAddMission && <View style={s.addForm}><TextInput style={s.input} placeholder={t('team_placeholder_mission_title')} placeholderTextColor={T.muted} value={missionTitle} onChangeText={setMissionTitle} /><TextInput style={s.input} placeholder={t('team_placeholder_mission_date')} placeholderTextColor={T.muted} value={missionDate} onChangeText={setMissionDate} /><TextInput style={[s.input,{minHeight:60,textAlignVertical:'top'}]} placeholder="Description..." placeholderTextColor={T.muted} value={missionDesc} onChangeText={setMissionDesc} multiline /><TouchableOpacity style={s.confirmBtn} onPress={createMission}><Text style={s.confirmBtnT}>Creer et notifier</Text></TouchableOpacity></View>}
          {missions.map(function(m,i){
            var done=m.status==='done';
            return <View key={m.id||i} style={[s.missionCard,done&&{opacity:0.5}]}>
              <TouchableOpacity style={{marginRight:10}} onPress={function(){toggleMission(m);}}><Text style={{fontSize:20}}>{done?'✅':'⬜'}</Text></TouchableOpacity>
              <View style={{flex:1}}><Text style={[s.memberName,done&&{textDecorationLine:'line-through'}]}>{m.title}</Text>{m.mission_date&&<Text style={s.memberEmail}>📅 {m.mission_date}</Text>}{m.description?<Text style={{fontSize:11,color:T.muted,marginTop:2}}>{m.description}</Text>:null}</View>
              <TouchableOpacity onPress={function(){deleteMission(m);}}><Text style={{color:'#DC3232',fontSize:11}}>✕</Text></TouchableOpacity>
            </View>;
          })}
          {missions.length===0&&!showAddMission && <View style={s.empty}><Text style={{fontSize:40,marginBottom:12}}>📋</Text><Text style={s.emptyT}>{t('team_empty_missions')}</Text></View>}
        </View>}
        <View style={{height:30}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  safe:{flex:1,backgroundColor:T.bg},
  hdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:14,backgroundColor:T.card,borderBottomWidth:1,borderBottomColor:T.border},
  hdrT:{fontSize:20,fontWeight:'700',color:T.accent},hdrSub:{fontSize:12,color:T.muted},
  tabs:{flexDirection:'row',gap:4,paddingHorizontal:12,paddingVertical:8,backgroundColor:T.card,borderBottomWidth:1,borderBottomColor:T.border},
  tabBtn:{flex:1,paddingVertical:7,borderRadius:10,borderWidth:1,borderColor:T.border,alignItems:'center'},
  tabBtnT:{fontSize:9,fontWeight:'600',color:T.text},
  sec:{fontSize:16,fontWeight:'700',color:T.text,marginBottom:8},
  addBtn:{backgroundColor:T.accent,borderRadius:12,paddingVertical:12,alignItems:'center',marginBottom:12},
  addBtnT:{color:'#fff',fontSize:14,fontWeight:'700'},
  addForm:{backgroundColor:T.card,borderRadius:14,padding:14,marginBottom:14,borderWidth:1,borderColor:T.accent},
  input:{backgroundColor:T.bg,borderWidth:1,borderColor:T.border,borderRadius:10,paddingHorizontal:12,paddingVertical:10,fontSize:14,color:T.text,marginBottom:8},
  confirmBtn:{backgroundColor:'#34C759',borderRadius:10,paddingVertical:12,alignItems:'center',marginTop:4},
  confirmBtnT:{color:'#fff',fontSize:14,fontWeight:'700'},
  memberCard:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:T.card,borderRadius:12,padding:12,marginBottom:6,borderWidth:1,borderColor:T.border},
  memberName:{fontSize:14,fontWeight:'600',color:T.text},memberEmail:{fontSize:11,color:T.muted,marginTop:2},
  groupCard:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:T.card,borderRadius:12,padding:14,marginBottom:6,borderWidth:1,borderColor:T.border},
  missionCard:{flexDirection:'row',alignItems:'center',backgroundColor:T.card,borderRadius:12,padding:12,marginBottom:6,borderWidth:1,borderColor:T.border},
  empty:{backgroundColor:T.card,borderRadius:16,padding:30,alignItems:'center',borderWidth:1,borderColor:T.border,marginTop:10},
  emptyT:{fontSize:16,fontWeight:'600',color:T.text,marginBottom:6},emptyS:{fontSize:13,color:T.muted,textAlign:'center'},
  chatBar:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,paddingVertical:10,backgroundColor:T.card,borderTopWidth:1,borderTopColor:T.border},
  chatInput:{flex:1,backgroundColor:T.bg,borderWidth:1,borderColor:T.border,borderRadius:20,paddingHorizontal:14,paddingVertical:8,fontSize:14,color:T.text},
  photoBtn:{width:40,height:40,borderRadius:20,backgroundColor:T.bg,alignItems:'center',justifyContent:'center'},
  sendBtn:{width:40,height:40,borderRadius:20,backgroundColor:T.accent,alignItems:'center',justifyContent:'center'},
  msgBubble:{maxWidth:'80%',borderRadius:16,padding:10,marginBottom:8},
  msgMe:{alignSelf:'flex-end',backgroundColor:T.accent},msgOther:{alignSelf:'flex-start',backgroundColor:T.card,borderWidth:1,borderColor:T.border},
  msgSender:{fontSize:10,fontWeight:'600',color:T.accent,marginBottom:4},
  msgText:{fontSize:14,color:T.text,lineHeight:20},msgTime:{fontSize:9,color:T.muted,marginTop:4,alignSelf:'flex-end'},
  msgImg:{width:200,height:150,borderRadius:12,marginBottom:4},
});
