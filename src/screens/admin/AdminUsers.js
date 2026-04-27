import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import T from '../../theme';

export default function AdminUsers(props) {
  var _users = useState([]); var users = _users[0]; var setUsers = _users[1];
  var _search = useState(''); var search = _search[0]; var setSearch = _search[1];
  var _filter = useState('all'); var filter = _filter[0]; var setFilter = _filter[1];
  var _detail = useState(null); var detail = _detail[0]; var setDetail = _detail[1];
  var _detailProps = useState([]); var detailProps = _detailProps[0]; var setDetailProps = _detailProps[1];
  var _detailBookings = useState([]); var detailBookings = _detailBookings[0]; var setDetailBookings = _detailBookings[1];
  var _detailReviews = useState([]); var detailReviews = _detailReviews[0]; var setDetailReviews = _detailReviews[1];
  var _refreshing = useState(false); var refreshing = _refreshing[0]; var setRefreshing = _refreshing[1];

  function loadUsers() {
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200).then(function(r) {
      if (r.data) setUsers(r.data);
    });
  }

  useFocusEffect(useCallback(function() { loadUsers(); }, []));

  function viewDetail(u) {
    setDetail(u);
    // Charger ses propriétés
    supabase.from('properties').select('*').eq('user_id', u.id).then(function(r) { setDetailProps(r.data || []); });
    // Charger ses bookings
    supabase.from('cleaning_bookings').select('*, properties(name), cleaners(company_name)').or('host_id.eq.' + u.id).order('created_at', { ascending: false }).limit(20).then(function(r) { setDetailBookings(r.data || []); });
    // Charger ses avis
    supabase.from('reviews').select('*').eq('reviewer_id', u.id).order('created_at', { ascending: false }).limit(10).then(function(r) { setDetailReviews(r.data || []); });
  }

  function changePlan(userId, email, plan) {
    var upd = { subscription_plan: plan, subscription_status: 'active' };
    if (plan === 'trial') { upd.trial_started_at = new Date().toISOString(); upd.trial_ends_at = new Date(Date.now()+30*86400000).toISOString(); }
    supabase.from('profiles').update(upd).eq('id', userId).then(function(r) {
      if (r.error) Alert.alert('Erreur', r.error.message);
      else { Alert.alert('Plan modifie ✅', email + ' → ' + plan); loadUsers(); if (detail) viewDetail({...detail, subscription_plan: plan}); }
    });
  }

  function addDays(userId, email, days) {
    supabase.from('profiles').select('trial_ends_at').eq('id', userId).single().then(function(pr) {
      var end = (pr.data && pr.data.trial_ends_at) ? new Date(pr.data.trial_ends_at) : new Date();
      if (end < new Date()) end = new Date();
      end.setDate(end.getDate() + days);
      supabase.from('profiles').update({ subscription_plan: 'trial', trial_ends_at: end.toISOString(), subscription_status: 'active', trial_email_j7_sent: false, trial_email_j1_sent: false, trial_email_end_sent: false }).eq('id', userId).then(function() {
        Alert.alert('+' + days + 'j ✅', email + ' → fin ' + end.toLocaleDateString('fr-FR'));
        loadUsers();
      });
    });
  }

  function changeRole(userId, email, role) {
    supabase.from('profiles').update({ role: role }).eq('id', userId).then(function() {
      Alert.alert('Role modifie ✅', email + ' → ' + role); loadUsers();
    });
  }

  function suspendUser(userId, email) {
    Alert.alert('Suspendre ' + email + ' ?', 'L\'utilisateur ne pourra plus utiliser l\'app.', [
      { text: 'Annuler' },
      { text: 'Suspendre', style: 'destructive', onPress: function() {
        supabase.from('profiles').update({ subscription_status: 'suspended', subscription_plan: 'free' }).eq('id', userId).then(function() {
          Alert.alert('Utilisateur suspendu ✅'); loadUsers();
        });
      }}
    ]);
  }

  var filtered = users.filter(function(u) {
    if (search && !(u.email||'').toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'host') return u.role === 'host';
    if (filter === 'cleaner') return u.role === 'cleaner';
    if (filter === 'trial') return u.subscription_plan === 'trial';
    if (filter === 'paid') return u.subscription_plan === 'starter' || u.subscription_plan === 'pro' || u.subscription_plan === 'business';
    if (filter === 'suspended') return u.subscription_status === 'suspended' || u.subscription_status === 'past_due';
    return true;
  });

  // ─── USER DETAIL VIEW ───
  if (detail) {
    var u = detail;
    var trialEnd = u.trial_ends_at ? new Date(u.trial_ends_at).toLocaleDateString('fr-FR') : '-';
    var created = u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '-';
    return (
      <SafeAreaView style={st.safe} edges={['top']}>
        <View style={st.hdr}>
          <TouchableOpacity onPress={function(){setDetail(null);}}><Text style={{fontSize:16,color:T.accent}}>← Retour</Text></TouchableOpacity>
          <Text style={[st.hdrT,{flex:1,textAlign:'center'}]}>Detail utilisateur</Text>
        </View>
        <ScrollView style={{flex:1,backgroundColor:T.bg}} contentContainerStyle={{padding:16}}>
          {/* Infos principales */}
          <View style={st.detailCard}>
            <Text style={st.detailEmail}>{u.email}</Text>
            <View style={{flexDirection:'row',gap:6,marginTop:6,flexWrap:'wrap'}}>
              <View style={[st.badge,{backgroundColor:'#E8F4FB'}]}><Text style={[st.badgeT,{color:'#1C5F8A'}]}>{u.role}</Text></View>
              <View style={[st.badge,{backgroundColor:u.subscription_plan==='pro'?'#E8FBE8':u.subscription_plan==='starter'?'#E8F4FB':'#FFF4E6'}]}><Text style={[st.badgeT,{color:u.subscription_plan==='pro'?'#34C759':u.subscription_plan==='starter'?'#1C5F8A':'#C8965A'}]}>{u.subscription_plan||'free'}</Text></View>
              <View style={[st.badge,{backgroundColor:u.subscription_status==='active'?'#E8FBE8':'#FDE8E8'}]}><Text style={[st.badgeT,{color:u.subscription_status==='active'?'#34C759':'#DC3232'}]}>{u.subscription_status||'inactive'}</Text></View>
            </View>
            <Text style={st.detailMeta}>Inscrit: {created} · Trial fin: {trialEnd}</Text>
            <Text style={st.detailMeta}>Code parrain: {u.referral_code || '-'} · Parraine par: {u.referred_by || '-'}</Text>
          </View>

          {/* Actions rapides */}
          <Text style={st.sec}>⚡ Actions</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
            <TouchableOpacity style={[st.actBtn,{backgroundColor:'#C8965A'}]} onPress={function(){addDays(u.id,u.email,7);}}><Text style={st.actBtnT}>+7j</Text></TouchableOpacity>
            <TouchableOpacity style={[st.actBtn,{backgroundColor:'#E8A850'}]} onPress={function(){addDays(u.id,u.email,30);}}><Text style={st.actBtnT}>+30j</Text></TouchableOpacity>
            <TouchableOpacity style={[st.actBtn,{backgroundColor:'#9B9B9B'}]} onPress={function(){changePlan(u.id,u.email,'free');}}><Text style={st.actBtnT}>→ Gratuit</Text></TouchableOpacity>
            <TouchableOpacity style={[st.actBtn,{backgroundColor:'#1C5F8A'}]} onPress={function(){changePlan(u.id,u.email,'starter');}}><Text style={st.actBtnT}>→ Starter</Text></TouchableOpacity>
            <TouchableOpacity style={[st.actBtn,{backgroundColor:'#34C759'}]} onPress={function(){changePlan(u.id,u.email,'pro');}}><Text style={st.actBtnT}>→ Pro</Text></TouchableOpacity>
            <TouchableOpacity style={[st.actBtn,{backgroundColor:'#9B59B6'}]} onPress={function(){changePlan(u.id,u.email,'business');}}><Text style={st.actBtnT}>→ Business</Text></TouchableOpacity>
            <TouchableOpacity style={[st.actBtn,{backgroundColor:'#FF9500'}]} onPress={function(){changeRole(u.id,u.email,u.role==='host'?'cleaner':'host');}}><Text style={st.actBtnT}>Role → {u.role==='host'?'cleaner':'host'}</Text></TouchableOpacity>
            <TouchableOpacity style={[st.actBtn,{backgroundColor:'#DC3232'}]} onPress={function(){suspendUser(u.id,u.email);}}><Text style={st.actBtnT}>Suspendre</Text></TouchableOpacity>
          </View>

          {/* Propriétés */}
          <Text style={st.sec}>🏠 Logements ({detailProps.length})</Text>
          {detailProps.length > 0 ? detailProps.map(function(p,i) {
            return <View key={i} style={st.itemRow}><Text style={st.itemName}>{p.name||'Sans nom'}</Text><Text style={st.itemMeta}>{p.address||''}, {p.city||''}</Text></View>;
          }) : <Text style={st.empty}>Aucun logement</Text>}

          {/* Bookings */}
          <Text style={st.sec}>📋 Reservations ({detailBookings.length})</Text>
          {detailBookings.length > 0 ? detailBookings.map(function(b,i) {
            var statusColor = b.status==='validated'?'#34C759':b.status==='disputed'?'#DC3232':b.status==='report_sent'?'#FF9500':'#1C5F8A';
            return <View key={i} style={st.itemRow}>
              <View style={{flex:1}}>
                <Text style={st.itemName}>{b.properties?b.properties.name:'?'} · {b.date}</Text>
                <Text style={st.itemMeta}>{b.cleaners?b.cleaners.company_name:'?'} · {b.time||''}</Text>
              </View>
              <View style={[st.badge,{backgroundColor:statusColor+'20'}]}><Text style={[st.badgeT,{color:statusColor}]}>{b.status}</Text></View>
            </View>;
          }) : <Text style={st.empty}>Aucune reservation</Text>}

          {/* Avis donnés */}
          <Text style={st.sec}>⭐ Avis donnes ({detailReviews.length})</Text>
          {detailReviews.length > 0 ? detailReviews.map(function(rv,i) {
            return <View key={i} style={st.itemRow}><Text style={st.itemName}>{'★'.repeat(rv.rating)}{'☆'.repeat(5-rv.rating)}</Text><Text style={st.itemMeta}>{rv.comment||'Pas de commentaire'}</Text></View>;
          }) : <Text style={st.empty}>Aucun avis</Text>}

          <View style={{height:30}}/>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── LIST VIEW ───
  function refresh() { setRefreshing(true); loadUsers(); setTimeout(function(){setRefreshing(false);},800); }

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <View style={st.hdr}><Text style={st.hdrT}>👥 Utilisateurs ({filtered.length})</Text></View>
      <View style={{paddingHorizontal:16,paddingVertical:8,backgroundColor:T.card,borderBottomWidth:1,borderBottomColor:T.border}}>
        <TextInput style={st.searchInput} placeholder="Rechercher par email..." placeholderTextColor={T.muted} value={search} onChangeText={setSearch} autoCapitalize="none" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6,paddingVertical:6}}>
          {[{k:'all',l:'Tous'},{k:'host',l:'Hotes'},{k:'cleaner',l:'Menageres'},{k:'trial',l:'Trial'},{k:'paid',l:'Payants'},{k:'suspended',l:'Suspendus'}].map(function(f2){
            var a=filter===f2.k;
            return <TouchableOpacity key={f2.k} style={[st.filterBtn,a&&{backgroundColor:T.accent}]} onPress={function(){setFilter(f2.k);}}><Text style={[st.filterBtnT,a&&{color:'#fff'}]}>{f2.l}</Text></TouchableOpacity>;
          })}
        </ScrollView>
      </View>
      <ScrollView style={{flex:1,backgroundColor:T.bg}} contentContainerStyle={{padding:16}} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={T.accent}/>}>
        {filtered.map(function(u, i) {
          var planColor = u.subscription_plan==='pro'?'#34C759':u.subscription_plan==='starter'?'#1C5F8A':u.subscription_plan==='business'?'#9B59B6':u.subscription_plan==='trial'?'#C8965A':'#9B9B9B';
          return (
            <TouchableOpacity key={u.id||i} style={st.userCard} onPress={function(){viewDetail(u);}}>
              <View style={{flex:1}}>
                <Text style={st.userEmail}>{u.email}</Text>
                <Text style={st.userMeta}>{u.role} · inscrit {u.created_at?new Date(u.created_at).toLocaleDateString('fr-FR'):''}</Text>
              </View>
              <View style={[st.badge,{backgroundColor:planColor+'20'}]}><Text style={[st.badgeT,{color:planColor}]}>{u.subscription_plan||'free'}</Text></View>
              <Text style={{color:T.accent,marginLeft:8}}>›</Text>
            </TouchableOpacity>
          );
        })}
        {filtered.length === 0 && <Text style={{textAlign:'center',color:T.muted,marginTop:40}}>Aucun utilisateur</Text>}
        <View style={{height:30}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

var st = StyleSheet.create({
  safe:{flex:1,backgroundColor:T.bg},
  hdr:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,backgroundColor:T.card,borderBottomWidth:1,borderBottomColor:T.border},
  hdrT:{fontSize:20,fontWeight:'700',color:T.accent},
  sec:{fontSize:15,fontWeight:'700',color:T.text,marginTop:16,marginBottom:8},
  searchInput:{backgroundColor:T.bg,borderWidth:1,borderColor:T.border,borderRadius:10,paddingHorizontal:12,paddingVertical:8,fontSize:14,color:T.text},
  filterBtn:{paddingHorizontal:12,paddingVertical:6,borderRadius:8,backgroundColor:T.card,borderWidth:1,borderColor:T.border},
  filterBtnT:{fontSize:11,fontWeight:'600',color:T.text},
  userCard:{flexDirection:'row',alignItems:'center',backgroundColor:T.card,borderRadius:12,padding:12,marginBottom:6,borderWidth:1,borderColor:T.border},
  userEmail:{fontSize:13,fontWeight:'600',color:T.text},
  userMeta:{fontSize:10,color:T.muted,marginTop:2},
  badge:{borderRadius:6,paddingHorizontal:8,paddingVertical:2},
  badgeT:{fontSize:10,fontWeight:'700'},
  detailCard:{backgroundColor:T.card,borderRadius:14,padding:16,borderWidth:1,borderColor:T.accent},
  detailEmail:{fontSize:18,fontWeight:'700',color:T.text},
  detailMeta:{fontSize:11,color:T.muted,marginTop:6},
  actBtn:{paddingHorizontal:12,paddingVertical:8,borderRadius:8},
  actBtnT:{color:'#fff',fontSize:11,fontWeight:'700'},
  itemRow:{flexDirection:'row',alignItems:'center',backgroundColor:T.card,borderRadius:10,padding:10,marginBottom:4,borderWidth:1,borderColor:T.border},
  itemName:{fontSize:12,fontWeight:'600',color:T.text},
  itemMeta:{fontSize:10,color:T.muted,marginTop:2},
  empty:{fontSize:12,color:T.muted,fontStyle:'italic',paddingVertical:8},
});
