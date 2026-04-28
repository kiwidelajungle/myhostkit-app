import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import T from '../../theme';
import { t, useLang } from '../../i18n';

function getDaysShort() { return [t('cal_day_short_0'), t('cal_day_short_1'), t('cal_day_short_2'), t('cal_day_short_3'), t('cal_day_short_4'), t('cal_day_short_5'), t('cal_day_short_6')]; }
var HOURS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

function getNext14Days() {
  var days = [];
  for (var i = 0; i < 14; i++) {
    var d = new Date(); d.setDate(d.getDate() + i);
    days.push({ date: d.toISOString().split('T')[0], dayName: getDaysShort()[d.getDay()], dayNum: d.getDate(), isToday: i === 0 });
  }
  return days;
}

export default function CleanerCalendar(props) {
  useLang();
  var days = getNext14Days();
  var _avail = useState({}); var availability = _avail[0]; var setAvailability = _avail[1];
  var _cleanerId = useState(null); var cleanerId = _cleanerId[0]; var setCleanerId = _cleanerId[1];
  var _refreshing = useState(false); var refreshing = _refreshing[0]; var setRefreshing = _refreshing[1];
  var _editDay = useState(null); var editDay = _editDay[0]; var setEditDay = _editDay[1]; // date string being edited
  var _editStart = useState('08:00'); var editStart = _editStart[0]; var setEditStart = _editStart[1];
  var _editEnd = useState('18:00'); var editEnd = _editEnd[0]; var setEditEnd = _editEnd[1];

  function load() {
    props.supabase.from('cleaners').select('id').eq('user_id', props.session.user.id).single().then(function(r) {
      if (!r.data) return;
      setCleanerId(r.data.id);
      props.supabase.from('cleaner_availability').select('*').eq('cleaner_id', r.data.id).then(function(ar) {
        if (ar.data) { var map = {}; ar.data.forEach(function(a) { map[a.date] = a; }); setAvailability(map); }
      });
    });
  }

  useEffect(function() { load(); }, []);
  function refresh() { setRefreshing(true); load(); setTimeout(function() { setRefreshing(false); }, 800); }

  function openEdit(dateStr) {
    var existing = availability[dateStr];
    setEditDay(dateStr);
    setEditStart(existing ? existing.time_start : '08:00');
    setEditEnd(existing ? existing.time_end : '18:00');
  }

  function saveSlot() {
    if (!cleanerId || !editDay) return;
    var existing = availability[editDay];

    if (existing) {
      props.supabase.from('cleaner_availability').update({ is_available: true, time_start: editStart, time_end: editEnd, status: 'available' }).eq('id', existing.id).then(function(r) {
        if (r.error) { Alert.alert(t('error_title'), r.error.message); return; }
        var n = {}; for (var k in availability) n[k] = availability[k];
        n[editDay] = { id: existing.id, is_available: true, time_start: editStart, time_end: editEnd, status: 'available' };
        setAvailability(n); setEditDay(null);
      });
    } else {
      props.supabase.from('cleaner_availability').insert({ cleaner_id: cleanerId, date: editDay, time_start: editStart, time_end: editEnd, is_available: true, status: 'available' }).select().then(function(r) {
        if (r.error) { Alert.alert(t('error_title'), r.error.message); return; }
        if (r.data && r.data.length) { var n = {}; for (var k in availability) n[k] = availability[k]; n[editDay] = r.data[0]; setAvailability(n); }
        setEditDay(null);
      });
    }
  }

  function removeSlot(dateStr) {
    var existing = availability[dateStr];
    if (!existing) return;
    props.supabase.from('cleaner_availability').update({ is_available: false, status: 'unavailable' }).eq('id', existing.id).then(function(r) {
      var n = {}; for (var k in availability) n[k] = availability[k];
      n[dateStr] = { id: existing.id, is_available: false, time_start: existing.time_start, time_end: existing.time_end, status: 'unavailable' };
      setAvailability(n);
    });
  }

  var availCount = 0; var bookedCount = 0;
  days.forEach(function(d) { var a = availability[d.date]; if (a && a.is_available && a.status !== 'booked') availCount++; if (a && a.status === 'booked') bookedCount++; });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hdr}><Text style={s.hdrT}>{t('cal_header_title')}</Text><View style={s.badge}><Text style={s.badgeT}>{availCount} {t('cal_badge_available')}</Text></View></View>
      <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={T.accent} />}>
        <View style={s.statsRow}>
          <View style={s.stat}><Text style={[s.statV, { color: T.success }]}>{availCount}</Text><Text style={s.statL}>{t('cal_stat_available')}</Text></View>
          <View style={s.stat}><Text style={[s.statV, { color: '#FF9500' }]}>{bookedCount}</Text><Text style={s.statL}>{t('cal_stat_booked')}</Text></View>
          <View style={s.stat}><Text style={[s.statV, { color: T.muted }]}>{14 - availCount - bookedCount}</Text><Text style={s.statL}>{t('cal_stat_free')}</Text></View>
        </View>

        {days.map(function(day) {
          var a = availability[day.date];
          var isAvail = a && a.is_available && a.status !== 'booked';
          var isBooked = a && a.status === 'booked';
          var isEditing = editDay === day.date;

          return (
            <View key={day.date}>
              <TouchableOpacity style={[s.dayCard, isBooked && s.dayBooked, isAvail && s.dayAvailable]} onPress={function() { if (!isBooked) openEdit(day.date); }} activeOpacity={isBooked ? 1 : 0.7} disabled={isBooked}>
                <View style={s.dayLeft}><Text style={[s.dayName, day.isToday && { color: '#1C5F8A', fontWeight: '700' }]}>{day.dayName}</Text><Text style={[s.dayNum, day.isToday && { color: '#1C5F8A' }]}>{day.dayNum}</Text></View>
                <View style={s.dayCenter}>
                  {isBooked && <Text style={s.dayBookedT}>{t('cal_day_booked_by_host')}</Text>}
                  {isAvail && <Text style={s.dayAvailT}>✅ {a.time_start} → {a.time_end}</Text>}
                  {!a && <Text style={s.dayUndef}>{t('cal_day_undefined')}</Text>}
                  {a && !isAvail && !isBooked && <Text style={s.dayOffT}>{t('cal_day_unavailable')}</Text>}
                </View>
                <View style={s.dayRight}>
                  {isAvail && <TouchableOpacity onPress={function() { removeSlot(day.date); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={{ fontSize: 16, color: T.error }}>✕</Text></TouchableOpacity>}
                </View>
              </TouchableOpacity>

              {/* Éditeur de créneau horaire */}
              {isEditing && (
                <View style={s.editCard}>
                  <Text style={s.editTitle}>{t('cal_edit_title', { date: day.date })}</Text>
                  <Text style={s.editLabel}>{t('cal_edit_label_start')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {HOURS.map(function(h) {
                      return <TouchableOpacity key={h} style={[s.hPill, editStart === h && s.hPillActive]} onPress={function() { setEditStart(h); }}><Text style={[s.hPillT, editStart === h && { color: '#fff' }]}>{h}</Text></TouchableOpacity>;
                    })}
                  </ScrollView>
                  <Text style={s.editLabel}>{t('cal_edit_label_end')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {HOURS.map(function(h) {
                      return <TouchableOpacity key={h} style={[s.hPill, editEnd === h && s.hPillActive]} onPress={function() { setEditEnd(h); }}><Text style={[s.hPillT, editEnd === h && { color: '#fff' }]}>{h}</Text></TouchableOpacity>;
                    })}
                  </ScrollView>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                    <TouchableOpacity style={s.cancelBtn} onPress={function() { setEditDay(null); }}><Text style={s.cancelBtnT}>{t('cal_btn_cancel')}</Text></TouchableOpacity>
                    <TouchableOpacity style={s.saveBtn} onPress={saveSlot}><Text style={s.saveBtnT}>{t('cal_btn_save', { start: editStart, end: editEnd })}</Text></TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        <View style={s.helpCard}><Text style={{ fontSize: 18 }}>💡</Text><Text style={s.helpText}>{t('cal_help_text')}</Text></View>
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
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  stat: { flex: 1, backgroundColor: T.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: T.border },
  statV: { fontSize: 20, fontWeight: '700', marginBottom: 2 }, statL: { fontSize: 8, fontWeight: '700', color: T.muted, letterSpacing: 0.5 },
  dayCard: { backgroundColor: T.card, borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: T.border },
  dayAvailable: { borderLeftWidth: 4, borderLeftColor: T.success }, dayBooked: { borderLeftWidth: 4, borderLeftColor: '#FF9500', backgroundColor: '#FFF8F0' },
  dayLeft: { width: 44, alignItems: 'center', marginRight: 12 }, dayName: { fontSize: 11, fontWeight: '600', color: T.muted }, dayNum: { fontSize: 22, fontWeight: '700', color: T.text },
  dayCenter: { flex: 1 }, dayAvailT: { fontSize: 13, color: T.success, fontWeight: '600' }, dayBookedT: { fontSize: 13, color: '#FF9500', fontWeight: '600' }, dayUndef: { fontSize: 12, color: T.muted }, dayOffT: { fontSize: 12, color: T.error },
  dayRight: { marginLeft: 8, width: 30, alignItems: 'center' },
  editCard: { backgroundColor: T.card, borderRadius: 14, padding: 16, marginBottom: 8, marginTop: -4, borderWidth: 1, borderColor: '#1C5F8A', borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  editTitle: { fontSize: 14, fontWeight: '600', color: '#1C5F8A', marginBottom: 12 },
  editLabel: { fontSize: 10, fontWeight: '700', color: T.muted, letterSpacing: 0.5, marginBottom: 8, marginTop: 10 },
  hPill: { backgroundColor: T.bg, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  hPillActive: { backgroundColor: '#1C5F8A', borderColor: '#1C5F8A' }, hPillT: { fontSize: 13, fontWeight: '600', color: T.text },
  cancelBtn: { flex: 1, backgroundColor: T.bg, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: T.border }, cancelBtnT: { fontSize: 13, fontWeight: '600', color: T.sub },
  saveBtn: { flex: 2, backgroundColor: '#1C5F8A', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }, saveBtnT: { fontSize: 13, fontWeight: '700', color: '#fff' },
  helpCard: { backgroundColor: '#E8F4FB', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 8, borderWidth: 1, borderColor: 'rgba(28,95,138,0.15)' },
  helpText: { fontSize: 12, color: '#1C5F8A', lineHeight: 18, flex: 1 },
});
