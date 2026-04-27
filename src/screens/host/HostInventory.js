import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, Animated, Linking, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, SUPABASE_ANON, EDGE_URL } from '../../config/supabase';
import T from '../../theme';
import { getUserPlan, canUseFeature } from '../../utils/subscription';
import { t, useLang, getLang } from '../../i18n';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

var CATEGORY_KEYS = {
  hygiene: 'host_inventory_cat_hygiene',
  nettoyage: 'host_inventory_cat_cleaning',
  literie: 'host_inventory_cat_bedding',
  cuisine: 'host_inventory_cat_kitchen',
  accueil: 'host_inventory_cat_welcome',
  general: 'host_inventory_cat_general',
};
function getCatLabel(k) { return CATEGORY_KEYS[k] ? t(CATEGORY_KEYS[k]) : '📦'; }

var SUGGESTIONS = [
  { name: 'Savon mains', cat: 'hygiene', unit: 'bouteille', min: 3 },
  { name: 'Shampoing', cat: 'hygiene', unit: 'bouteille', min: 3 },
  { name: 'Gel douche', cat: 'hygiene', unit: 'bouteille', min: 3 },
  { name: 'Papier toilette', cat: 'hygiene', unit: 'rouleau', min: 6 },
  { name: 'Mouchoirs', cat: 'hygiene', unit: 'boite', min: 2 },
  { name: 'Nettoyant multi-surfaces', cat: 'nettoyage', unit: 'bouteille', min: 2 },
  { name: 'Liquide vaisselle', cat: 'nettoyage', unit: 'bouteille', min: 2 },
  { name: 'Eponges', cat: 'nettoyage', unit: 'piece', min: 4 },
  { name: 'Sacs poubelle', cat: 'nettoyage', unit: 'rouleau', min: 2 },
  { name: 'Draps', cat: 'literie', unit: 'jeu', min: 2 },
  { name: 'Taies oreillers', cat: 'literie', unit: 'piece', min: 4 },
  { name: 'Serviettes bain', cat: 'literie', unit: 'piece', min: 4 },
  { name: 'Capsules cafe', cat: 'cuisine', unit: 'boite', min: 2 },
  { name: 'The', cat: 'cuisine', unit: 'boite', min: 1 },
  { name: 'Sucre', cat: 'cuisine', unit: 'paquet', min: 1 },
  { name: 'Guide d\'accueil', cat: 'accueil', unit: 'exemplaire', min: 1 },
  { name: 'Piles telecommandes', cat: 'general', unit: 'paire', min: 2 },
  { name: 'Ampoules', cat: 'general', unit: 'piece', min: 2 },
];

function AnimatedItem(props) {
  var fadeAnim = useRef(new Animated.Value(0)).current;
  var slideAnim = useRef(new Animated.Value(30)).current;
  var scaleAnim = useRef(new Animated.Value(1)).current;
  useEffect(function() {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: props.index * 50, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, delay: props.index * 50, useNativeDriver: true }),
    ]).start();
  }, []);
  function pulseQty() {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.2, friction: 3, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  }
  var item = props.item;
  var isCritical = item.quantity <= item.min_quantity;
  var pct = item.min_quantity > 0 ? Math.min(100, Math.round((item.quantity / (item.min_quantity * 2)) * 100)) : 100;
  var barColor = pct < 30 ? T.error : pct < 60 ? '#FF9500' : T.success;
  return (
    <Animated.View style={[s.itemCard, isCritical && s.itemCritical, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={s.itemH}>
        <Text style={s.itemCat}>{getCatLabel(item.category)}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.itemName}>{item.item_name}</Text>
          <View style={s.barOuter}><View style={[s.barInner, { width: pct + '%', backgroundColor: barColor }]} /></View>
        </View>
        {isCritical && <Text style={{ fontSize: 18 }}>⚠️</Text>}
      </View>
      <View style={s.qtyRow}>
        <Text style={s.itemUnit}>{item.unit} · {t('host_inventory_item_min', { min: item.min_quantity })}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity style={s.qtyBtn} onPress={function() { pulseQty(); props.onUpdate(item, -1); }}><Text style={s.qtyBtnT}>−</Text></TouchableOpacity>
          <Animated.Text style={[s.qtyVal, { transform: [{ scale: scaleAnim }] }]}>{item.quantity}</Animated.Text>
          <TouchableOpacity style={[s.qtyBtn, { backgroundColor: T.success }]} onPress={function() { pulseQty(); props.onUpdate(item, 1); }}><Text style={[s.qtyBtnT, { color: '#fff' }]}>+</Text></TouchableOpacity>
<TouchableOpacity style={[s.qtyBtn, { backgroundColor: '#dc2626', marginLeft: 6 }]} onPress={function() { props.onDelete(item); }}><Text style={[s.qtyBtnT, { color: '#fff', fontSize: 14 }]}>🗑</Text></TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

export default function HostInventory(props) {
  useLang();
  var _userPlan = useState('free'); var userPlan = _userPlan[0]; var setUserPlan = _userPlan[1];
  var _props2 = useState([]); var properties = _props2[0]; var setProperties = _props2[1];
  var _sel = useState(null); var sel = _sel[0]; var setSel = _sel[1];
  var _items = useState([]); var items = _items[0]; var setItems = _items[1];
  var _showAdd = useState(false); var showAdd = _showAdd[0]; var setShowAdd = _showAdd[1];
  var _newName = useState(''); var newName = _newName[0]; var setNewName = _newName[1];
  var _newCat = useState('general'); var newCat = _newCat[0]; var setNewCat = _newCat[1];
  var _newQty = useState('5'); var newQty = _newQty[0]; var setNewQty = _newQty[1];
  var _newMin = useState('2'); var newMin = _newMin[0]; var setNewMin = _newMin[1];
  var _newUnit = useState(t('host_inventory_unit_default')); var newUnit = _newUnit[0]; var setNewUnit = _newUnit[1];
  var _filter = useState('all'); var filter = _filter[0]; var setFilter = _filter[1];
  var _aiMsg = useState(''); var aiMsg = _aiMsg[0]; var setAiMsg = _aiMsg[1];
  var _aiReply = useState(''); var aiReply = _aiReply[0]; var setAiReply = _aiReply[1];
  var _aiLoading = useState(false); var aiLoading = _aiLoading[0]; var setAiLoading = _aiLoading[1];
  var headerFade = useRef(new Animated.Value(0)).current;

  useEffect(function() { getUserPlan(props.session.user.id).then(function(p){setUserPlan(p);}); }, []);
  useEffect(function() { Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }).start(); }, []);

  function load() {
    supabase.from('properties').select('*').eq('user_id', props.session.user.id).then(function(r) {
      if (r.data) { setProperties(r.data); if (r.data.length > 0 && !sel) setSel(r.data[0]); }
    });
  }
  function loadItems(propId) {
    supabase.from('host_inventory').select('*').eq('property_id', propId).eq('user_id', props.session.user.id).order('category').then(function(r) {
      if (r.data) setItems(r.data);
    });
  }
  useEffect(function() { load(); }, []);
  useEffect(function() { if (sel) loadItems(sel.id); }, [sel]);

  if (!canUseFeature(userPlan, 'stock')) {
    return (
      <SafeAreaView style={{flex:1,backgroundColor:'#141414'}} edges={['top']}>
        <View style={{paddingHorizontal:18,paddingVertical:14,backgroundColor:'#141414'}}><Text style={{fontSize:18,fontWeight:'600',color:'#fff'}}>{t('host_inventory_header_locked')}</Text></View>
        <View style={{flex:1,backgroundColor:'#FAFAF8',alignItems:'center',justifyContent:'center',padding:30}}>
          <Text style={{fontSize:50,marginBottom:16}}>📦</Text>
          <Text style={{fontSize:18,fontWeight:'600',color:'#141414',marginBottom:8,textAlign:'center'}}>{t('host_inventory_locked_title')}</Text>
          <Text style={{fontSize:14,color:'#9B9B9B',textAlign:'center',lineHeight:22,marginBottom:20}}>{t('host_inventory_locked_msg')}</Text>
          <TouchableOpacity style={{backgroundColor:'#C8965A',borderRadius:12,paddingVertical:14,paddingHorizontal:30}} onPress={function(){props.navigation.navigate('Settings');}}><Text style={{color:'#fff',fontSize:14,fontWeight:'700'}}>{t('host_inventory_locked_see_plans')}</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  function addItem() {
    if (!canUseFeature(userPlan, 'stock')) {
      Alert.alert(t('host_inventory_locked_alert_title'), t('host_inventory_locked_alert_msg'));
      return;
    }
    if (!newName.trim()) { Alert.alert(t('common_error'), t('host_inventory_err_name_required')); return; }
    if (!sel || !sel.id) { Alert.alert(t('common_error'), t('host_inventory_err_select_property')); return; }
    supabase.from('host_inventory').insert({ user_id: props.session.user.id, property_id: sel.id, item_name: newName.trim(), category: newCat, quantity: parseInt(newQty) || 0, min_quantity: parseInt(newMin) || 2, unit: newUnit }).then(function(r) {
      if (r.error) { Alert.alert(t('host_inventory_err_stock_title'), r.error.message); return; }
      setNewName(''); setShowAdd(false); loadItems(sel.id);
    });
  }
  function updateQty(item, delta) {
    var newQ = Math.max(0, item.quantity + delta);
    supabase.from('host_inventory').update({ quantity: newQ }).eq('id', item.id).then(function() { loadItems(sel.id); });
  }
  function deleteItem(item) {
    Alert.alert(t('host_inventory_delete_title'), t('host_inventory_delete_msg', { name: item.item_name }), [
      { text: t('host_inventory_delete_cancel') },
      { text: t('host_inventory_delete_confirm'), style: 'destructive', onPress: function() {
        supabase.from('host_inventory').delete().eq('id', item.id).then(function() { loadItems(sel.id); });
      }}
    ]);
  }
  function addSuggestions() {
    if (!sel) return;
    var toInsert = SUGGESTIONS.map(function(sg) { return { user_id: props.session.user.id, property_id: sel.id, item_name: sg.name, category: sg.cat, quantity: 0, min_quantity: sg.min, unit: sg.unit }; });
    supabase.from('host_inventory').insert(toInsert).then(function(r) {
      if (r.error) Alert.alert(t('common_error'), r.error.message);
      else { Alert.alert(t('host_inventory_prefill_success_title'), t('host_inventory_prefill_success_msg', { count: SUGGESTIONS.length })); loadItems(sel.id); }
    });
  }
  function orderByMail() {
    var critical = items.filter(function(it) { return it.quantity <= it.min_quantity; });
    if (critical.length === 0) { Alert.alert(t('host_inventory_order_ok_title'), t('host_inventory_order_ok_msg')); return; }
    var list = critical.map(function(it) { return '  • ' + it.item_name + ' — stock: ' + it.quantity + ' ' + it.unit + ' (min: ' + it.min_quantity + ')'; }).join('\n');
    fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/send-email', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ to: 'myhostkit.contact@gmail.com', subject: 'MyHostKit — Commande : ' + sel.name, body: 'Commande pour :\n' + sel.name + '\n\nArticles :\n' + list }),
    }).then(function() { Alert.alert(t('host_inventory_order_sent_title')); }).catch(function() { Alert.alert(t('host_inventory_order_error')); });
  }
  function askAI() {
    if (!aiMsg.trim()) return;
    setAiLoading(true);
    var langInstruction = getLang() === 'en' ? 'Answer in English briefly.' : 'Reponds en francais brievement.';
    var sp = 'You are the MyHostKit stock assistant for "' + (sel ? sel.name : '') + '". Stock: ' + items.map(function(it) { return it.item_name + ':' + it.quantity; }).join(', ') + '. ' + langInstruction;
    fetch(EDGE_URL + '/ai-concierge', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON }, body: JSON.stringify({ message: aiMsg, systemPrompt: sp }) })
    .then(function(r) { return r.json(); }).then(function(d) { setAiReply(d.response || d.reply || t('host_inventory_ai_error')); setAiLoading(false); })
    .catch(function() { setAiReply(t('host_inventory_ai_unavailable')); setAiLoading(false); });
  }

  var criticalCount = items.filter(function(it) { return it.quantity <= it.min_quantity; }).length;
  var totalValue = items.reduce(function(acc, it) { return acc + it.quantity; }, 0);
  var filtered = items;
  if (filter === 'critical') filtered = items.filter(function(it) { return it.quantity <= it.min_quantity; });
  else if (filter !== 'all') filtered = items.filter(function(it) { return it.category === filter; });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Animated.View style={[s.hdr, { opacity: headerFade }]}>
        <View><Text style={s.hdrT}>{t('host_inventory_header')}</Text><Text style={s.hdrSub}>{t('host_inventory_articles_ref', { total: totalValue, count: items.length })}</Text></View>
        {criticalCount > 0 && <View style={s.alertBadge}><Text style={s.alertBadgeT}>⚠️ {criticalCount}</Text></View>}
      </Animated.View>
      <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
          {properties.map(function(p) { var a = sel && sel.id === p.id; return <TouchableOpacity key={p.id} style={[s.propPill, a && s.propPillA]} onPress={function() { setSel(p); }}><Text style={[s.propPillT, a && { color: '#fff' }]}>{p.name}</Text></TouchableOpacity>; })}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 6 }}>
          {[{ key: 'all', label: t('host_inventory_filter_all') }, { key: 'critical', label: t('host_inventory_filter_critical') }].concat(Object.keys(CATEGORY_KEYS).map(function(k) { return { key: k, label: getCatLabel(k) }; })).map(function(f) {
            var active = filter === f.key;
            return <TouchableOpacity key={f.key} style={[s.filterPill, active && s.filterPillA]} onPress={function() { setFilter(f.key); }}><Text style={[s.filterPillT, active && { color: '#fff' }]}>{f.label}</Text></TouchableOpacity>;
          })}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          <TouchableOpacity style={s.actionBtn} onPress={function() { setShowAdd(!showAdd); }}><Text style={s.actionBtnT}>{showAdd ? '✕' : t('host_inventory_btn_add')}</Text></TouchableOpacity>
          {items.length === 0 && <TouchableOpacity style={[s.actionBtn, { backgroundColor: T.accentLight, borderColor: T.accent }]} onPress={addSuggestions}><Text style={[s.actionBtnT, { color: T.accentDark }]}>{t('host_inventory_btn_prefill')}</Text></TouchableOpacity>}
          {criticalCount > 0 && <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#FFF5F5', borderColor: T.error }]} onPress={orderByMail}><Text style={[s.actionBtnT, { color: T.error }]}>{t('host_inventory_btn_order')}</Text></TouchableOpacity>}
        </View>
        {showAdd && <View style={s.addForm}>
          <TextInput style={s.input} placeholder={t('host_inventory_ph_item_name')} placeholderTextColor={T.muted} value={newName} onChangeText={setNewName} />
          <View style={{ flexDirection: 'row', gap: 8 }}><TextInput style={[s.input, { flex: 1 }]} placeholder={t('host_inventory_ph_qty')} placeholderTextColor={T.muted} value={newQty} onChangeText={setNewQty} keyboardType="numeric" /><TextInput style={[s.input, { flex: 1 }]} placeholder={t('host_inventory_ph_min')} placeholderTextColor={T.muted} value={newMin} onChangeText={setNewMin} keyboardType="numeric" /><TextInput style={[s.input, { flex: 1 }]} placeholder={t('host_inventory_ph_unit')} placeholderTextColor={T.muted} value={newUnit} onChangeText={setNewUnit} /></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginVertical: 8 }}>{Object.keys(CATEGORY_KEYS).map(function(k) { return <TouchableOpacity key={k} style={[s.catPill, newCat === k && s.catPillA]} onPress={function() { setNewCat(k); }}><Text style={[s.catPillT, newCat === k && { color: '#fff' }]}>{getCatLabel(k)}</Text></TouchableOpacity>; })}</ScrollView>
          <TouchableOpacity style={s.addBtn} onPress={addItem}><Text style={s.addBtnT}>{t('host_inventory_add_btn')}</Text></TouchableOpacity>
        </View>}
        {filtered.length === 0 ? <View style={s.empty}><Text style={{ fontSize: 40, marginBottom: 12 }}>📦</Text><Text style={s.emptyT}>{filter === 'all' ? t('host_inventory_empty_stock_title') : t('host_inventory_empty_cat_title')}</Text><Text style={s.emptyS}>{filter === 'all' ? t('host_inventory_empty_stock_msg') : t('host_inventory_empty_cat_msg')}</Text></View>
        : filtered.map(function(item, i) {
          return <AnimatedItem key={item.id || i} item={item} index={i} onUpdate={updateQty} onDelete={deleteItem} />;
        })}
        <Text style={s.sec}>{t('host_inventory_ai_title')}</Text>
        <View style={s.aiCard}>
          <TextInput style={s.aiInput} placeholder={t('host_inventory_ai_placeholder')} placeholderTextColor={T.muted} value={aiMsg} onChangeText={setAiMsg} multiline />
          <TouchableOpacity style={s.aiBtn} onPress={askAI} disabled={aiLoading}>{aiLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.aiBtnT}>{t('host_inventory_ai_btn')}</Text>}</TouchableOpacity>
          {aiReply ? <Text style={s.aiReply}>{aiReply}</Text> : null}
        </View>
        <Text style={s.helpTip}>{t('host_inventory_help_tip')}</Text>
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  safe:{flex:1,backgroundColor:T.dark},hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18,paddingVertical:14,backgroundColor:T.dark},hdrT:{fontSize:18,fontWeight:'600',color:'#fff'},hdrSub:{fontSize:11,color:'rgba(255,255,255,0.5)',marginTop:2},
  alertBadge:{backgroundColor:'rgba(255,59,48,0.15)',paddingHorizontal:12,paddingVertical:6,borderRadius:12},alertBadgeT:{fontSize:13,fontWeight:'700',color:T.error},
  propPill:{backgroundColor:T.card,paddingHorizontal:16,paddingVertical:10,borderRadius:12,borderWidth:1,borderColor:T.border},propPillA:{backgroundColor:T.accent,borderColor:T.accent},propPillT:{fontSize:13,fontWeight:'600',color:T.text},
  filterPill:{backgroundColor:T.card,paddingHorizontal:12,paddingVertical:8,borderRadius:10,borderWidth:1,borderColor:T.border},filterPillA:{backgroundColor:T.blue,borderColor:T.blue},filterPillT:{fontSize:11,fontWeight:'600',color:T.text},
  actionBtn:{backgroundColor:T.card,borderWidth:1,borderColor:T.border,borderRadius:10,paddingHorizontal:14,paddingVertical:10},actionBtnT:{fontSize:12,fontWeight:'600',color:T.text},
  addForm:{backgroundColor:T.card,borderRadius:14,padding:14,marginBottom:14,borderWidth:1,borderColor:T.blue},
  input:{backgroundColor:T.bg,borderWidth:1,borderColor:T.border,borderRadius:10,paddingHorizontal:12,paddingVertical:10,fontSize:14,color:T.text,marginBottom:8},
  catPill:{backgroundColor:T.bg,borderWidth:1,borderColor:T.border,borderRadius:10,paddingHorizontal:12,paddingVertical:8},catPillA:{backgroundColor:T.blue,borderColor:T.blue},catPillT:{fontSize:11,fontWeight:'600',color:T.text},
  addBtn:{backgroundColor:T.blue,borderRadius:10,paddingVertical:12,alignItems:'center',marginTop:4},addBtnT:{color:'#fff',fontWeight:'700',fontSize:14},
  empty:{backgroundColor:T.card,borderRadius:16,padding:30,alignItems:'center',borderWidth:1,borderColor:T.border},emptyT:{fontSize:16,fontWeight:'600',color:T.text,marginBottom:6},emptyS:{fontSize:13,color:T.muted,textAlign:'center'},
  itemCard:{backgroundColor:T.card,borderRadius:14,padding:14,marginBottom:8,borderWidth:1,borderColor:T.border},itemCritical:{borderLeftWidth:4,borderLeftColor:T.error,backgroundColor:'#FFFAFA'},
  itemH:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:8},itemCat:{fontSize:14},itemName:{fontSize:14,fontWeight:'600',color:T.text,marginBottom:4},
  barOuter:{height:4,backgroundColor:'#E8E8E8',borderRadius:2,overflow:'hidden'},barInner:{height:4,borderRadius:2},
  qtyRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},itemUnit:{fontSize:11,color:T.muted},
  qtyBtn:{width:36,height:36,borderRadius:10,backgroundColor:'#F0F0F0',alignItems:'center',justifyContent:'center'},qtyBtnT:{fontSize:20,fontWeight:'600',color:T.text},
  qtyVal:{fontSize:22,fontWeight:'700',color:T.text,minWidth:34,textAlign:'center'},
  sec:{fontSize:15,fontWeight:'600',color:T.text,marginTop:18,marginBottom:8},
  aiCard:{backgroundColor:T.card,borderRadius:14,padding:14,borderWidth:1,borderColor:T.border},
  aiInput:{backgroundColor:T.bg,borderWidth:1,borderColor:T.border,borderRadius:10,paddingHorizontal:12,paddingVertical:10,fontSize:14,color:T.text,minHeight:50,textAlignVertical:'top',marginBottom:8},
  aiBtn:{backgroundColor:T.accent,borderRadius:10,paddingVertical:12,alignItems:'center'},aiBtnT:{color:'#fff',fontWeight:'700',fontSize:14},
  aiReply:{fontSize:13,color:T.sub,lineHeight:20,marginTop:10,padding:12,backgroundColor:T.bg,borderRadius:10},
  helpTip:{fontSize:11,color:T.muted,textAlign:'center',marginTop:12,fontStyle:'italic'},
});