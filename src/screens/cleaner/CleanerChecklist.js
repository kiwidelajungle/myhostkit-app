import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import T from '../../theme';
import { t, useLang } from '../../i18n';


var CHECKLIST = [
  { section: 'Entree', sectionKey: 'cleaner_checklist_section_entrance', items: [
    { id: 'entrance_1', key: 'cleaner_checklist_entrance_1' },
    { id: 'entrance_2', key: 'cleaner_checklist_entrance_2' },
    { id: 'entrance_3', key: 'cleaner_checklist_entrance_3' },
    { id: 'entrance_4', key: 'cleaner_checklist_entrance_4' },
  ]},
  { section: 'Salon', sectionKey: 'cleaner_checklist_section_living', items: [
    { id: 'living_1', key: 'cleaner_checklist_living_1' },
    { id: 'living_2', key: 'cleaner_checklist_living_2' },
    { id: 'living_3', key: 'cleaner_checklist_living_3' },
    { id: 'living_4', key: 'cleaner_checklist_living_4' },
    { id: 'living_5', key: 'cleaner_checklist_living_5' },
    { id: 'living_6', key: 'cleaner_checklist_living_6' },
  ]},
  { section: 'Cuisine', sectionKey: 'cleaner_checklist_section_kitchen', items: [
    { id: 'kitchen_1', key: 'cleaner_checklist_kitchen_1' },
    { id: 'kitchen_2', key: 'cleaner_checklist_kitchen_2' },
    { id: 'kitchen_3', key: 'cleaner_checklist_kitchen_3' },
    { id: 'kitchen_4', key: 'cleaner_checklist_kitchen_4' },
    { id: 'kitchen_5', key: 'cleaner_checklist_kitchen_5' },
    { id: 'kitchen_6', key: 'cleaner_checklist_kitchen_6' },
    { id: 'kitchen_7', key: 'cleaner_checklist_kitchen_7' },
  ]},
  { section: 'Chambres', sectionKey: 'cleaner_checklist_section_bedrooms', items: [
    { id: 'bedroom_1', key: 'cleaner_checklist_bedroom_1' },
    { id: 'bedroom_2', key: 'cleaner_checklist_bedroom_2' },
    { id: 'bedroom_3', key: 'cleaner_checklist_bedroom_3' },
    { id: 'bedroom_4', key: 'cleaner_checklist_bedroom_4' },
    { id: 'bedroom_5', key: 'cleaner_checklist_bedroom_5' },
    { id: 'bedroom_6', key: 'cleaner_checklist_bedroom_6' },
  ]},
  { section: 'Salle de bain', sectionKey: 'cleaner_checklist_section_bathroom', items: [
    { id: 'bathroom_1', key: 'cleaner_checklist_bathroom_1' },
    { id: 'bathroom_2', key: 'cleaner_checklist_bathroom_2' },
    { id: 'bathroom_3', key: 'cleaner_checklist_bathroom_3' },
    { id: 'bathroom_4', key: 'cleaner_checklist_bathroom_4' },
    { id: 'bathroom_5', key: 'cleaner_checklist_bathroom_5' },
    { id: 'bathroom_6', key: 'cleaner_checklist_bathroom_6' },
    { id: 'bathroom_7', key: 'cleaner_checklist_bathroom_7' },
  ]},
  { section: 'General', sectionKey: 'cleaner_checklist_section_general', items: [
    { id: 'general_1', key: 'cleaner_checklist_general_1' },
    { id: 'general_2', key: 'cleaner_checklist_general_2' },
    { id: 'general_3', key: 'cleaner_checklist_general_3' },
    { id: 'general_4', key: 'cleaner_checklist_general_4' },
    { id: 'general_5', key: 'cleaner_checklist_general_5' },
    { id: 'general_6', key: 'cleaner_checklist_general_6' },
  ]},
];

export default function CleanerChecklist(props) {
  useLang();
  var _checked = useState({}); var checked = _checked[0]; var setChecked = _checked[1];

  function toggle(itemId) {
    var n = {}; for (var k in checked) n[k] = checked[k];
    n[itemId] = !n[itemId];
    setChecked(n);
  }

  var totalItems = 0; var doneItems = 0;
  CHECKLIST.forEach(function(sec) { sec.items.forEach(function(it) { totalItems++; if (checked[it.id]) doneItems++; }); });
  var pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
  var progressText = doneItems === 1
    ? t('cleaner_checklist_progress_single')
    : t('cleaner_checklist_progress_plural', { done: doneItems, total: totalItems });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hdr}>
        <Text style={s.hdrT}>{t('cleaner_checklist_header')}</Text>
        <View style={s.badge}><Text style={s.badgeT}>{pct}%</Text></View>
      </View>
      <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={{ padding: 16 }}>
        <View style={s.progOuter}><View style={[s.progInner, { width: pct + '%' }]} /></View>
        <Text style={s.progText}>{progressText}</Text>

        {CHECKLIST.map(function(sec) {
          return (
            <View key={sec.section} style={s.secCard}>
              <Text style={s.secTitle}>{t(sec.sectionKey)}</Text>
              {sec.items.map(function(item) {
                var done = checked[item.id];
                return (
                  <TouchableOpacity key={item.id} style={s.itemRow} onPress={function() { toggle(item.id); }}>
                    <View style={[s.checkbox, done && s.checkboxDone]}>{done && <Text style={s.checkT}>✓</Text>}</View>
                    <Text style={[s.itemText, done && s.itemDone]}>{t(item.key)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        {pct === 100 && (
          <TouchableOpacity style={s.doneBtn} onPress={function() { Alert.alert(t('cleaner_checklist_done_alert_title'), t('cleaner_checklist_done_alert_msg')); }}>
            <Text style={s.doneBtnT}>{t('cleaner_checklist_done_btn')}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.dark },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, backgroundColor: T.dark },
  hdrT: { fontSize: 18, fontWeight: '600', color: '#fff' },
  badge: { backgroundColor: 'rgba(52,199,89,0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }, badgeT: { fontSize: 12, fontWeight: '700', color: T.success },
  progOuter: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progInner: { height: 8, backgroundColor: T.success, borderRadius: 4 },
  progText: { fontSize: 12, color: T.muted, marginBottom: 16, textAlign: 'center' },
  secCard: { backgroundColor: T.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: T.border },
  secTitle: { fontSize: 14, fontWeight: '700', color: T.text, marginBottom: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.border },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: T.success, borderColor: T.success }, checkT: { color: '#fff', fontWeight: '700', fontSize: 14 },
  itemText: { fontSize: 14, color: T.text, flex: 1 }, itemDone: { textDecorationLine: 'line-through', color: T.muted },
  doneBtn: { backgroundColor: T.success, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  doneBtnT: { color: '#fff', fontSize: 14, fontWeight: '700' },
});