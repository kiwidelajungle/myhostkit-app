import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import T from '../../theme';

export default function AdminDashboard(props) {
  var _s = useState({}); var s = _s[0]; var setS = _s[1];
  var _recent = useState([]); var recent = _recent[0]; var setRecent = _recent[1];
  var _refreshing = useState(false); var refreshing = _refreshing[0]; var setRefreshing = _refreshing[1];

  function load() {
    var stats = {};
    // Users
    supabase.from('profiles').select('id, role, subscription_plan, subscription_status, created_at, trial_ends_at', { count: 'exact' }).then(function(r) {
      var d = r.data || [];
      stats.totalUsers = d.length;
      stats.hosts = d.filter(function(u){return u.role==='host';}).length;
      stats.cleaners = d.filter(function(u){return u.role==='cleaner';}).length;
      stats.admins = d.filter(function(u){return u.role==='admin';}).length;
      stats.planFree = d.filter(function(u){return u.subscription_plan==='free';}).length;
      stats.planTrial = d.filter(function(u){return u.subscription_plan==='trial';}).length;
      stats.planStarter = d.filter(function(u){return u.subscription_plan==='starter';}).length;
      stats.planPro = d.filter(function(u){return u.subscription_plan==='pro';}).length;
      stats.planBusiness = d.filter(function(u){return u.subscription_plan==='business';}).length;
      stats.suspended = d.filter(function(u){return u.subscription_status==='past_due'||u.subscription_status==='suspended';}).length;
      // Inscrits aujourd'hui
      var today = new Date().toISOString().split('T')[0];
      stats.newToday = d.filter(function(u){return u.created_at && u.created_at.startsWith(today);}).length;
      // Inscrits cette semaine
      var weekAgo = new Date(Date.now()-7*86400000).toISOString();
      stats.newWeek = d.filter(function(u){return u.created_at > weekAgo;}).length;
      // Trials qui expirent dans 3 jours
      var in3d = new Date(Date.now()+3*86400000).toISOString();
      stats.trialExpiring = d.filter(function(u){return u.subscription_plan==='trial' && u.trial_ends_at && u.trial_ends_at < in3d;}).length;

      // Properties
      supabase.from('properties').select('id', { count: 'exact' }).then(function(pr) {
        stats.totalProperties = (pr.data||[]).length;
        // Bookings
        supabase.from('cleaning_bookings').select('id, status, date, created_at', { count: 'exact' }).then(function(br) {
          var bd = br.data || [];
          stats.totalBookings = bd.length;
          stats.bookingsPending = bd.filter(function(b){return b.status==='pending';}).length;
          stats.bookingsConfirmed = bd.filter(function(b){return b.status==='confirmed';}).length;
          stats.bookingsReportSent = bd.filter(function(b){return b.status==='report_sent';}).length;
          stats.bookingsValidated = bd.filter(function(b){return b.status==='validated';}).length;
          stats.bookingsDisputed = bd.filter(function(b){return b.status==='disputed';}).length;
          stats.bookingsToday = bd.filter(function(b){return b.date===today;}).length;
          // Cleaners
          supabase.from('cleaners').select('id', { count: 'exact' }).then(function(cr) {
            stats.totalCleaners = (cr.data||[]).length;
            // Reviews
            supabase.from('reviews').select('id, rating').then(function(rv) {
              stats.totalReviews = (rv.data||[]).length;
              if (rv.data && rv.data.length) stats.avgRating = (rv.data.reduce(function(a,b){return a+b.rating;},0)/rv.data.length).toFixed(1);
              // Referrals
              supabase.from('referrals').select('id', { count: 'exact' }).then(function(ref) {
                stats.totalReferrals = (ref.data||[]).length;
                // Messages
                supabase.from('team_messages').select('id', { count: 'exact' }).then(function(tm) {
                  stats.totalMessages = (tm.data||[]).length;
                  // Revenus commissions sur prestations validées
                  supabase.from('cleaning_bookings').select('payment_amount, status').in('status', ['validated','completed']).then(function(rv2) {
                    var totalRevenue = 0;
                    if (rv2.data) rv2.data.forEach(function(b) { if (b.payment_amount) totalRevenue += b.payment_amount * 0.15; });
                    stats.commissionRevenue = totalRevenue.toFixed(2);
                    stats.validatedBookings = rv2.data ? rv2.data.length : 0;
                    setS(stats);
                  });
                });
              });
            });
          });
        });
      });
    });
    // Dernières inscriptions
    supabase.from('profiles').select('email, role, subscription_plan, created_at').order('created_at', { ascending: false }).limit(10).then(function(r) {
      if (r.data) setRecent(r.data);
    });
  }

  useFocusEffect(useCallback(function() { load(); }, []));
  function refresh() { setRefreshing(true); load(); setTimeout(function(){setRefreshing(false);},800); }

  function StatCard(p) {
    return <View style={st.statCard}><Text style={st.statVal}>{p.val}</Text><Text style={st.statLabel}>{p.label}</Text></View>;
  }

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <View style={st.hdr}><Text style={st.hdrT}>📊 Dashboard Admin</Text></View>
      <ScrollView style={{flex:1,backgroundColor:T.bg}} contentContainerStyle={{padding:16}} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={T.accent}/>}>

        <Text style={st.sec}>👥 Utilisateurs</Text>
        <View style={st.row}>
          <StatCard val={s.totalUsers||0} label="Total" />
          <StatCard val={s.hosts||0} label="Hotes" />
          <StatCard val={s.cleaners||0} label="Menageres" />
          <StatCard val={s.newToday||0} label="Auj." />
        </View>
        <View style={st.row}>
          <StatCard val={s.newWeek||0} label="7 derniers j" />
          <StatCard val={s.trialExpiring||0} label="Trial expire" />
          <StatCard val={s.suspended||0} label="Suspendus" />
        </View>

        <Text style={st.sec}>💳 Plans</Text>
        <View style={st.row}>
          <StatCard val={s.planFree||0} label="Gratuit" />
          <StatCard val={s.planTrial||0} label="Trial" />
          <StatCard val={s.planStarter||0} label="Starter" />
          <StatCard val={s.planPro||0} label="Pro" />
        </View>
        <View style={st.row}>
          <StatCard val={s.planBusiness||0} label="Business" />
          <StatCard val={((s.planStarter||0)*49+(s.planPro||0)*89+(s.planBusiness||0)*39)+'€'} label="MRR abos" />
        </View>

        <Text style={st.sec}>💰 Revenus commissions</Text>
        <View style={st.row}>
          <StatCard val={(s.commissionRevenue||'0')+'€'} label="Commission totale" />
          <StatCard val={s.validatedBookings||0} label="Prestations validees" />
          <StatCard val={((s.planStarter||0)*49+(s.planPro||0)*89+(s.planBusiness||0)*39+parseFloat(s.commissionRevenue||0)).toFixed(0)+'€'} label="Revenu total" />
        </View>

        <Text style={st.sec}>📋 Activite</Text>
        <View style={st.row}>
          <StatCard val={s.totalProperties||0} label="Logements" />
          <StatCard val={s.totalCleaners||0} label="Profils menag" />
          <StatCard val={s.totalBookings||0} label="Reservations" />
          <StatCard val={s.bookingsToday||0} label="Auj." />
        </View>
        <View style={st.row}>
          <StatCard val={s.bookingsPending||0} label="En attente" />
          <StatCard val={s.bookingsConfirmed||0} label="Confirmes" />
          <StatCard val={s.bookingsReportSent||0} label="Rapport" />
          <StatCard val={s.bookingsDisputed||0} label="Litiges" />
        </View>

        <Text style={st.sec}>⭐ Engagement</Text>
        <View style={st.row}>
          <StatCard val={s.totalReviews||0} label="Avis" />
          <StatCard val={s.avgRating||'-'} label="Note moy." />
          <StatCard val={s.totalReferrals||0} label="Parrainages" />
          <StatCard val={s.totalMessages||0} label="Messages" />
        </View>

        <Text style={st.sec}>🕐 Dernieres inscriptions</Text>
        {recent.map(function(u, i) {
          var planColor = u.subscription_plan==='pro'?'#34C759':u.subscription_plan==='starter'?'#1C5F8A':u.subscription_plan==='trial'?'#C8965A':'#9B9B9B';
          return <View key={i} style={st.recentRow}>
            <View style={{flex:1}}>
              <Text style={st.recentEmail}>{u.email}</Text>
              <Text style={st.recentMeta}>{u.role} · {u.subscription_plan||'free'}</Text>
            </View>
            <View style={[st.planBadge,{backgroundColor:planColor+'20'}]}><Text style={[st.planBadgeT,{color:planColor}]}>{u.subscription_plan||'free'}</Text></View>
            <Text style={st.recentDate}>{u.created_at?new Date(u.created_at).toLocaleDateString('fr-FR'):''}</Text>
          </View>;
        })}

        <View style={{height:30}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

var st = StyleSheet.create({
  safe:{flex:1,backgroundColor:T.bg},
  hdr:{paddingHorizontal:16,paddingVertical:14,backgroundColor:T.card,borderBottomWidth:1,borderBottomColor:T.border},
  hdrT:{fontSize:20,fontWeight:'700',color:T.accent},
  sec:{fontSize:15,fontWeight:'700',color:T.text,marginTop:16,marginBottom:8},
  row:{flexDirection:'row',gap:8,marginBottom:8},
  statCard:{flex:1,backgroundColor:T.card,borderRadius:12,padding:12,alignItems:'center',borderWidth:1,borderColor:T.border},
  statVal:{fontSize:20,fontWeight:'800',color:T.accent},
  statLabel:{fontSize:9,color:T.muted,marginTop:2,textAlign:'center'},
  recentRow:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:T.card,borderRadius:10,padding:10,marginBottom:4,borderWidth:1,borderColor:T.border},
  recentEmail:{fontSize:12,fontWeight:'600',color:T.text},
  recentMeta:{fontSize:10,color:T.muted},
  recentDate:{fontSize:9,color:T.muted},
  planBadge:{borderRadius:6,paddingHorizontal:6,paddingVertical:2},
  planBadgeT:{fontSize:9,fontWeight:'700'},
});
