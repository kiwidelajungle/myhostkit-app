import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../config/supabase';
import T from '../../theme';

export default function AdminSupport(props) {
  var _email = useState(''); var email = _email[0]; var setEmail = _email[1];
  var _subject = useState(''); var subject = _subject[0]; var setSubject = _subject[1];
  var _body = useState(''); var body = _body[0]; var setBody = _body[1];

  function resetPassword() {
    if (!email.includes('@')) { Alert.alert('Erreur','Email requis'); return; }
    supabase.auth.resetPasswordForEmail(email.trim()).then(function(r) {
      if (r.error) Alert.alert('Erreur', r.error.message);
      else Alert.alert('Email envoye ✅', 'Lien de reset envoye a ' + email);
    });
  }

  function extendDays(days) {
    if (!email.includes('@')) { Alert.alert('Erreur','Email requis'); return; }
    supabase.from('profiles').select('trial_ends_at').eq('email', email.trim()).single().then(function(pr) {
      if (!pr.data) { Alert.alert('Erreur', 'Utilisateur non trouve'); return; }
      var end = pr.data.trial_ends_at ? new Date(pr.data.trial_ends_at) : new Date();
      if (end < new Date()) end = new Date();
      end.setDate(end.getDate() + days);
      supabase.from('profiles').update({ subscription_plan: 'trial', trial_ends_at: end.toISOString(), subscription_status: 'active', trial_email_j7_sent: false, trial_email_j1_sent: false, trial_email_end_sent: false }).eq('email', email.trim()).then(function(r) {
        if (r.error) Alert.alert('Erreur', r.error.message);
        else Alert.alert('+' + days + 'j ✅', email + ' → fin ' + end.toLocaleDateString('fr-FR'));
      });
    });
  }

  function changePlan(plan) {
    if (!email.includes('@')) { Alert.alert('Erreur','Email requis'); return; }
    supabase.from('profiles').update({ subscription_plan: plan, subscription_status: 'active' }).eq('email', email.trim()).then(function(r) {
      if (r.error) Alert.alert('Erreur', r.error.message);
      else Alert.alert('Plan modifie ✅', email + ' → ' + plan);
    });
  }

  function sendSupportEmail() {
    if (!email.includes('@') || !subject.trim()) { Alert.alert('Erreur','Email et sujet requis'); return; }
    fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/send-email', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ to: email.trim(), subject: subject.trim(), body: body.trim() || 'Message de support Keyla' }),
    }).then(function(r) { return r.json(); }).then(function(d) {
      if (d.success) { Alert.alert('Email envoye ✅'); setSubject(''); setBody(''); }
      else Alert.alert('Erreur', JSON.stringify(d.error||''));
    });
  }

  function suspendUser() {
    if (!email.includes('@')) return;
    Alert.alert('Suspendre ?', email, [{ text: 'Annuler' }, { text: 'Suspendre', style: 'destructive', onPress: function() {
      supabase.from('profiles').update({ subscription_status: 'suspended', subscription_plan: 'free' }).eq('email', email.trim()).then(function() { Alert.alert('Suspendu ✅'); });
    }}]);
  }

  function reactivateUser() {
    if (!email.includes('@')) return;
    supabase.from('profiles').update({ subscription_status: 'active' }).eq('email', email.trim()).then(function() { Alert.alert('Reactive ✅'); });
  }

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <View style={st.hdr}>
        <Text style={st.hdrT}>🛠 Support & Outils</Text>
        <TouchableOpacity onPress={props.onLogout}><Text style={{color:'#DC3232',fontSize:12,fontWeight:'600'}}>Deconnexion</Text></TouchableOpacity>
      </View>
      <ScrollView style={{flex:1,backgroundColor:T.bg}} contentContainerStyle={{padding:16}}>

        <Text style={st.sec}>🔍 Recherche client</Text>
        <TextInput style={st.input} placeholder="Email du client" placeholderTextColor={T.muted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

        <Text style={st.sec}>⚡ Actions rapides</Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
          <TouchableOpacity style={[st.actBtn,{backgroundColor:'#FF9500'}]} onPress={resetPassword}><Text style={st.actBtnT}>🔑 Reset mdp</Text></TouchableOpacity>
          <TouchableOpacity style={[st.actBtn,{backgroundColor:'#C8965A'}]} onPress={function(){extendDays(7);}}><Text style={st.actBtnT}>🎁 +7j</Text></TouchableOpacity>
          <TouchableOpacity style={[st.actBtn,{backgroundColor:'#E8A850'}]} onPress={function(){extendDays(30);}}><Text style={st.actBtnT}>🎁 +30j</Text></TouchableOpacity>
          <TouchableOpacity style={[st.actBtn,{backgroundColor:'#9B9B9B'}]} onPress={function(){changePlan('free');}}><Text style={st.actBtnT}>→ Gratuit</Text></TouchableOpacity>
          <TouchableOpacity style={[st.actBtn,{backgroundColor:'#1C5F8A'}]} onPress={function(){changePlan('starter');}}><Text style={st.actBtnT}>→ Starter</Text></TouchableOpacity>
          <TouchableOpacity style={[st.actBtn,{backgroundColor:'#34C759'}]} onPress={function(){changePlan('pro');}}><Text style={st.actBtnT}>→ Pro</Text></TouchableOpacity>
          <TouchableOpacity style={[st.actBtn,{backgroundColor:'#9B59B6'}]} onPress={function(){changePlan('business');}}><Text style={st.actBtnT}>→ Business</Text></TouchableOpacity>
          <TouchableOpacity style={[st.actBtn,{backgroundColor:'#34C759'}]} onPress={reactivateUser}><Text style={st.actBtnT}>✅ Reactiver</Text></TouchableOpacity>
          <TouchableOpacity style={[st.actBtn,{backgroundColor:'#DC3232'}]} onPress={suspendUser}><Text style={st.actBtnT}>🚫 Suspendre</Text></TouchableOpacity>
        </View>

        <Text style={st.sec}>📧 Email de support</Text>
        <TextInput style={st.input} placeholder="Sujet" placeholderTextColor={T.muted} value={subject} onChangeText={setSubject} />
        <TextInput style={[st.input,{minHeight:80,textAlignVertical:'top'}]} placeholder="Message..." placeholderTextColor={T.muted} value={body} onChangeText={setBody} multiline />
        <TouchableOpacity style={[st.actBtn,{backgroundColor:'#1C5F8A',alignItems:'center',paddingVertical:12}]} onPress={sendSupportEmail}><Text style={st.actBtnT}>📤 Envoyer l'email</Text></TouchableOpacity>

        <Text style={st.sec}>🔗 Liens rapides</Text>
        <View style={{gap:6}}>
          <TouchableOpacity style={st.linkBtn} onPress={function(){Linking.openURL('https://supabase.com/dashboard/project/illovwqvszjuasftwkxh');}}><Text style={st.linkBtnT}>🗄 Supabase Dashboard</Text></TouchableOpacity>
          <TouchableOpacity style={st.linkBtn} onPress={function(){Linking.openURL('https://dashboard.stripe.com');}}><Text style={st.linkBtnT}>💳 Stripe Dashboard</Text></TouchableOpacity>
          <TouchableOpacity style={st.linkBtn} onPress={function(){Linking.openURL('https://resend.com/emails');}}><Text style={st.linkBtnT}>📧 Resend Emails</Text></TouchableOpacity>
          <TouchableOpacity style={st.linkBtn} onPress={function(){Linking.openURL('https://github.com/kiwidelajungle/myhostkit-app');}}><Text style={st.linkBtnT}>📦 GitHub Repo</Text></TouchableOpacity>
          <TouchableOpacity style={st.linkBtn} onPress={function(){Linking.openURL('https://myhostkit.com');}}><Text style={st.linkBtnT}>🌐 Site web</Text></TouchableOpacity>
        </View>

        <View style={{height:30}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

var st = StyleSheet.create({
  safe:{flex:1,backgroundColor:T.bg},
  hdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:14,backgroundColor:T.card,borderBottomWidth:1,borderBottomColor:T.border},
  hdrT:{fontSize:20,fontWeight:'700',color:T.accent},
  sec:{fontSize:15,fontWeight:'700',color:T.text,marginTop:20,marginBottom:8},
  input:{backgroundColor:T.bg,borderWidth:1,borderColor:T.border,borderRadius:10,paddingHorizontal:12,paddingVertical:10,fontSize:14,color:T.text,marginBottom:8},
  actBtn:{paddingHorizontal:12,paddingVertical:8,borderRadius:8},
  actBtnT:{color:'#fff',fontSize:11,fontWeight:'700'},
  linkBtn:{backgroundColor:T.card,borderRadius:10,padding:12,borderWidth:1,borderColor:T.border},
  linkBtnT:{fontSize:13,fontWeight:'600',color:T.accent},
});
