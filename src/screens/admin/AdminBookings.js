import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import T from '../../theme';

export default function AdminBookings(props) {
  var _bookings = useState([]); var bookings = _bookings[0]; var setBookings = _bookings[1];
  var _filter = useState('all'); var filter = _filter[0]; var setFilter = _filter[1];
  var _refreshing = useState(false); var refreshing = _refreshing[0]; var setRefreshing = _refreshing[1];

  function load() {
    supabase.from('cleaning_bookings').select('*, properties(name, city), cleaners(company_name, contact_name, email)').order('created_at', { ascending: false }).limit(100).then(function(r) {
      if (r.data) setBookings(r.data);
    });
  }

  useFocusEffect(useCallback(function() { load(); }, []));

  function changeStatus(id, status) {
    supabase.from('cleaning_bookings').update({ status: status }).eq('id', id).then(function(r) {
      if (r.error) Alert.alert('Erreur', r.error.message);
      else { Alert.alert('Statut modifie ✅', '→ ' + status); load(); }
    });
  }

  function forceValidate(b) {
    Alert.alert('Forcer la validation ?', 'Liberer le paiement et valider le menage.', [
      { text: 'Annuler' },
      { text: 'Forcer', onPress: function() {
        supabase.from('cleaning_bookings').update({ status: 'validated', payment_released_at: new Date().toISOString() }).eq('id', b.id).then(function() { Alert.alert('Valide ✅'); load(); });
      }}
    ]);
  }

  function resolveDispute(b, decision) {
    if (decision === 'refund') {
      supabase.from('cleaning_bookings').update({ status: 'refunded', dispute_resolved_at: new Date().toISOString() }).eq('id', b.id).then(function() { Alert.alert('Rembourse ✅'); load(); });
    } else {
      supabase.from('cleaning_bookings').update({ status: 'validated', payment_released_at: new Date().toISOString(), dispute_resolved_at: new Date().toISOString() }).eq('id', b.id).then(function() { Alert.alert('Paiement libere ✅'); load(); });
    }
  }

  var filtered = bookings.filter(function(b) {
    if (filter === 'all') return true;
    return b.status === filter;
  });

  function refresh() { setRefreshing(true); load(); setTimeout(function(){setRefreshing(false);},800); }

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <View style={st.hdr}><Text style={st.hdrT}>📋 Reservations ({filtered.length})</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6,paddingHorizontal:16,paddingVertical:8}} style={{backgroundColor:T.card,borderBottomWidth:1,borderBottomColor:T.border,flexGrow:0}}>
        {[{k:'all',l:'Toutes',c:'#141414'},{k:'pending',l:'En attente',c:'#FF9500'},{k:'confirmed',l:'Confirmes',c:'#1C5F8A'},{k:'report_sent',l:'Rapport',c:'#9B59B6'},{k:'validated',l:'Valides',c:'#34C759'},{k:'disputed',l:'Litiges',c:'#DC3232'}].map(function(f2){
          var a=filter===f2.k;
          var count=bookings.filter(function(b){return f2.k==='all'||b.status===f2.k;}).length;
          return <TouchableOpacity key={f2.k} style={[st.filterBtn,a&&{backgroundColor:f2.c}]} onPress={function(){setFilter(f2.k);}}><Text style={[st.filterBtnT,a&&{color:'#fff'}]}>{f2.l} ({count})</Text></TouchableOpacity>;
        })}
      </ScrollView>
      <ScrollView style={{flex:1,backgroundColor:T.bg}} contentContainerStyle={{padding:16}} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={T.accent}/>}>
        {filtered.map(function(b, i) {
          var prop = b.properties || {};
          var cl = b.cleaners || {};
          var statusColor = b.status==='validated'?'#34C759':b.status==='disputed'?'#DC3232':b.status==='report_sent'?'#9B59B6':b.status==='confirmed'?'#1C5F8A':'#FF9500';
          return (
            <View key={b.id||i} style={[st.bookCard,{borderLeftWidth:3,borderLeftColor:statusColor}]}>
              <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <Text style={st.bookProp}>{prop.name||'Logement'}</Text>
                <View style={[st.badge,{backgroundColor:statusColor+'20'}]}><Text style={[st.badgeT,{color:statusColor}]}>{b.status}</Text></View>
              </View>
              <Text style={st.bookMeta}>📅 {b.date} · 🕐 {b.time||''}</Text>
              <Text style={st.bookMeta}>🧹 {cl.company_name||'?'} ({cl.email||''})</Text>
              <Text style={st.bookMeta}>💰 {b.payment_amount ? b.payment_amount + ' €' : 'Non paye'} {b.payment_held_at ? '· Sequestre ✅' : ''}</Text>
              {b.report_sent && <Text style={st.bookMeta}>📸 Rapport envoye {b.report_sent_at ? new Date(b.report_sent_at).toLocaleDateString('fr-FR') : ''}</Text>}
              {b.dispute_reason && <Text style={[st.bookMeta,{color:'#DC3232'}]}>⚠️ Litige: {b.dispute_reason}</Text>}

              {/* Actions admin */}
              <View style={{flexDirection:'row',gap:6,marginTop:8,flexWrap:'wrap'}}>
                {b.status === 'pending' && <TouchableOpacity style={[st.actBtn,{backgroundColor:'#1C5F8A'}]} onPress={function(){changeStatus(b.id,'confirmed');}}><Text style={st.actBtnT}>Confirmer</Text></TouchableOpacity>}
                {b.status === 'report_sent' && <TouchableOpacity style={[st.actBtn,{backgroundColor:'#34C759'}]} onPress={function(){forceValidate(b);}}><Text style={st.actBtnT}>Forcer validation</Text></TouchableOpacity>}
                {b.status === 'disputed' && <TouchableOpacity style={[st.actBtn,{backgroundColor:'#34C759'}]} onPress={function(){resolveDispute(b,'release');}}><Text style={st.actBtnT}>Liberer paiement</Text></TouchableOpacity>}
                {b.status === 'disputed' && <TouchableOpacity style={[st.actBtn,{backgroundColor:'#DC3232'}]} onPress={function(){resolveDispute(b,'refund');}}><Text style={st.actBtnT}>Rembourser</Text></TouchableOpacity>}
                {b.status !== 'validated' && b.status !== 'disputed' && <TouchableOpacity style={[st.actBtn,{backgroundColor:'#DC3232'}]} onPress={function(){changeStatus(b.id,'cancelled');}}><Text style={st.actBtnT}>Annuler</Text></TouchableOpacity>}
              </View>
            </View>
          );
        })}
        {filtered.length === 0 && <Text style={{textAlign:'center',color:T.muted,marginTop:40}}>Aucune reservation</Text>}
        <View style={{height:30}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

var st = StyleSheet.create({
  safe:{flex:1,backgroundColor:T.bg},
  hdr:{paddingHorizontal:16,paddingVertical:14,backgroundColor:T.card,borderBottomWidth:1,borderBottomColor:T.border},
  hdrT:{fontSize:20,fontWeight:'700',color:T.accent},
  filterBtn:{paddingHorizontal:12,paddingVertical:6,borderRadius:8,backgroundColor:T.card,borderWidth:1,borderColor:T.border},
  filterBtnT:{fontSize:11,fontWeight:'600',color:T.text},
  bookCard:{backgroundColor:T.card,borderRadius:12,padding:14,marginBottom:8,borderWidth:1,borderColor:T.border},
  bookProp:{fontSize:14,fontWeight:'700',color:T.text},
  bookMeta:{fontSize:11,color:T.muted,marginTop:2},
  badge:{borderRadius:6,paddingHorizontal:8,paddingVertical:2},
  badgeT:{fontSize:10,fontWeight:'700'},
  actBtn:{paddingHorizontal:10,paddingVertical:6,borderRadius:8},
  actBtnT:{color:'#fff',fontSize:10,fontWeight:'700'},
});
