import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../config/supabase';
import T from '../../theme';

export default function AdminPanel(props) {
  var _users = useState([]); var users = _users[0]; var setUsers = _users[1];
  var _search = useState(''); var search = _search[0]; var setSearch = _search[1];
  var _loading = useState(false); var loading = _loading[0]; var setLoading = _loading[1];
  var _stats = useState({}); var stats = _stats[0]; var setStats = _stats[1];
  var _refreshing = useState(false); var refreshing = _refreshing[0]; var setRefreshing = _refreshing[1];
  var _selUser = useState(null); var selUser = _selUser[0]; var setSelUser = _selUser[1];

  useEffect(function() { loadStats(); loadUsers(); }, []);

  function loadStats() {
    supabase.from('profiles').select('id', { count: 'exact' }).then(function(r) {
      var s = stats; s.totalUsers = r.count || 0;
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'host').then(function(r2) { s.hosts = r2.count || 0;
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'cleaner').then(function(r3) { s.cleaners = r3.count || 0;
          supabase.from('profiles').select('id', { count: 'exact' }).eq('subscription_plan', 'trial').then(function(r4) { s.trials = r4.count || 0;
            supabase.from('profiles').select('id', { count: 'exact' }).in('subscription_plan', ['starter','pro','business']).then(function(r5) { s.paying = r5.count || 0;
              supabase.from('properties').select('id', { count: 'exact' }).then(function(r6) { s.properties = r6.count || 0;
                supabase.from('cleaning_bookings').select('id', { count: 'exact' }).then(function(r7) { s.bookings = r7.count || 0;
                  setStats(Object.assign({}, s));
                });
              });
            });
          });
        });
      });
    });
  }

  function loadUsers() {
    setLoading(true);
    var q = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50);
    if (search.trim()) q = q.ilike('email', '%' + search.trim() + '%');
    q.then(function(r) { setLoading(false); if (r.data) setUsers(r.data); });
  }

  function changePlan(userId, email, plan) {
    Alert.alert('Changer le plan', 'Mettre ' + email + ' en plan ' + plan + ' ?', [
      { text: 'Annuler' },
      { text: 'Confirmer', onPress: function() {
        supabase.from('profiles').update({ subscription_plan: plan, subscription_status: plan === 'free' ? 'inactive' : 'active' }).eq('id', userId).then(function() {
          Alert.alert('Plan modifie ✅', email + ' → ' + plan);
          loadUsers();
        });
      }}
    ]);
  }

  function extendTrial(userId, email, days) {
    var newEnd = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
    supabase.from('profiles').update({ subscription_plan: 'trial', trial_ends_at: newEnd, trial_email_j7_sent: false, trial_email_j1_sent: false, trial_email_end_sent: false }).eq('id', userId).then(function() {
      Alert.alert('Trial prolonge ✅', email + ' → +' + days + ' jours');
      loadUsers();
    });
  }

  function viewUserDetails(user) {
    setSelUser(user);
    // Charger les logements et bookings de cet utilisateur
    supabase.from('properties').select('name,city,address').eq('user_id', user.id).then(function(r) {
      supabase.from('cleaning_bookings').select('date,status,properties(name)').eq('host_id', user.id).order('date', { ascending: false }).limit(10).then(function(r2) {
        var props = r.data ? r.data.map(function(p) { return p.name + (p.city ? ' (' + p.city + ')' : ''); }).join('\n  ') : 'Aucun';
        var books = r2.data ? r2.data.map(function(b) { return b.date + ' — ' + b.status + (b.properties ? ' — ' + b.properties.name : ''); }).join('\n  ') : 'Aucun';
        Alert.alert(
          'Utilisateur: ' + user.email,
          'Role: ' + user.role + '\nPlan: ' + (user.subscription_plan || 'free') + '\nInscription: ' + new Date(user.created_at).toLocaleDateString('fr-FR') + (user.trial_ends_at ? '\nFin trial: ' + new Date(user.trial_ends_at).toLocaleDateString('fr-FR') : '') + '\n\nLogements:\n  ' + props + '\n\nDerniers bookings:\n  ' + books,
          [
            { text: 'Fermer' },
            { text: 'Gratuit', onPress: function() { changePlan(user.id, user.email, 'free'); }},
            { text: '+30j trial', onPress: function() { extendTrial(user.id, user.email, 30); }},
            { text: 'Pro', onPress: function() { changePlan(user.id, user.email, 'pro'); }},
          ]
        );
      });
    });
  }

  function refresh() { setRefreshing(true); loadStats(); loadUsers(); setTimeout(function() { setRefreshing(false); }, 800); }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hdr}><Text style={s.hdrT}>Admin MyHostKit</Text><Text style={s.hdrSub}>👑 m.rayane8306</Text></View>
      <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={T.accent} />}>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statCard}><Text style={s.statNum}>{stats.totalUsers||0}</Text><Text style={s.statLabel}>Utilisateurs</Text></View>
          <View style={s.statCard}><Text style={s.statNum}>{stats.hosts||0}</Text><Text style={s.statLabel}>Hotes</Text></View>
          <View style={s.statCard}><Text style={s.statNum}>{stats.cleaners||0}</Text><Text style={s.statLabel}>Menageres</Text></View>
        </View>
        <View style={s.statsRow}>
          <View style={s.statCard}><Text style={s.statNum}>{stats.trials||0}</Text><Text style={s.statLabel}>En trial</Text></View>
          <View style={s.statCard}><Text style={s.statNum}>{stats.paying||0}</Text><Text style={s.statLabel}>Payants</Text></View>
          <View style={s.statCard}><Text style={s.statNum}>{stats.properties||0}</Text><Text style={s.statLabel}>Logements</Text></View>
        </View>

        {/* Recherche */}
        <View style={s.searchWrap}>
          <TextInput style={s.searchInput} placeholder="Rechercher un email..." placeholderTextColor={T.muted} value={search} onChangeText={setSearch} autoCapitalize="none" onSubmitEditing={loadUsers} />
          <TouchableOpacity style={s.searchBtn} onPress={loadUsers}><Text style={s.searchBtnT}>🔍</Text></TouchableOpacity>
        </View>

        {/* Liste users */}
        {loading && <ActivityIndicator style={{ marginTop: 20 }} color={T.accent} />}
        {users.map(function(u, i) {
          var planColor = u.subscription_plan === 'pro' ? '#34C759' : u.subscription_plan === 'starter' ? '#1C5F8A' : u.subscription_plan === 'trial' ? '#C8965A' : '#9B9B9B';
          var trialLeft = u.trial_ends_at ? Math.max(0, Math.ceil((new Date(u.trial_ends_at) - new Date()) / 86400000)) : null;
          return (
            <TouchableOpacity key={u.id||i} style={s.userCard} onPress={function(){ viewUserDetails(u); }}>
              <View style={{flex:1}}>
                <Text style={s.userEmail}>{u.email}</Text>
                <Text style={s.userMeta}>{u.role} · <Text style={{color:planColor,fontWeight:'700'}}>{u.subscription_plan||'free'}</Text>{trialLeft !== null && u.subscription_plan === 'trial' ? ' · ' + trialLeft + 'j' : ''}</Text>
              </View>
              <Text style={{fontSize:16}}>›</Text>
            </TouchableOpacity>
          );
        })}
        <View style={{height:30}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  safe:{flex:1,backgroundColor:T.bg},
  hdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:14,backgroundColor:T.card,borderBottomWidth:1,borderBottomColor:T.border},
  hdrT:{fontSize:20,fontWeight:'700',color:T.accent},hdrSub:{fontSize:12,color:T.muted},
  statsRow:{flexDirection:'row',gap:8,marginBottom:8},
  statCard:{flex:1,backgroundColor:T.card,borderRadius:12,padding:12,alignItems:'center',borderWidth:1,borderColor:T.border},
  statNum:{fontSize:22,fontWeight:'700',color:T.accent},statLabel:{fontSize:10,color:T.muted,marginTop:2},
  searchWrap:{flexDirection:'row',marginBottom:12,gap:8},
  searchInput:{flex:1,backgroundColor:T.card,borderWidth:1,borderColor:T.border,borderRadius:12,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:T.text},
  searchBtn:{backgroundColor:T.accent,borderRadius:12,width:44,alignItems:'center',justifyContent:'center'},searchBtnT:{fontSize:18},
  userCard:{flexDirection:'row',alignItems:'center',backgroundColor:T.card,borderRadius:12,padding:12,marginBottom:6,borderWidth:1,borderColor:T.border},
  userEmail:{fontSize:13,fontWeight:'600',color:T.text},userMeta:{fontSize:11,color:T.muted,marginTop:2},
});
