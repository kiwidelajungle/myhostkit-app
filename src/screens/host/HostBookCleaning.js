import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T } from '../../config/theme';
import { supabase } from '../../config/supabase';
import { t, useLang } from '../../i18n';

export default function HostBookCleaning(props) {
  useLang();
  var _p = useState([]); var properties = _p[0]; var setProperties = _p[1];
  var _sel = useState(null); var selected = _sel[0]; var setSelected = _sel[1];
  var _date = useState(''); var date = _date[0]; var setDate = _date[1];
  var _time = useState('11:00'); var time = _time[0]; var setTime = _time[1];
  var _notes = useState(''); var notes = _notes[0]; var setNotes = _notes[1];
  var _guest = useState(''); var guestName = _guest[0]; var setGuestName = _guest[1];
  var _loading = useState(false); var loading = _loading[0]; var setLoading = _loading[1];
  var _history = useState([]); var history = _history[0]; var setHistory = _history[1];

  function load() {
    supabase.from('properties').select('*').eq('user_id', props.session.user.id).then(function(r) {
      if (r.data) { setProperties(r.data); if (r.data.length > 0 && !selected) setSelected(r.data[0]); }
    });
    supabase.from('bookings').select('*, properties(name)').eq('host_id', props.session.user.id).order('created_at', { ascending: false }).limit(10).then(function(r) {
      if (r.data) setHistory(r.data);
    });
  }

  useEffect(function() { load(); }, []);

  function sendBooking() {
    if (!selected) { Alert.alert(t('common_error'), t('host_book_cleaning_err_no_prop')); return; }
    if (!date) { Alert.alert(t('common_error'), t('host_book_cleaning_err_no_date')); return; }
    if (!selected.cleaner_email) { Alert.alert(t('common_error'), t('host_book_cleaning_err_no_cleaner_email')); return; }

    setLoading(true);

    var booking = {
      property_id: selected.id,
      host_id: props.session.user.id,
      cleaning_date: date,
      cleaning_time: time,
      guest_name: guestName || t('host_book_cleaning_fallback_guest'),
      notes: notes,
      status: 'pending',
      cleaner_email: selected.cleaner_email,
    };

    supabase.from('bookings').insert(booking).then(function(r) {
      setLoading(false);

      if (r.error) {
        sendEmail();
        return;
      }

      sendEmail();
      setDate('');
      setNotes('');
      setGuestName('');
      load();
    });
  }

  function sendEmail() {
    var p = selected;
    var notesBlock = notes ? t('host_book_cleaning_email_notes_block', { notes: notes }) : '';
    var subject = encodeURIComponent(t('host_book_cleaning_email_subject', { property: p.name, date: date }));
    var body = encodeURIComponent(t('host_book_cleaning_email_body', {
      name: p.cleaner_name || '',
      property: p.name,
      address: p.address || t('host_book_cleaning_fallback_address'),
      date: date,
      time: time,
      guest: guestName || t('host_book_cleaning_fallback_guest'),
      accessCode: p.access_code || t('host_book_cleaning_fallback_access_code'),
      accessInfo: p.access_info || t('host_book_cleaning_fallback_access_info'),
      notesBlock: notesBlock,
    }));
    var mailto = 'mailto:' + p.cleaner_email + '?subject=' + subject + '&body=' + body;
    Linking.openURL(mailto);
    Alert.alert(t('host_book_cleaning_success_title'), t('host_book_cleaning_success_msg', { name: p.cleaner_name, email: p.cleaner_email }));
  }

  function getStatusLabel(status) {
    if (status === 'completed') return t('host_book_cleaning_status_completed');
    if (status === 'pending') return t('host_book_cleaning_status_pending');
    if (!status) return t('host_book_cleaning_status_sent');
    return t('host_book_cleaning_status_custom', { status: status });
  }

  var today = new Date().toISOString().split('T')[0];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hdr}><Text style={s.hdrT}>{t('host_book_cleaning_header')}</Text></View>
      <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">

        <Text style={s.sec}>{t('host_book_cleaning_property_label')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
          {properties.map(function(p) {
            var active = selected && selected.id === p.id;
            return (
              <TouchableOpacity key={p.id} style={[s.propPill, active && s.propPillActive]} onPress={function() { setSelected(p); }} activeOpacity={0.7}>
                <Text style={[s.propPillT, active && { color: '#fff' }]}>{p.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {selected && selected.cleaner_email ? (
          <View style={s.cleanerCard}>
            <View style={s.cleanerAv}><Text style={{ fontSize: 20 }}>🧹</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.cleanerName}>{selected.cleaner_name || t('host_book_cleaning_cleaner_fallback_name')}</Text>
              <Text style={s.cleanerEmail}>{selected.cleaner_email}</Text>
            </View>
            <View style={s.statusPill}><Text style={s.statusT}>{t('host_book_cleaning_status_configured')}</Text></View>
          </View>
        ) : (
          <View style={s.warningCard}><Text style={{ fontSize: 16 }}>⚠️</Text><Text style={s.warningT}>{t('host_book_cleaning_warning_no_cleaner')}</Text></View>
        )}

        <Text style={s.sec}>{t('host_book_cleaning_details_label')}</Text>
        <View style={s.formCard}>
          <Text style={s.label}>{t('host_book_cleaning_label_date')}</Text>
          <TextInput style={s.input} placeholder="2026-04-15" placeholderTextColor={T.muted} value={date} onChangeText={setDate} keyboardType="default" />

          <Text style={s.label}>{t('host_book_cleaning_label_time')}</Text>
          <View style={s.timeRow}>
            {['10:00', '11:00', '12:00', '14:00'].map(function(tm) {
              return (
                <TouchableOpacity key={tm} style={[s.timePill, time === tm && s.timePillActive]} onPress={function() { setTime(tm); }}>
                  <Text style={[s.timePillT, time === tm && { color: '#fff' }]}>{tm}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={s.label}>{t('host_book_cleaning_label_guest')}</Text>
          <TextInput style={s.input} placeholder={t('host_book_cleaning_ph_guest')} placeholderTextColor={T.muted} value={guestName} onChangeText={setGuestName} />

          <Text style={s.label}>{t('host_book_cleaning_label_notes')}</Text>
          <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} placeholder={t('host_book_cleaning_ph_notes')} placeholderTextColor={T.muted} value={notes} onChangeText={setNotes} multiline />

          <TouchableOpacity style={s.bookBtn} onPress={sendBooking} disabled={loading || !selected} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.bookBtnT}>{t('host_book_cleaning_submit_btn')}</Text>}
          </TouchableOpacity>
        </View>

        {history.length > 0 && (
          <View>
            <Text style={s.sec}>{t('host_book_cleaning_history_label')}</Text>
            {history.map(function(b, i) {
              return (
                <View key={i} style={s.historyCard}>
                  <View style={s.historyH}>
                    <View style={[s.historyDot, { backgroundColor: b.status === 'completed' ? T.success : b.status === 'pending' ? '#FF9500' : T.accent }]} />
                    <Text style={s.historyName}>{b.properties ? b.properties.name : t('host_book_cleaning_fallback_property')}</Text>
                    <Text style={s.historyStatus}>{getStatusLabel(b.status)}</Text>
                  </View>
                  <Text style={s.historyMeta}>{b.cleaning_date} à {b.cleaning_time || '—'} · {b.guest_name || ''}</Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.dark },
  hdr: { paddingHorizontal: 18, paddingVertical: 14, backgroundColor: T.dark },
  hdrT: { fontSize: 18, fontWeight: '600', color: '#fff' },
  sec: { fontSize: 16, fontWeight: '600', color: T.text, marginTop: 16, marginBottom: 10 },
  propPill: { backgroundColor: T.card, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: T.border },
  propPillActive: { backgroundColor: T.accent, borderColor: T.accent },
  propPillT: { fontSize: 13, fontWeight: '600', color: T.text },
  cleanerCard: { backgroundColor: T.card, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: T.border, marginBottom: 8 },
  cleanerAv: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E8F4FB', alignItems: 'center', justifyContent: 'center' },
  cleanerName: { fontSize: 14, fontWeight: '600', color: T.text },
  cleanerEmail: { fontSize: 12, color: T.muted, marginTop: 1 },
  statusPill: { backgroundColor: '#E8F9EE', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  statusT: { fontSize: 10, color: T.success, fontWeight: '700' },
  warningCard: { backgroundColor: '#FFF8E1', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, borderWidth: 1, borderColor: '#FFE082' },
  warningT: { fontSize: 12, color: '#F57F17', flex: 1, lineHeight: 18 },
  formCard: { backgroundColor: T.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: T.border },
  label: { fontSize: 11, fontWeight: '700', color: T.muted, marginBottom: 6, marginTop: 14, letterSpacing: 0.5 },
  input: { backgroundColor: T.bg, borderWidth: 1, borderColor: T.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: T.text },
  timeRow: { flexDirection: 'row', gap: 8 },
  timePill: { flex: 1, backgroundColor: T.bg, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  timePillActive: { backgroundColor: T.accent, borderColor: T.accent },
  timePillT: { fontSize: 13, fontWeight: '600', color: T.text },
  bookBtn: { backgroundColor: T.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  bookBtnT: { color: '#fff', fontSize: 15, fontWeight: '700' },
  historyCard: { backgroundColor: T.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: T.border },
  historyH: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  historyDot: { width: 8, height: 8, borderRadius: 4 },
  historyName: { fontSize: 14, fontWeight: '600', color: T.text, flex: 1 },
  historyStatus: { fontSize: 11, color: T.muted, fontWeight: '500' },
  historyMeta: { fontSize: 12, color: T.muted, marginLeft: 16 },
});