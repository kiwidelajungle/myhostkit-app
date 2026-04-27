import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, StyleSheet, Alert, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../config/supabase';
import { generateInvoice } from '../../utils/invoiceGenerator';
import T from '../../theme';
import { track } from '../../utils/monitoring';
import { analyzeReport } from '../../utils/photoAnalysis';
import RatingModal from '../../components/RatingModal';
import { t, useLang, getLang } from '../../i18n';

var ROOMS = [
  { name: 'Entree', nameKey: 'cleaner_report_room_entrance', emoji: '🚪' },
  { name: 'Salon', nameKey: 'cleaner_report_room_living', emoji: '🛋️' },
  { name: 'Cuisine', nameKey: 'cleaner_report_room_kitchen', emoji: '🍳' },
  { name: 'Chambre', nameKey: 'cleaner_report_room_bedroom', emoji: '🛏️' },
  { name: 'Salle de bain', nameKey: 'cleaner_report_room_bathroom', emoji: '🚿' },
  { name: 'Autre', nameKey: 'cleaner_report_room_other', emoji: '📦' }
];

export default function CleanerReport(props) {
  useLang();
  var _p = useState([]); var properties = _p[0]; var setProperties = _p[1];
  var _sel = useState(null); var selected = _sel[0]; var setSelected = _sel[1];
  var _photos = useState({}); var photos = _photos[0]; var setPhotos = _photos[1];
  var _showRating = useState(false); var showRating = _showRating[0]; var setShowRating = _showRating[1];
  var _ratingHostId = useState(null); var ratingHostId = _ratingHostId[0]; var setRatingHostId = _ratingHostId[1];
  var _ratingBookingId = useState(null); var ratingBookingId = _ratingBookingId[0]; var setRatingBookingId = _ratingBookingId[1];
  var _note = useState(''); var note = _note[0]; var setNote = _note[1];
  var _loading = useState(false); var loading = _loading[0]; var setLoading = _loading[1];
  var _analyzing = useState(false); var analyzing = _analyzing[0]; var setAnalyzing = _analyzing[1];
  var _analysisResult = useState(null); var analysisResult = _analysisResult[0]; var setAnalysisResult = _analysisResult[1];
  var _bookings = useState([]); var bookings = _bookings[0]; var setBookings = _bookings[1];
  var _selBooking = useState(null); var selBooking = _selBooking[0]; var setSelBooking = _selBooking[1];
  var _cleanerProfile = useState({}); var cleanerProfile = _cleanerProfile[0]; var setCleanerProfile = _cleanerProfile[1];

  useEffect(function() {
    supabase.from('cleaners').select('*').eq('user_id', props.session.user.id).single().then(function(cr) {
      if (cr.data) {
        setCleanerProfile(cr.data);
        var cid = cr.data.id;
        supabase.from('cleaning_bookings').select('*, properties(name, address, city, user_id), cleaners(company_name, contact_name, price_per_cleaning, email, siret, address)')
          .eq('cleaner_id', cid).in('status', ['confirmed','completed','report_sent']).eq('report_sent', false)
          .order('date', { ascending: false }).then(function(br) {
            if (br.data && br.data.length > 0) {
              setBookings(br.data);
              var propMap = {};
              br.data.forEach(function(b) { if (b.properties) propMap[b.properties.id || b.property_id] = b.properties; });
              setProperties(br.data.map(function(b) { return b.properties; }).filter(function(p) { return p; }));
              setSelBooking(br.data[0]);
              setSelected(br.data[0].properties);
            } else {
              supabase.from('cleaning_bookings').select('*, properties(*), cleaners(*)').eq('cleaner_id', cid).then(function(r) {
                var propMap = {};
                if (r.data) r.data.forEach(function(b) { if (b.properties) propMap[b.properties.id || b.property_id] = b.properties; });
                var all = Object.values(propMap);
                setProperties(all);
                if (all.length > 0) setSelected(all[0]);
              });
            }
          });
      }
    });
  }, []);

  function convertPhotosToBase64(photosByRoom) {
    var results = [];
    var promises = [];
    for (var room in photosByRoom) {
      photosByRoom[room].forEach(function(uri, idx) {
        promises.push(
          new Promise(function(resolve) {
            var xhr = new XMLHttpRequest();
            xhr.onload = function() {
              var reader = new FileReader();
              reader.onloadend = function() {
                var base64 = reader.result.split(',')[1];
                results.push({ room: room, filename: room.replace(/\s/g,'_') + '_' + (idx+1) + '.jpg', base64: base64 });
                resolve();
              };
              reader.readAsDataURL(xhr.response);
            };
            xhr.onerror = function() { resolve(); };
            xhr.responseType = 'blob';
            xhr.open('GET', uri, true);
            xhr.send(null);
          })
        );
      });
    }
    return Promise.all(promises).then(function() { return results; });
  }

  function sendReportEmail(property, photoUrls, reportNote, session, photoAtt) {
    var roomsSummary = '';
    var totalPhotos = 0;
    for (var k in photos) {
      totalPhotos += photos[k].length;
      roomsSummary += t('cleaner_report_email_room_summary', { room: k, count: photos[k].length });
    }
    var notesBlock = reportNote ? t('cleaner_report_email_notes_block', { notes: reportNote }) : '';
    var locale = getLang() === 'en' ? 'en-US' : 'fr-FR';
    var emailBody = t('cleaner_report_email_body', {
      property: property.name,
      email: session.user.email,
      date: new Date().toLocaleDateString(locale),
      total: totalPhotos,
      roomsSummary: roomsSummary,
      notesBlock: notesBlock,
    });

    var invoiceData = null;
    var cleanerInfo = cleanerProfile || {};
    var bookingCleaner = (selBooking && (selBooking.cleaners || selBooking.cleaner)) || {};
    var rate = bookingCleaner.price_per_cleaning || cleanerInfo.price_per_cleaning || 0;
    var invoiceHours = 1;
    if (selBooking && selBooking.time) {
      var parts = selBooking.time.replace('→ ','-').split('-').map(function(s){return s.trim();});
      if (parts.length === 2) {
        var st = parts[0].split(':'), en = parts[1].split(':');
        if (st.length >= 2 && en.length >= 2) { invoiceHours = ((parseInt(en[0])*60+parseInt(en[1]))-(parseInt(st[0])*60+parseInt(st[1])))/60; if(invoiceHours<=0)invoiceHours=1; }
      }
    }
    var subtotal = Math.round(rate * invoiceHours * 100) / 100;
    if (selBooking && selBooking.payment_amount && selBooking.payment_amount > 0) {
      subtotal = parseFloat(selBooking.payment_amount);
    }
    var commRate = 15;
    var commission = Math.round(subtotal * commRate) / 100;
    invoiceData = {
      number: 'MHK-' + Date.now().toString(36).toUpperCase(),
      date: new Date().toLocaleDateString(locale),
      service_date: (selBooking ? selBooking.date : null) || new Date().toLocaleDateString(locale),
      cleaner_name: cleanerInfo.company_name || bookingCleaner.company_name || cleanerInfo.contact_name || bookingCleaner.contact_name || session.user.email,
      cleaner_email: cleanerInfo.email || bookingCleaner.email || session.user.email,
      cleaner_address: cleanerInfo.address || bookingCleaner.address || '',
      cleaner_siret: cleanerInfo.siret || bookingCleaner.siret || '',
      cleaner_phone: cleanerInfo.phone || '',
      cleaner_legal_status: cleanerInfo.legal_status || '',
      host_name: '',
      host_email: '',
      property_name: property.name || '',
      property_address: (property.address || '') + (property.city ? ', ' + property.city : ''),
      hours: invoiceHours,
      rate: rate,
      subtotal: subtotal,
      commission_rate: commRate,
      commission: commission,
      total: Math.round((subtotal - commission) * 100) / 100,
    };
    var emailSubject = t('cleaner_report_email_subject', { property: property.name });
    var sendViaEdge = function(to, isHost) {
      if (isHost) { invoiceData.host_email = to; }
      var payload = { to: to, subject: emailSubject, body: emailBody, photo_attachments: photoAtt || [], invoice: invoiceData };
      return fetch('https://illovwqvszjuasftwkxh.supabase.co/functions/v1/send-email', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload),
      }).catch(function(e){console.log('Email error:', e);});
    };

    sendViaEdge('myhostkit.contact@gmail.com', false);

    if (property.user_id) {
      supabase.from('profiles').select('email,first_name,last_name,subscription_plan').eq('id', property.user_id).single().then(function(r) {
        if (r.data && r.data.email) {
          if (invoiceData) {
            invoiceData.host_name = ((r.data.first_name||'') + ' ' + (r.data.last_name||'')).trim() || r.data.email;
            var plan = r.data.subscription_plan || 'free';
            if (plan === 'pro') invoiceData.commission_rate = 5;
            else if (plan === 'starter') invoiceData.commission_rate = 10;
            else invoiceData.commission_rate = 15;
            var sub = invoiceData.subtotal || 0;
            invoiceData.commission = Math.round(sub * invoiceData.commission_rate) / 100;
            invoiceData.total = Math.round((sub - invoiceData.commission) * 100) / 100;
          }
          sendViaEdge(r.data.email, true);
        }
      });
    }
  }

  function pickPhoto(roomName) {
    Alert.alert(t('cleaner_report_pick_title'), t('cleaner_report_pick_msg'), [
      { text: t('cleaner_report_pick_cancel'), style: 'cancel' },
      { text: t('cleaner_report_pick_camera'), onPress: function() {
        ImagePicker.requestCameraPermissionsAsync().then(function(perm) {
          if (!perm.granted) { Alert.alert(t('cleaner_report_permission_denied_title'), t('cleaner_report_permission_denied_msg')); return; }
          ImagePicker.launchCameraAsync({ quality: 0.7 }).then(function(result) {
            if (!result.canceled && result.assets && result.assets[0]) {
              var next = {}; for (var k in photos) next[k] = photos[k] ? photos[k].slice() : [];
              if (!next[roomName]) next[roomName] = [];
              next[roomName].push(result.assets[0].uri);
              setPhotos(next);
            }
          });
        });
      }},
      { text: t('cleaner_report_pick_gallery'), onPress: function() {
        ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: true, selectionLimit: 5 }).then(function(result) {
          if (!result.canceled && result.assets) {
            var next = {}; for (var k in photos) next[k] = photos[k] ? photos[k].slice() : [];
            if (!next[roomName]) next[roomName] = [];
            result.assets.forEach(function(a) { next[roomName].push(a.uri); });
            setPhotos(next);
          }
        });
      }}
    ]);
  }

  function removePhoto(roomName, index) {
    var next = {}; for (var k in photos) next[k] = photos[k].slice();
    next[roomName].splice(index, 1);
    if (next[roomName].length === 0) delete next[roomName];
    setPhotos(next);
  }

  function getTotalPhotos() { var c = 0; for (var k in photos) c += photos[k].length; return c; }

  function sendReport() {
    if (!selected) { Alert.alert(t('common_error'), t('cleaner_report_err_no_prop')); return; }
    if (getTotalPhotos() === 0) { Alert.alert(t('common_error'), t('cleaner_report_err_no_photos')); return; }
    setLoading(true);

    var bookingId = selBooking ? selBooking.id : null;

    convertPhotosToBase64(photos).then(function(photoAttachments) {
      var photoUrls = {};
      if (bookingId) {
        supabase.from('cleaning_bookings').update({
          report_sent: true,
          report_sent_at: new Date().toISOString(),
          status: 'report_sent',
          auto_validate_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
          report_notes: note || t('cleaner_report_default_note'),
          report_photos: photoUrls,
        }).eq('id', bookingId).then(function() {
          sendReportEmail(selected, photoUrls, note, props.session, photoAttachments);
          generateInvoice(bookingId, props.session).then(function(inv) {
            setLoading(false);
            if (inv) {
              Alert.alert(
                t('cleaner_report_sent_with_invoice_title'),
                t('cleaner_report_sent_with_invoice_msg', { count: getTotalPhotos(), invoiceNumber: inv.invoiceNumber, amount: inv.amount }),
                [
                  { text: t('cleaner_report_btn_new'), onPress: function() { setPhotos({}); setNote(''); } },
                  { text: t('cleaner_report_btn_ok') }
                ]
              );
            } else {
              track('cleaning_report_sent_basic', { photos_count: getTotalPhotos() });
        Alert.alert(t('cleaner_report_sent_title'), t('cleaner_report_sent_msg', { count: getTotalPhotos() }));
              setPhotos({}); setNote('');
              if (selBooking && selBooking.host_id) { setRatingHostId(selBooking.host_id); setRatingBookingId(selBooking.id); setShowRating(true); }
            }
          });
        });
      } else {
        setLoading(false);
        sendReportEmail(selected, photoUrls, note, props.session, photoAttachments);
        track('cleaning_report_sent_email', { photos_count: getTotalPhotos() });
        Alert.alert(t('cleaner_report_sent_title'), t('cleaner_report_sent_email_msg', { count: getTotalPhotos() }));
        setPhotos({}); setNote('');
      }
    }).catch(function(e) {
      setLoading(false);
      Alert.alert(t('cleaner_report_err_upload_title'), e.message || t('cleaner_report_err_upload_msg'));
    });
    return;
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hdr}><Text style={s.hdrT}>{t('cleaner_report_header')}</Text><View style={s.photoBadge}><Text style={s.photoBadgeT}>{t('cleaner_report_photo_badge', { count: getTotalPhotos() })}</Text></View></View>
      <ScrollView style={{ flex: 1, backgroundColor: T.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {bookings.length > 0 && (
          <View>
            <Text style={s.sec}>{t('cleaner_report_booking_section')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
              {bookings.map(function(b, i) {
                var active = selBooking && selBooking.id === b.id;
                var propName = b.properties ? b.properties.name : t('cleaner_report_booking_fallback_property');
                return <TouchableOpacity key={i} style={[s.propPill, active && s.propPillActive]} onPress={function() { setSelBooking(b); setSelected(b.properties); setPhotos({}); }}>
                  <Text style={[s.propPillT, active && { color: '#fff' }]}>{propName} · {b.date}</Text>
                </TouchableOpacity>;
              })}
            </ScrollView>
          </View>
        )}

        {selected && <View style={s.propBanner}><Text style={{ fontSize: 20 }}>🏠</Text><View style={{ flex: 1 }}><Text style={s.propBannerN}>{selected.name}</Text><Text style={s.propBannerA}>{selected.address || selected.city || ''}</Text></View></View>}

        <Text style={s.sec}>{t('cleaner_report_photos_section')}</Text>
        {ROOMS.map(function(room) {
          var rp = photos[room.name] || [];
          return (
            <View key={room.name} style={s.roomCard}>
              <View style={s.roomH}><Text style={{ fontSize: 20 }}>{room.emoji}</Text><Text style={s.roomName}>{t(room.nameKey)}</Text>{rp.length > 0 && <View style={s.roomCheck}><Text style={s.roomCheckT}>{t('cleaner_report_room_count_badge', { count: rp.length })}</Text></View>}</View>
              {rp.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 10 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 14 }}>
                {rp.map(function(uri, idx) { return <View key={idx} style={s.photoWrap}><Image source={{ uri: uri }} style={s.photo} /><TouchableOpacity style={s.photoRm} onPress={function() { removePhoto(room.name, idx); }}><Text style={s.photoRmT}>✕</Text></TouchableOpacity></View>; })}
              </ScrollView>}
              <TouchableOpacity style={s.addBtn} onPress={function() { pickPhoto(room.name); }}><Text style={s.addBtnT}>{t('cleaner_report_add_btn')}</Text></TouchableOpacity>
            </View>
          );
        })}

        <Text style={s.sec}>{t('cleaner_report_notes_section')}</Text>
        <TextInput style={s.noteInput} placeholder={t('cleaner_report_notes_placeholder')} placeholderTextColor={T.muted} value={note} onChangeText={setNote} multiline />

        <View style={s.infoBox}>
          <Text style={s.infoT}>{t('cleaner_report_info_title')}</Text>
          <Text style={s.infoS}>{t('cleaner_report_info_step_1')}{'\n'}{t('cleaner_report_info_step_2')}{'\n'}{t('cleaner_report_info_step_3')}{'\n'}{t('cleaner_report_info_step_4')}</Text>
        </View>

        {getTotalPhotos() > 0 && !analysisResult && (
          <TouchableOpacity style={{backgroundColor:'#E8F4FB',borderRadius:14,paddingVertical:14,alignItems:'center',marginTop:14,borderWidth:1.5,borderColor:'rgba(28,95,138,0.3)'}} onPress={function(){
            setAnalyzing(true);analyzeReport(photos).then(function(res){setAnalyzing(false);if(res && res.averageScore)setAnalysisResult(res);else Alert.alert(t('cleaner_report_ai_plan_required_title'),t('cleaner_report_ai_plan_required_msg'));});
          }} disabled={analyzing}>
            {analyzing ? <ActivityIndicator color={T.blue} /> : <Text style={{fontSize:14,fontWeight:'600',color:T.blue}}>{t('cleaner_report_ai_analyze_btn')}</Text>}
          </TouchableOpacity>
        )}
        {analysisResult && (
          <View style={{backgroundColor:analysisResult.averageScore>=7?'#E8F9EE':analysisResult.averageScore>=5?'#FFF8F0':'#FFF5F5',borderRadius:14,padding:14,marginTop:10,borderWidth:1,borderColor:analysisResult.averageScore>=7?'rgba(52,199,89,0.3)':analysisResult.averageScore>=5?'rgba(255,149,0,0.3)':'rgba(255,59,48,0.3)'}}>
            <Text style={{fontSize:15,fontWeight:'700',color:analysisResult.averageScore>=7?'#34C759':analysisResult.averageScore>=5?'#FF9500':'#FF3B30',marginBottom:8}}>{t('cleaner_report_ai_score_label', { score: analysisResult.averageScore || '?' })}</Text>
            {Object.keys(analysisResult.rooms||{}).map(function(room){var r=analysisResult.rooms[room];var icon=r.status==='ok'?'✅':r.status==='warning'?'⚠️':'❌';return <View key={room} style={{marginBottom:6}}><Text style={{fontSize:13,fontWeight:'600',color:'#141414'}}>{t('cleaner_report_ai_room_score', { room: room, score: r.score||'?', icon: icon })}</Text>{r.details&&<Text style={{fontSize:11,color:'#6B6B6B',marginTop:2}}>{r.details}</Text>}{r.issues&&r.issues.length>0&&r.issues.map(function(issue,j){return <Text key={j} style={{fontSize:11,color:'#FF3B30',marginTop:1}}>⬢ {issue}</Text>;})}</View>;})}
          </View>
        )}

        <TouchableOpacity style={[s.sendBtn, getTotalPhotos() === 0 && { opacity: 0.4 }]} onPress={sendReport} disabled={loading || getTotalPhotos() === 0}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.sendBtnT}>{t('cleaner_report_send_btn')}</Text>}
        </TouchableOpacity>
        <View style={{ height: 30 }} />
      </ScrollView>
      <RatingModal visible={showRating} title={t('cleaner_report_rating_title')} subtitle={t('cleaner_report_rating_subtitle')} onClose={function(){setShowRating(false);}} onSubmit={function(rating, comment) {
        if (ratingHostId) {
          supabase.from('reviews').insert({ reviewer_id: props.session.user.id, reviewed_id: ratingHostId, reviewed_type: 'host', booking_id: ratingBookingId, rating: rating, comment: comment }).then(function(r) {
            if (r.error && !r.error.message.includes('unique')) Alert.alert(t('common_error'), r.error.message);
            else Alert.alert(t('cleaner_report_rating_saved_title'), t('cleaner_report_rating_saved_msg'));
          });
        }
        setShowRating(false);
      }} />
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  safe:{flex:1,backgroundColor:T.dark},hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18,paddingVertical:14,backgroundColor:T.dark},hdrT:{fontSize:18,fontWeight:'600',color:'#fff'},
  photoBadge:{backgroundColor:'rgba(28,95,138,0.15)',paddingHorizontal:12,paddingVertical:4,borderRadius:12},photoBadgeT:{fontSize:13,fontWeight:'700',color:T.blue},
  sec:{fontSize:15,fontWeight:'600',color:T.text,marginTop:14,marginBottom:8},
  propPill:{backgroundColor:T.card,paddingHorizontal:16,paddingVertical:10,borderRadius:12,borderWidth:1,borderColor:T.border},propPillActive:{backgroundColor:T.blue,borderColor:T.blue},propPillT:{fontSize:13,fontWeight:'600',color:T.text},
  propBanner:{backgroundColor:T.card,borderRadius:14,padding:14,flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,borderColor:T.border,marginBottom:8},propBannerN:{fontSize:15,fontWeight:'600',color:T.text},propBannerA:{fontSize:12,color:T.muted},
  roomCard:{backgroundColor:T.card,borderRadius:16,marginBottom:10,borderWidth:1,borderColor:T.border,overflow:'hidden'},roomH:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:T.border},roomName:{fontSize:15,fontWeight:'600',color:T.text,flex:1},
  roomCheck:{backgroundColor:'#E8F9EE',paddingHorizontal:10,paddingVertical:3,borderRadius:10},roomCheckT:{fontSize:11,color:T.success,fontWeight:'700'},
  photoWrap:{position:'relative'},photo:{width:90,height:90,borderRadius:10},photoRm:{position:'absolute',top:-4,right:-4,width:22,height:22,borderRadius:11,backgroundColor:T.error,alignItems:'center',justifyContent:'center'},photoRmT:{color:'#fff',fontSize:12,fontWeight:'700'},
  addBtn:{paddingVertical:14,alignItems:'center',borderTopWidth:1,borderTopColor:T.border},addBtnT:{fontSize:13,color:T.blue,fontWeight:'600'},
  noteInput:{backgroundColor:T.card,borderWidth:1,borderColor:T.border,borderRadius:14,paddingHorizontal:14,paddingVertical:12,fontSize:14,color:T.text,minHeight:70,textAlignVertical:'top'},
  infoBox:{backgroundColor:'#E8F4FB',borderRadius:14,padding:14,marginTop:14,borderWidth:1,borderColor:'rgba(28,95,138,0.15)'},infoT:{fontSize:13,fontWeight:'700',color:T.blue,marginBottom:6},infoS:{fontSize:12,color:T.blue,lineHeight:20},
  sendBtn:{backgroundColor:T.blue,borderRadius:14,paddingVertical:16,alignItems:'center',marginTop:16},sendBtnT:{color:'#fff',fontSize:15,fontWeight:'700'},
});