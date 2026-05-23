import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, RefreshControl, Alert, Animated, Platform, UIManager, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { getCleanerLimits, isTrial, getTrialDaysRemaining, isPlanSuspended } from '../../utils/subscription';
import { calculateOrderWithCommission } from '../../utils/cleanerPayment';
import T from '../../theme';
import { showNavigationChoice } from '../../utils/navigation';
import { dbSilent } from '../../utils/db';
import AnimCard from '../../components/AnimCard';
import { t, useLang } from '../../i18n';
import ProspectionRequestModal from '../../components/ProspectionRequestModal';
import ShippingAddressModal from '../../components/ShippingAddressModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) { UIManager.setLayoutAnimationEnabledExperimental(true); }
var MYHOSTKIT_EMAIL = 'myhostkit.contact@gmail.com';

var PRODUCTS = [
  { name: 'Produit multi-surface', i18nKey: 'cleaner_dashboard_prod_multi_surface', unit: 'flacon', unitKey: 'cleaner_dashboard_unit_bottle_spray', price: 4.50, emoji: '🧴', cat: 'Nettoyage' },
  { name: 'Liquide vaisselle', i18nKey: 'cleaner_dashboard_prod_dish_soap', unit: 'flacon', unitKey: 'cleaner_dashboard_unit_bottle_spray', price: 2.80, emoji: '🧴', cat: 'Nettoyage' },
  { name: 'Vinaigre blanc 1L', i18nKey: 'cleaner_dashboard_prod_white_vinegar', unit: 'bouteille', unitKey: 'cleaner_dashboard_unit_bottle', price: 1.90, emoji: '🧴', cat: 'Nettoyage' },
  { name: 'Javel 1L', i18nKey: 'cleaner_dashboard_prod_bleach', unit: 'bouteille', unitKey: 'cleaner_dashboard_unit_bottle', price: 2.20, emoji: '🧴', cat: 'Nettoyage' },
  { name: 'Nettoyant vitres', i18nKey: 'cleaner_dashboard_prod_window_cleaner', unit: 'flacon', unitKey: 'cleaner_dashboard_unit_bottle_spray', price: 3.50, emoji: '🧴', cat: 'Nettoyage' },
  { name: 'Desinfectant WC', i18nKey: 'cleaner_dashboard_prod_toilet_disinfectant', unit: 'flacon', unitKey: 'cleaner_dashboard_unit_bottle_spray', price: 3.00, emoji: '🚽', cat: 'Nettoyage' },
  { name: 'Eponges (lot 3)', i18nKey: 'cleaner_dashboard_prod_sponges', unit: 'lot', unitKey: 'cleaner_dashboard_unit_pack', price: 2.50, emoji: '🧽', cat: 'Accessoires' },
  { name: 'Chiffons microfibre x5', i18nKey: 'cleaner_dashboard_prod_microfiber', unit: 'lot', unitKey: 'cleaner_dashboard_unit_pack', price: 5.50, emoji: '🧹', cat: 'Accessoires' },
  { name: 'Gants menage', i18nKey: 'cleaner_dashboard_prod_gloves', unit: 'paire', unitKey: 'cleaner_dashboard_unit_pair', price: 2.00, emoji: '🧤', cat: 'Accessoires' },
  { name: 'Sacs poubelle 30L', i18nKey: 'cleaner_dashboard_prod_trash_30L', unit: 'rouleau', unitKey: 'cleaner_dashboard_unit_roll', price: 3.20, emoji: '🗑', cat: 'Consommables' },
  { name: 'Sacs poubelle 100L', i18nKey: 'cleaner_dashboard_prod_trash_100L', unit: 'rouleau', unitKey: 'cleaner_dashboard_unit_roll', price: 4.50, emoji: '🗑', cat: 'Consommables' },
  { name: 'Papier toilette x6', i18nKey: 'cleaner_dashboard_prod_toilet_paper', unit: 'pack', unitKey: 'cleaner_dashboard_unit_package', price: 4.00, emoji: '🧻', cat: 'Consommables' },
  { name: 'Essuie-tout x2', i18nKey: 'cleaner_dashboard_prod_paper_towels', unit: 'pack', unitKey: 'cleaner_dashboard_unit_package', price: 3.00, emoji: '🧻', cat: 'Consommables' },
  { name: 'Savon mains', i18nKey: 'cleaner_dashboard_prod_hand_soap', unit: 'flacon', unitKey: 'cleaner_dashboard_unit_bottle_spray', price: 3.50, emoji: '🧼', cat: 'Hygiene' },
  { name: 'Gel douche', i18nKey: 'cleaner_dashboard_prod_shower_gel', unit: 'flacon', unitKey: 'cleaner_dashboard_unit_bottle_spray', price: 3.00, emoji: '🧴', cat: 'Hygiene' },
  { name: 'Shampoing', i18nKey: 'cleaner_dashboard_prod_shampoo', unit: 'flacon', unitKey: 'cleaner_dashboard_unit_bottle_spray', price: 3.50, emoji: '🧴', cat: 'Hygiene' },
  { name: 'Serviettes invite x2', i18nKey: 'cleaner_dashboard_prod_guest_towels', unit: 'lot', unitKey: 'cleaner_dashboard_unit_pack', price: 8.00, emoji: '🛁', cat: 'Linge' },
  { name: 'Draps 1 place', i18nKey: 'cleaner_dashboard_prod_sheets_single', unit: 'jeu', unitKey: 'cleaner_dashboard_unit_set', price: 15.00, emoji: '🛏', cat: 'Linge' },
  { name: 'Draps 2 places', i18nKey: 'cleaner_dashboard_prod_sheets_double', unit: 'jeu', unitKey: 'cleaner_dashboard_unit_set', price: 20.00, emoji: '🛏', cat: 'Linge' },
  { name: 'Taies oreiller x2', i18nKey: 'cleaner_dashboard_prod_pillowcases', unit: 'lot', unitKey: 'cleaner_dashboard_unit_pack', price: 8.00, emoji: '🛏', cat: 'Linge' },
  { name: 'Capsules cafe x10', i18nKey: 'cleaner_dashboard_prod_coffee_pods', unit: 'boite', unitKey: 'cleaner_dashboard_unit_box', price: 5.00, emoji: '☕', cat: 'Accueil' },
  { name: 'The sachets x20', i18nKey: 'cleaner_dashboard_prod_tea_bags', unit: 'boite', unitKey: 'cleaner_dashboard_unit_box', price: 3.50, emoji: '🍵', cat: 'Accueil' },
  { name: 'Sucre sachets x50', i18nKey: 'cleaner_dashboard_prod_sugar_sachets', unit: 'boite', unitKey: 'cleaner_dashboard_unit_box', price: 2.50, emoji: '🍬', cat: 'Accueil' },
  { name: 'Bouteilles eau 50cl x6', i18nKey: 'cleaner_dashboard_prod_water_bottles', unit: 'pack', unitKey: 'cleaner_dashboard_unit_package', price: 2.00, emoji: '💧', cat: 'Accueil' },
  { name: 'Kit bienvenue (savon+shampoing+gel)', i18nKey: 'cleaner_dashboard_prod_welcome_kit', unit: 'kit', unitKey: 'cleaner_dashboard_unit_kit', price: 9.00, emoji: '🎁', cat: 'Accueil' },
];

var CAT_KEYS = {
  'all': 'cleaner_dashboard_cat_all',
  'Nettoyage': 'cleaner_dashboard_cat_cleaning',
  'Accessoires': 'cleaner_dashboard_cat_accessories',
  'Consommables': 'cleaner_dashboard_cat_consumables',
  'Hygiene': 'cleaner_dashboard_cat_hygiene',
  'Linge': 'cleaner_dashboard_cat_linens',
  'Accueil': 'cleaner_dashboard_cat_welcome',
  'Personnalise': 'cleaner_dashboard_cat_custom',
};

export default function CleanerDashboard(props) {
  useLang();
  var _cid = useState(null); var cleanerId = _cid[0]; var setCleanerId = _cid[1];
  var _bookings = useState([]); var bookings = _bookings[0]; var setBookings = _bookings[1];
  var _propCount = useState(0); var propCount = _propCount[0]; var setPropCount = _propCount[1];
  var _prospectModal = useState(false); var prospectModal = _prospectModal[0]; var setProspectModal = _prospectModal[1];
  var _cleanerPlan = useState('free'); var cleanerPlan = _cleanerPlan[0]; var setCleanerPlan = _cleanerPlan[1];
  var _trialDays = useState(0); var trialDays = _trialDays[0]; var setTrialDays = _trialDays[1];
  var _availCount = useState(0); var availCount = _availCount[0]; var setAvailCount = _availCount[1];
  var _refreshing = useState(false); var refreshing = _refreshing[0]; var setRefreshing = _refreshing[1];
  var _showShop = useState(false); var showShop = _showShop[0]; var setShowShop = _showShop[1];
  var _cart = useState({}); var cart = _cart[0]; var setCart = _cart[1];
  var _orderProp = useState(null); var orderProp = _orderProp[0]; var setOrderProp = _orderProp[1];
  var _orderProps = useState([]); var orderProps = _orderProps[0]; var setOrderProps = _orderProps[1];
  var _customItem = useState(''); var customItem = _customItem[0]; var setCustomItem = _customItem[1];
  var _customPrice = useState(''); var customPrice = _customPrice[0]; var setCustomPrice = _customPrice[1];
  var _customQty = useState('1'); var customQty = _customQty[0]; var setCustomQty = _customQty[1];
  var _shopFilter = useState('all'); var shopFilter = _shopFilter[0]; var setShopFilter = _shopFilter[1];
  var _showAddrModal = useState(false); var showAddrModal = _showAddrModal[0]; var setShowAddrModal = _showAddrModal[1];

  function getProdName(prod) { return prod.i18nKey ? t(prod.i18nKey) : prod.name; }
  function getProdUnit(prod) { return prod.unitKey ? t(prod.unitKey) : prod.unit; }
  function getCatLabel(cat) { return CAT_KEYS[cat] ? t(CAT_KEYS[cat]) : cat; }

  function load() {
    props.supabase.from('cleaners').select('id').eq('user_id', props.session.user.id).single().then(function(cr) {
      if (!cr.data) return;
      var cid = cr.data.id; setCleanerId(cid);
      props.supabase.from('cleaning_bookings').select('*, properties(name,address,city,latitude,longitude,wifi_name,wifi_password,access_code,access_info,checkin,checkout,check_in_time,check_out_time,rules,contacts)').eq('cleaner_id', cid).in('status',['confirmed','pending','payment_required']).order('date',{ascending:true}).limit(20).then(function(r) {
        if (r.data) setBookings(r.data);
      });
      props.supabase.from('cleaning_bookings').select('property_id, properties(name)').eq('cleaner_id', cid).then(function(r) {
        if (r.data) { var u={}; var pl=[]; r.data.forEach(function(b){if(b.property_id&&!u[b.property_id]){u[b.property_id]=true;pl.push({id:b.property_id,name:b.properties?b.properties.name:t('cleaner_dashboard_fallback_property')});}}); setPropCount(Object.keys(u).length); setOrderProps(pl); if(pl.length>0&&!orderProp)setOrderProp(pl[0]); }
      });
      var dates=[]; for(var i=0;i<14;i++){var d=new Date();d.setDate(d.getDate()+i);dates.push(d.toISOString().split('T')[0]);}
      props.supabase.from('cleaner_availability').select('date,is_available,status').eq('cleaner_id',cid).in('date',dates).then(function(ar){if(ar.data){var c=0;ar.data.forEach(function(a){if(a.is_available&&a.status!=='booked')c++;});setAvailCount(c);}});
    });
  }
  useFocusEffect(useCallback(function(){
    load();
    props.supabase.from('profiles').select('subscription_plan,trial_ends_at').eq('id', props.session.user.id).single().then(function(r) {
      if (r.data) {
        setCleanerPlan(r.data.subscription_plan || 'free');
        if (r.data.trial_ends_at) setTrialDays(getTrialDaysRemaining(r.data.trial_ends_at));
      }
    });
  },[]))
  function refresh(){setRefreshing(true);load();setTimeout(function(){setRefreshing(false);},800);}

  function validateBooking(b) {
    var maxProp = cleanerPlan === 'business' || cleanerPlan === 'pro' || cleanerPlan === 'trial' ? 999 : 3;
    if (propCount >= maxProp && b.property_id) {
      var isNew = !orderProps.some(function(op) { return op.id === b.property_id; });
      if (isNew) {
        Alert.alert(t('cleaner_dashboard_validate_limit_title'), t('cleaner_dashboard_validate_limit_msg'), [
          { text: t('cleaner_dashboard_validate_limit_later') },
          { text: t('cleaner_dashboard_validate_limit_see_plans'), onPress: function() { props.navigation.navigate('CSettings'); }}
        ]);
        return;
      }
    }
    Alert.alert(t('cleaner_dashboard_validate_confirm_title'), '🏠 ' + (b.properties?b.properties.name:'') + '\n📅 ' + b.date + '\n🕐 ' + (b.time||''), [
      { text: t('cleaner_dashboard_validate_btn_cancel') },
      { text: t('cleaner_dashboard_validate_btn_confirm'), onPress: function() {
        props.supabase.from('cleaning_bookings').update({ cleaner_validated: true, status: 'payment_required' }).eq('id', b.id).then(function(r) {
          if (r.error) { Alert.alert(t('cleaner_dashboard_validate_error_title'), r.error.message); return; }
          load(); Alert.alert(t('cleaner_dashboard_validate_success_title'), t('cleaner_dashboard_validate_success_msg'));
        });
      }}
    ]);
  }

  function cancelBooking(b) {
    Alert.alert(t('cleaner_dashboard_cancel_confirm_title'), t('cleaner_dashboard_cancel_confirm_msg'), [
      { text: t('cleaner_dashboard_cancel_btn_no') },
      { text: t('cleaner_dashboard_cancel_btn_yes'), style: 'destructive', onPress: function() {
        props.supabase.from('cleaning_bookings').update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: 'cleaner', cancellation_reason: t('cleaner_dashboard_cancel_reason') }).eq('id', b.id).then(function() {
          if (b.date) {
            props.supabase.from('cleaner_availability').update({ status: 'available', is_available: true }).eq('cleaner_id', cleanerId).eq('date', b.date).then(function(){});
          }
          load(); Alert.alert(t('cleaner_dashboard_cancel_success'));
        });
      }}
    ]);
  }

  function modifyTime(b) {
    Alert.prompt ? Alert.prompt(t('cleaner_dashboard_modify_title'), t('cleaner_dashboard_modify_msg', { current: b.time||'?' }), function(newTime) {
      if (newTime && newTime.indexOf('-') !== -1) {
        props.supabase.from('cleaning_bookings').update({ time: newTime.trim() }).eq('id', b.id).then(function() { load(); Alert.alert(t('cleaner_dashboard_modify_success'), newTime); });
      }
    }, 'plain-text', b.time || '') : Alert.alert(t('cleaner_dashboard_modify_no_prompt_title'), t('cleaner_dashboard_modify_no_prompt_msg'));
  }

  function addToCart(idx){var n={};for(var k in cart)n[k]=cart[k];n[idx]=(n[idx]||0)+1;setCart(n);}
  function removeFromCart(idx){var n={};for(var k in cart)n[k]=cart[k];if(n[idx]>1)n[idx]--;else delete n[idx];setCart(n);}
  function getCartCount(){var c=0;for(var k in cart)c+=cart[k];return c;}

  function sendOrder() {
    if(getCartCount()===0)return;
    if(!orderProp){Alert.alert(t('common_error'), t('cleaner_dashboard_order_error_no_prop'));return;}
    setShowAddrModal(true);
  }
  function sendOrderConfirmed(addr) {
    setShowAddrModal(false);
    if(!orderProp) return;
    var calc=calculateOrderWithCommission(cart,PRODUCTS);
    var description=t('cleaner_dashboard_order_description', { property: orderProp.name });
    var nl=String.fromCharCode(10);
    var itemsList=Object.keys(cart).map(function(idx){var p=PRODUCTS[idx];var q=cart[idx];return '  - '+(p.i18nKey?t(p.i18nKey):p.name)+' x'+q+'  ('+(p.price*q).toFixed(2)+' EUR)';}).join(nl);
    var addrFull=addr.address+', '+addr.postalCode+' '+addr.city;
    var emailBody='COMMANDE BOUTIQUE MENAGERE'+nl+'================'+nl+nl+'Logement: '+orderProp.name+nl+nl+'LIVRAISON:'+nl+addr.name+nl+addrFull+nl+'Tel: '+addr.phone+nl+nl+'ARTICLES:'+nl+itemsList+nl+nl+'Sous-total: '+calc.subtotal.toFixed(2)+' EUR'+nl+'Commission: '+calc.commission.toFixed(2)+' EUR'+nl+'TOTAL: '+calc.total.toFixed(2)+' EUR';
    var totalCents=Math.round(calc.total*100);
    fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/manage-subscription',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'checkout',amount:totalCents,description:description,customer_email:props.session.user.email})}).then(function(r){return r.json();}).then(function(data){
      if(data.url){
        WebBrowser.openBrowserAsync(data.url).then(function(){
          fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/manage-subscription',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'verify_payment',session_url:data.url})}).then(function(vr){return vr.json();}).then(function(vd){
            if(vd&&vd.paid){
              fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/send-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:'myhostkit.contact@gmail.com',subject:'Keyla - Commande PAYEE menagere : '+orderProp.name,body:emailBody+nl+nl+'Statut: PAYE'})}).catch(function(){});
              setCart({});setShowShop(false);
              Alert.alert(t('cleaner_dashboard_order_confirmed_title'), t('cleaner_dashboard_order_confirmed_msg'));
            } else { Alert.alert(t('cleaner_dashboard_order_not_finalized_title'), t('cleaner_dashboard_order_not_finalized_msg')); }
          }).catch(function(){ Alert.alert(t('cleaner_dashboard_order_verification_pending')); });
        });
      } else { Alert.alert(t('common_error'), data.error || 'Contactez myhostkit.contact@gmail.com'); }
    }).catch(function(e){ Alert.alert(t('cleaner_dashboard_order_network_error'), e.message); });
  }

  var todayStr=new Date().toISOString().split('T')[0];
  var toValidate=bookings.filter(function(b){return !b.cleaner_validated && b.status==='pending';});
  var confirmed=bookings.filter(function(b){return b.cleaner_validated || b.status==='confirmed' || b.status==='payment_required';});
  var today=bookings.filter(function(b){return b.date===todayStr;});

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hdr}><Text style={s.hdrT}>{t('cleaner_dashboard_header')}</Text><View style={s.badge}><Text style={s.badgeT}>{propCount === 1 ? t('cleaner_dashboard_property_single') : t('cleaner_dashboard_property_plural', { count: propCount })}</Text></View></View>
      <ScrollView style={{flex:1,backgroundColor:T.bg}} contentContainerStyle={{padding:16}} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={T.accent} />}>

        {isPlanSuspended() && (
          <View style={{backgroundColor:'#FDE8E8',borderRadius:14,padding:14,marginBottom:14,borderWidth:1.5,borderColor:'rgba(220,50,50,0.3)',flexDirection:'row',alignItems:'center',gap:10}}>
            <Text style={{fontSize:24}}>⚠️</Text>
            <View style={{flex:1}}>
              <Text style={{fontSize:14,fontWeight:'700',color:'#DC3232'}}>{t('cleaner_dashboard_suspended_title')}</Text>
              <Text style={{fontSize:11,color:'#8B4513',marginTop:2}}>{t('cleaner_dashboard_suspended_msg')}</Text>
            </View>
          </View>
        )}

        {isTrial(cleanerPlan) && trialDays > 0 && (
          <View style={{backgroundColor:'#FFF4E6',borderRadius:14,padding:14,marginBottom:14,borderWidth:1.5,borderColor:'rgba(200,150,90,0.3)',flexDirection:'row',alignItems:'center',gap:10}}>
            <Text style={{fontSize:24}}>🎁</Text>
            <View style={{flex:1}}>
              <Text style={{fontSize:14,fontWeight:'700',color:'#C8965A'}}>{trialDays === 1 ? t('cleaner_dashboard_trial_single') : t('cleaner_dashboard_trial_plural', { days: trialDays })}</Text>
              <Text style={{fontSize:11,color:'#8B7355',marginTop:2}}>{t('cleaner_dashboard_trial_desc')}</Text>
            </View>
          </View>
        )}
        {cleanerPlan === 'free' && !isTrial(cleanerPlan) && (
          <TouchableOpacity style={{backgroundColor:'#E8F4FB',borderRadius:14,padding:14,marginBottom:14,borderWidth:1,borderColor:'rgba(28,95,138,0.2)',flexDirection:'row',alignItems:'center',gap:10}} onPress={function(){props.navigation.navigate('CSettings');}}>
            <Text style={{fontSize:18}}>🚀</Text>
            <View style={{flex:1}}>
              <Text style={{fontSize:13,fontWeight:'600',color:'#1C5F8A'}}>{t('cleaner_dashboard_free_upgrade_title')}</Text>
              <Text style={{fontSize:10,color:'#6B6B6B',marginTop:2}}>{t('cleaner_dashboard_free_upgrade_desc')}</Text>
            </View>
            <Text style={{color:'#1C5F8A',fontSize:16}}>›</Text>
          </TouchableOpacity>
        )}
        {cleanerPlan === 'free' && propCount > 3 && (
          <View style={{backgroundColor:'#FDE8E8',borderRadius:14,padding:14,marginBottom:14,borderWidth:1.5,borderColor:'rgba(220,50,50,0.2)',flexDirection:'row',alignItems:'center',gap:10}}>
            <Text style={{fontSize:18}}>🔒</Text>
            <View style={{flex:1}}>
              <Text style={{fontSize:13,fontWeight:'700',color:'#DC3232'}}>{(propCount - 3) === 1 ? t('cleaner_dashboard_limit_reached_single') : t('cleaner_dashboard_limit_reached_plural', { count: propCount - 3 })}</Text>
              <Text style={{fontSize:10,color:'#8B5555',marginTop:2}}>{t('cleaner_dashboard_limit_reached_desc')}</Text>
            </View>
          </View>
        )}
        {(cleanerPlan === 'business' || (isTrial(cleanerPlan) && trialDays > 0)) && (
          <View style={{flexDirection:'row',gap:8,marginBottom:14}}>
            <View style={{flex:1,backgroundColor:'#E8F4FB',borderRadius:10,padding:10,alignItems:'center',borderWidth:1,borderColor:'rgba(28,95,138,0.15)'}}>
              <Text style={{fontSize:16}}>✓</Text><Text style={{fontSize:10,fontWeight:'600',color:'#1C5F8A'}}>{t('cleaner_dashboard_badge_verified')}</Text>
            </View>
            <View style={{flex:1,backgroundColor:'#F3E8FB',borderRadius:10,padding:10,alignItems:'center',borderWidth:1,borderColor:'rgba(155,89,182,0.15)'}}>
              <Text style={{fontSize:16}}>⭐</Text><Text style={{fontSize:10,fontWeight:'600',color:'#9B59B6'}}>{t('cleaner_dashboard_badge_priority')}</Text>
            </View>
            <View style={{flex:1,backgroundColor:'#E8FBE8',borderRadius:10,padding:10,alignItems:'center',borderWidth:1,borderColor:'rgba(52,199,89,0.15)'}}>
              <Text style={{fontSize:16}}>📈</Text><Text style={{fontSize:10,fontWeight:'600',color:'#34C759'}}>{t('cleaner_dashboard_badge_boosted')}</Text>
            </View>
            <View style={{flex:1,backgroundColor:'#FFF4E6',borderRadius:10,padding:10,alignItems:'center',borderWidth:1,borderColor:'rgba(200,150,90,0.15)'}}>
              <Text style={{fontSize:16}}>👥</Text><Text style={{fontSize:10,fontWeight:'600',color:'#C8965A'}}>{t('cleaner_dashboard_badge_team')}</Text>
            </View>
          </View>
        )}
        {cleanerPlan === 'pro' && (
          <View style={{flexDirection:'row',gap:8,marginBottom:14}}>
            <View style={{flex:1,backgroundColor:'#E8F4FB',borderRadius:10,padding:10,alignItems:'center',borderWidth:1,borderColor:'rgba(28,95,138,0.15)'}}>
              <Text style={{fontSize:16}}>📈</Text><Text style={{fontSize:10,fontWeight:'600',color:'#1C5F8A'}}>{t('cleaner_dashboard_badge_boosted')}</Text>
            </View>
            <View style={{flex:1,backgroundColor:'#E8FBE8',borderRadius:10,padding:10,alignItems:'center',borderWidth:1,borderColor:'rgba(52,199,89,0.15)'}}>
              <Text style={{fontSize:16}}>-2%</Text><Text style={{fontSize:10,fontWeight:'600',color:'#34C759'}}>{t('cleaner_dashboard_badge_commission')}</Text>
            </View>
          </View>
        )}
        <View style={s.statsRow}>
          <AnimCard style={s.stat} delay={0}><Text style={[s.statV,{color:T.error}]}>{toValidate.length}</Text><Text style={s.statL}>{t('cleaner_dashboard_stat_to_validate')}</Text></AnimCard>
          <AnimCard style={s.stat} delay={60}><Text style={[s.statV,{color:T.blue}]}>{today.length}</Text><Text style={s.statL}>{t('cleaner_dashboard_stat_today')}</Text></AnimCard>
          <AnimCard style={s.stat} delay={120}><Text style={[s.statV,{color:T.success}]}>{availCount}</Text><Text style={s.statL}>{t('cleaner_dashboard_stat_available')}</Text></AnimCard>
          <AnimCard style={s.stat} delay={180}><Text style={[s.statV,{color:T.accent}]}>{propCount}</Text><Text style={s.statL}>{t('cleaner_dashboard_stat_properties')}</Text></AnimCard>
        </View>

        <TouchableOpacity style={s.shopBtn} onPress={function(){setShowShop(!showShop);}}>
          <Text style={s.shopBtnT}>{showShop ? t('cleaner_dashboard_shop_btn_close') : t('cleaner_dashboard_shop_btn_open')}</Text>
          {getCartCount()>0&&!showShop&&<View style={s.cartBadge}><Text style={s.cartBadgeT}>{getCartCount()}</Text></View>}
        </TouchableOpacity>

        {showShop && <View style={s.shopCard}>
          <Text style={s.shopTitle}>{t('cleaner_dashboard_shop_title')}</Text>
          <Text style={{fontSize:10,color:T.muted,textAlign:'center',marginBottom:8}}>{t('cleaner_dashboard_shop_subtitle')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6,marginBottom:8}}>
            {orderProps.map(function(p){var a=orderProp&&orderProp.id===p.id;return <TouchableOpacity key={p.id} style={[s.propPill,a&&s.propPillA]} onPress={function(){setOrderProp(p);}}><Text style={[s.propPillT,a&&{color:'#fff'}]}>{p.name}</Text></TouchableOpacity>;})}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:4,marginBottom:10}}>
            {['all','Nettoyage','Accessoires','Consommables','Hygiene','Linge','Accueil'].map(function(c){var a=shopFilter===c;return <TouchableOpacity key={c} style={{paddingHorizontal:10,paddingVertical:4,borderRadius:8,backgroundColor:a?T.accent:T.bg,borderWidth:1,borderColor:a?T.accent:T.border}} onPress={function(){setShopFilter(c);}}><Text style={{fontSize:9,fontWeight:'600',color:a?'#fff':T.text}}>{getCatLabel(c)}</Text></TouchableOpacity>;})}
          </ScrollView>
          {PRODUCTS.filter(function(p){return shopFilter==='all'||p.cat===shopFilter;}).map(function(prod,idx){var realIdx=PRODUCTS.indexOf(prod);var qty=cart[realIdx]||0;return <View key={realIdx} style={s.prodRow}><Text style={{fontSize:18}}>{prod.emoji}</Text><View style={{flex:1}}><Text style={s.prodName}>{getProdName(prod)}</Text><Text style={s.prodPrice}>{prod.price.toFixed(2)} EUR/{getProdUnit(prod)}</Text></View><View style={{flexDirection:'row',alignItems:'center',gap:8}}>{qty>0&&<TouchableOpacity style={s.prodBtn} onPress={function(){removeFromCart(realIdx);}}><Text style={s.prodBtnT}>-</Text></TouchableOpacity>}{qty>0&&<Text style={s.prodQty}>{qty}</Text>}<TouchableOpacity style={[s.prodBtn,{backgroundColor:T.success}]} onPress={function(){addToCart(realIdx);}}><Text style={[s.prodBtnT,{color:'#fff'}]}>+</Text></TouchableOpacity></View></View>;})}

          <View style={{backgroundColor:T.bg,borderRadius:12,padding:12,marginTop:10,borderWidth:1,borderColor:T.border}}>
            <Text style={{fontSize:12,fontWeight:'700',color:T.text,marginBottom:6}}>{t('cleaner_dashboard_custom_title')}</Text>
            <Text style={{fontSize:10,color:T.muted,marginBottom:8}}>{t('cleaner_dashboard_custom_desc')}</Text>
            <TextInput style={{backgroundColor:'#fff',borderWidth:1,borderColor:T.border,borderRadius:8,paddingHorizontal:10,paddingVertical:8,fontSize:13,color:T.text,marginBottom:6}} placeholder={t('cleaner_dashboard_custom_ph_name')} placeholderTextColor={T.muted} value={customItem} onChangeText={setCustomItem} />
            <View style={{flexDirection:'row',gap:6}}>
              <TextInput style={{flex:1,backgroundColor:'#fff',borderWidth:1,borderColor:T.border,borderRadius:8,paddingHorizontal:10,paddingVertical:8,fontSize:13,color:T.text}} placeholder={t('cleaner_dashboard_custom_ph_price')} placeholderTextColor={T.muted} value={customPrice} onChangeText={setCustomPrice} keyboardType="numeric" />
              <TextInput style={{width:60,backgroundColor:'#fff',borderWidth:1,borderColor:T.border,borderRadius:8,paddingHorizontal:10,paddingVertical:8,fontSize:13,color:T.text}} placeholder={t('cleaner_dashboard_custom_ph_qty')} placeholderTextColor={T.muted} value={customQty} onChangeText={setCustomQty} keyboardType="numeric" />
              <TouchableOpacity style={{backgroundColor:T.accent,borderRadius:8,paddingHorizontal:14,justifyContent:'center'}} onPress={function(){
                if(!customItem.trim()||!customPrice.trim())return;
                var price=parseFloat(customPrice);var qty=parseInt(customQty)||1;
                if(price<=0)return;
                var newIdx=PRODUCTS.length;
                PRODUCTS.push({name:customItem.trim(), unit:t('cleaner_dashboard_custom_unit'), price:price, emoji:'📦', cat:'Personnalise'});
                var nc={};for(var k in cart)nc[k]=cart[k];nc[newIdx]=qty;setCart(nc);
                setCustomItem('');setCustomPrice('');setCustomQty('1');
                Alert.alert(t('cleaner_dashboard_custom_added_title'), customItem.trim()+' x'+qty);
              }}><Text style={{color:'#fff',fontSize:12,fontWeight:'700'}}>+</Text></TouchableOpacity>
            </View>
          </View>

          {getCartCount()>0&&<View style={s.cartSum}>{(function(){var c=calculateOrderWithCommission(cart,PRODUCTS);return <View><Text style={s.cartLine}>{t('cleaner_dashboard_cart_summary', { subtotal: c.subtotal.toFixed(2), commission: c.commission.toFixed(2), total: c.total.toFixed(2) })}</Text><TouchableOpacity style={s.orderBtn} onPress={sendOrder}><Text style={s.orderBtnT}>{'🛒 '+t('cleaner_dashboard_cart_order_btn', { total: c.total.toFixed(2) })}</Text></TouchableOpacity></View>;})()}</View>}
        </View>}

        {toValidate.length > 0 && <View><Text style={s.sec}>{t('cleaner_dashboard_sec_to_validate')}</Text>
          {toValidate.map(function(b,i){var prop=b.properties?b.properties.name:'';return <AnimCard key={b.id||i} style={[s.bookCard,{borderLeftColor:T.error}]} delay={i*60}>
            <Text style={s.bookName}>🏠 {prop}</Text><Text style={s.bookSub}>📅 {b.date} · 🕐 {b.time||'?'}</Text>
            <View style={{flexDirection:'row',gap:8,marginTop:10}}>
              <TouchableOpacity style={[s.actionBtn,{flex:1,borderColor:T.error}]} onPress={function(){cancelBooking(b);}}><Text style={[s.actionBtnT,{color:T.error}]}>{t('cleaner_dashboard_btn_refuse')}</Text></TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn,{flex:2,backgroundColor:T.success,borderColor:T.success}]} onPress={function(){validateBooking(b);}}><Text style={[s.actionBtnT,{color:'#fff'}]}>{t('cleaner_dashboard_btn_validate')}</Text></TouchableOpacity>
            </View>
          </AnimCard>;})}
        </View>}

        {confirmed.length > 0 && <View><Text style={s.sec}>{t('cleaner_dashboard_sec_confirmed')}</Text>
          {confirmed.map(function(b,i){var prop=b.properties?b.properties.name:'';var addr=b.properties&&b.properties.address?b.properties.address+(b.properties.city?', '+b.properties.city:''):null;var hasGps=b.properties&&b.properties.latitude&&b.properties.longitude;var waitingPayment=b.status==='payment_required'&&!b.payment_held_at;return <AnimCard key={b.id||i} style={[s.bookCard,{borderLeftColor:waitingPayment?'#FF9500':T.success}]} delay={i*50}>
            <View style={{flexDirection:'row',justifyContent:'space-between'}}><View style={{flex:1}}><Text style={s.bookName}>🏠 {prop}</Text><Text style={s.bookSub}>📅 {b.date} · 🕐 {b.time||'?'}</Text>{addr&&<Text style={[s.bookSub,{marginTop:2}]}>📍 {addr}{hasGps?' '+t('cleaner_dashboard_gps_accurate'):''}</Text>}</View>{waitingPayment?<Text style={{color:'#FF9500',fontSize:10,fontWeight:'700'}}>{t('cleaner_dashboard_waiting_host_payment')}</Text>:<Text style={{color:T.success,fontSize:10,fontWeight:'700'}}>{t('cleaner_dashboard_paid')}</Text>}</View>
            <View style={{flexDirection:'row',gap:8,marginTop:8,flexWrap:'wrap'}}>
              {addr&&<TouchableOpacity style={[s.smallBtn,{borderColor:'#1C5F8A'}]} onPress={function(){ showNavigationChoice(addr, hasGps?b.properties.latitude:null, hasGps?b.properties.longitude:null); }}><Text style={[s.smallBtnT,{color:'#1C5F8A'}]}>{hasGps ? t('cleaner_dashboard_itinerary_gps') : t('cleaner_dashboard_itinerary_btn')}</Text></TouchableOpacity>}
              {b.properties&&<TouchableOpacity style={[s.smallBtn,{borderColor:'#34C759'}]} onPress={function(){
                var p=b.properties;
                var info='🏠 '+prop+'\n';
                if(p.address)info+='📍 '+p.address+(p.city?', '+p.city:'')+'\n';
                if(p.wifi_name)info+='📶 WiFi: '+p.wifi_name+(p.wifi_password?' / '+p.wifi_password:'')+'\n';
                if(p.access_code)info+='🔑 Code: '+p.access_code+'\n';
                if(p.access_info)info+='ℹ️ '+p.access_info+'\n';
                if(p.checkin||p.check_in_time)info+='🕐 In: '+(p.checkin||p.check_in_time)+' · Out: '+(p.checkout||p.check_out_time)+'\n';
                if(p.rules)info+='📋 '+t('cleaner_dashboard_info_rules_label')+': '+p.rules+'\n';
                if(p.contacts)info+='📞 Contact: '+p.contacts+'\n';
                Alert.alert(t('cleaner_dashboard_info_title'), info,[
                  {text: t('cleaner_dashboard_info_btn_close')},
                  addr?{text: t('cleaner_dashboard_info_btn_go'), onPress:function(){showNavigationChoice(addr,p.latitude,p.longitude);}}:null,
                ].filter(Boolean));
              }}><Text style={[s.smallBtnT,{color:'#34C759'}]}>{t('cleaner_dashboard_info_btn')}</Text></TouchableOpacity>}
              <TouchableOpacity style={[s.smallBtn,{borderColor:'#FF9500'}]} onPress={function(){modifyTime(b);}}><Text style={[s.smallBtnT,{color:'#FF9500'}]}>{t('cleaner_dashboard_modify_btn')}</Text></TouchableOpacity>
              <TouchableOpacity style={[s.smallBtn,{borderColor:T.error}]} onPress={function(){cancelBooking(b);}}><Text style={[s.smallBtnT,{color:T.error}]}>{t('cleaner_dashboard_cancel_btn')}</Text></TouchableOpacity>
            </View>
          </AnimCard>;})}
        </View>}

        {bookings.length===0&&<AnimCard style={s.empty} delay={100}><Text style={{fontSize:40,marginBottom:12}}>📋</Text><Text style={s.emptyT}>{t('cleaner_dashboard_empty_title')}</Text><Text style={s.emptyS}>{t('cleaner_dashboard_empty_msg')}</Text></AnimCard>}
        <AnimCard style={[s.empty, {marginTop: 14, borderColor: T.accent, borderWidth: 1.5}]} delay={150}>
          <Text style={{fontSize: 36, marginBottom: 10}}>🏠</Text>
          <Text style={[s.emptyT, {color: T.text}]}>
            {propCount === 0 ? t('cleaner_dash_no_property') : t('cleaner_dash_extend_clientele')}
          </Text>
          <Text style={[s.emptyS, {marginBottom: 16}]}>
            {propCount === 0
              ? t('cleaner_dash_prosp_no_host')
              : t('cleaner_dash_prosp_more')}
          </Text>
          <TouchableOpacity 
            style={{backgroundColor: T.dark, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 30, alignItems: 'center'}}
            onPress={function() { setProspectModal(true); }}
          >
            <Text style={{color: T.accent, fontWeight: '700', fontSize: 13, textAlign: 'center'}}>
              {t('cleaner_dash_prosp_btn')}
            </Text>
          </TouchableOpacity>
          <Text style={{color: T.muted, fontSize: 10, marginTop: 10, fontStyle: 'italic'}}>
            {t('cleaner_dash_prosp_footer')}
          </Text>
        </AnimCard>
        <ShippingAddressModal
          visible={showAddrModal}
          onClose={function(){setShowAddrModal(false);}}
          onConfirm={function(addr){sendOrderConfirmed(addr);}}
          prefill={orderProp ? { address: orderProp.address || '', city: orderProp.city || '' } : {}}
          recapText={t('common_property')+': '+(orderProp?orderProp.name:'')+' - '+getCartCount()+' '+t('shop_items')}
          totalText={getCartCount()>0 ? 'Total: '+calculateOrderWithCommission(cart,PRODUCTS).total.toFixed(2)+' EUR' : ''}
        />
        <ProspectionRequestModal
          visible={prospectModal}
          onClose={function() { setProspectModal(false); }}
        />
        <View style={{height:30}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  safe:{flex:1,backgroundColor:T.dark},hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18,paddingVertical:14,backgroundColor:T.dark},
  hdrT:{fontSize:18,fontWeight:'600',color:'#fff'},badge:{backgroundColor:'rgba(28,95,138,0.15)',paddingHorizontal:12,paddingVertical:4,borderRadius:12},badgeT:{fontSize:12,fontWeight:'700',color:T.blue},
  statsRow:{flexDirection:'row',gap:8,marginBottom:14},stat:{flex:1,backgroundColor:T.card,borderRadius:14,padding:12,alignItems:'center',borderWidth:1,borderColor:T.border},
  statV:{fontSize:18,fontWeight:'700',marginBottom:2},statL:{fontSize:6,fontWeight:'700',color:T.muted,letterSpacing:0.5},
  sec:{fontSize:15,fontWeight:'600',color:T.text,marginBottom:10,marginTop:8},
  shopBtn:{backgroundColor:T.card,borderRadius:14,padding:14,flexDirection:'row',alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:T.accent,marginBottom:14,position:'relative'},shopBtnT:{fontSize:14,fontWeight:'600',color:T.accent},
  cartBadge:{position:'absolute',right:12,backgroundColor:T.error,minWidth:22,height:22,borderRadius:11,alignItems:'center',justifyContent:'center',paddingHorizontal:5},cartBadgeT:{color:'#fff',fontSize:11,fontWeight:'700'},
  shopCard:{backgroundColor:T.card,borderRadius:16,padding:16,marginBottom:14,borderWidth:1,borderColor:T.accent},shopTitle:{fontSize:14,fontWeight:'700',color:T.text,marginBottom:12,textAlign:'center'},
  propPill:{backgroundColor:T.bg,paddingHorizontal:14,paddingVertical:8,borderRadius:10,borderWidth:1,borderColor:T.border},propPillA:{backgroundColor:T.blue,borderColor:T.blue},propPillT:{fontSize:12,fontWeight:'600',color:T.text},
  prodRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:8,borderBottomWidth:1,borderBottomColor:T.border},prodName:{fontSize:12,fontWeight:'600',color:T.text},prodPrice:{fontSize:10,color:T.muted},
  prodBtn:{width:28,height:28,borderRadius:8,backgroundColor:'#F0F0F0',alignItems:'center',justifyContent:'center'},prodBtnT:{fontSize:14,fontWeight:'600',color:T.text},prodQty:{fontSize:14,fontWeight:'700',color:T.text},
  cartSum:{marginTop:12,borderTopWidth:1,borderTopColor:T.border,paddingTop:12},cartLine:{fontSize:12,color:T.sub,textAlign:'center',marginBottom:10},
  orderBtn:{backgroundColor:T.accent,borderRadius:10,paddingVertical:11,paddingHorizontal:16,alignItems:'center',justifyContent:'center'},orderBtnT:{color:'#fff',fontSize:13,fontWeight:'600'},
  bookCard:{backgroundColor:T.card,borderRadius:14,padding:14,marginBottom:10,borderWidth:1,borderColor:T.border,borderLeftWidth:4},
  bookName:{fontSize:14,fontWeight:'600',color:T.text},bookSub:{fontSize:12,color:T.muted,marginTop:2},
  actionBtn:{borderRadius:10,paddingVertical:12,alignItems:'center',borderWidth:1,borderColor:T.border},actionBtnT:{fontSize:13,fontWeight:'600',color:T.text},
  smallBtn:{borderRadius:8,paddingVertical:8,paddingHorizontal:12,borderWidth:1,borderColor:T.border},smallBtnT:{fontSize:11,fontWeight:'600'},
  empty:{backgroundColor:T.card,borderRadius:16,padding:30,alignItems:'center',borderWidth:1,borderColor:T.border,marginTop:10},
  emptyT:{fontSize:16,fontWeight:'600',color:T.text,marginBottom:6},emptyS:{fontSize:13,color:T.muted,textAlign:'center'},
});
