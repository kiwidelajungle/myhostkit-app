import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setLang, getLang, useLang, t } from '../i18n';

var { width } = Dimensions.get('window');

function getSlides(role) {
  if (role === 'host') return [
    { icon: '🏠', titleKey:'onb_host_s1_title', subtitleKey:'onb_host_s1_sub', descKey:'onb_host_s1_desc', color: '#1C5F8A', bg: '#E8F4FB' },
    { icon: '🧹', titleKey:'onb_host_s2_title', subtitleKey:'onb_host_s2_sub', descKey:'onb_host_s2_desc', color: '#C8965A', bg: '#FFF4E6' },
    { icon: '📸', titleKey:'onb_host_s3_title', subtitleKey:'onb_host_s3_sub', descKey:'onb_host_s3_desc', color: '#34C759', bg: '#E8FBE8' },
    { icon: '📦', titleKey:'onb_host_s4_title', subtitleKey:'onb_host_s4_sub', descKey:'onb_host_s4_desc', color: '#1C5F8A', bg: '#E8F4FB' },
    { icon: '💳', titleKey:'onb_host_s5_title', subtitleKey:'onb_host_s5_sub', descKey:'onb_host_s5_desc', color: '#9B59B6', bg: '#F3E8FB' },
    { icon: '🎁', titleKey:'onb_host_s6_title', subtitleKey:'onb_host_s6_sub', descKey:'onb_host_s6_desc', color: '#C8965A', bg: '#FFF4E6' },
  ];
  if (role === 'cleaner') return [
    { icon: '🧹', titleKey:'onb_cle_s1_title', subtitleKey:'onb_cle_s1_sub', descKey:'onb_cle_s1_desc', color: '#1C5F8A', bg: '#E8F4FB' },
    { icon: '📅', titleKey:'onb_cle_s2_title', subtitleKey:'onb_cle_s2_sub', descKey:'onb_cle_s2_desc', color: '#C8965A', bg: '#FFF4E6' },
    { icon: '⭐', titleKey:'onb_cle_s3_title', subtitleKey:'onb_cle_s3_sub', descKey:'onb_cle_s3_desc', color: '#9B59B6', bg: '#F3E8FB' },
    { icon: '📸', titleKey:'onb_cle_s4_title', subtitleKey:'onb_cle_s4_sub', descKey:'onb_cle_s4_desc', color: '#34C759', bg: '#E8FBE8' },
    { icon: '💰', titleKey:'onb_cle_s5_title', subtitleKey:'onb_cle_s5_sub', descKey:'onb_cle_s5_desc', color: '#1C5F8A', bg: '#E8F4FB' },
    { icon: '🎁', titleKey:'onb_cle_s6_title', subtitleKey:'onb_cle_s6_sub', descKey:'onb_cle_s6_desc', color: '#C8965A', bg: '#FFF4E6' },
  ];
  return [
    { icon: '✈️', titleKey:'onb_gst_s1_title', subtitleKey:'onb_gst_s1_sub', descKey:'onb_gst_s1_desc', color: '#1C5F8A', bg: '#E8F4FB' },
    { icon: '🗺️', titleKey:'onb_gst_s2_title', subtitleKey:'onb_gst_s2_sub', descKey:'onb_gst_s2_desc', color: '#34C759', bg: '#E8FBE8' },
    { icon: '📶', titleKey:'onb_gst_s3_title', subtitleKey:'onb_gst_s3_sub', descKey:'onb_gst_s3_desc', color: '#C8965A', bg: '#FFF4E6' },
    { icon: '💬', titleKey:'onb_gst_s4_title', subtitleKey:'onb_gst_s4_sub', descKey:'onb_gst_s4_desc', color: '#9B59B6', bg: '#F3E8FB' },
  ];
}

export default function OnboardingScreen(props) {
  useLang();
  var role = props.role || 'host';
  var slides = getSlides(role);
  var _idx = useState(0); var idx = _idx[0]; var setIdx = _idx[1];
  var fadeAnim = useRef(new Animated.Value(1)).current;

  function next() {
    if (idx < slides.length - 1) {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(function() {
        setIdx(idx + 1);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    } else {
      props.onDone();
    }
  }

  var slide = slides[idx];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: slide.bg }]} edges={['top', 'bottom']}>
      <View style={[s.topBar, {flexDirection:'row',justifyContent:'space-between',alignItems:'center'}]}>
        <View style={{flexDirection:'row',gap:6}}>
          <TouchableOpacity onPress={function(){setLang('fr');}} style={{paddingHorizontal:10,paddingVertical:6,borderRadius:8,backgroundColor:getLang()==='fr'?slide.color:'transparent',borderWidth:1,borderColor:slide.color}}>
            <Text style={{fontSize:12,fontWeight:'700',color:getLang()==='fr'?'#fff':slide.color}}>FR</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={function(){setLang('en');}} style={{paddingHorizontal:10,paddingVertical:6,borderRadius:8,backgroundColor:getLang()==='en'?slide.color:'transparent',borderWidth:1,borderColor:slide.color}}>
            <Text style={{fontSize:12,fontWeight:'700',color:getLang()==='en'?'#fff':slide.color}}>EN</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={function() { props.onDone(); }}>
          <Text style={[s.skipT, { color: slide.color }]}>{t('onb_skip')}</Text>
        </TouchableOpacity>
      </View>
      <Animated.View style={[s.slideWrap, { opacity: fadeAnim }]}>
        <View style={[s.iconCircle, { backgroundColor: slide.color + '15' }]}>
          <Text style={s.icon}>{slide.icon}</Text>
        </View>
        <Text style={[s.title, { color: slide.color }]}>{t(slide.titleKey)}</Text>
        <Text style={s.subtitle}>{t(slide.subtitleKey)}</Text>
        <View style={s.descBox}>
          <Text style={s.desc}>{t(slide.descKey)}</Text>
        </View>
      </Animated.View>
      <View style={s.dotsRow}>
        {slides.map(function(_, i) {
          var active = i === idx;
          return (
            <View key={i} style={[s.dot, active && { backgroundColor: slide.color, width: 28 }]} />
          );
        })}
      </View>
      <View style={s.bottomBar}>
        <TouchableOpacity style={[s.nextBtn, { backgroundColor: slide.color }]} onPress={next}>
          <Text style={s.nextBtnT}>{idx === slides.length - 1 ? t('onb_start') : t('onb_next')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  skipT: { fontSize: 14, fontWeight: '600' },
  slideWrap: { flex: 1, paddingHorizontal: 30, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  icon: { fontSize: 60 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 20, fontWeight: '500' },
  descBox: { paddingHorizontal: 10 },
  desc: { fontSize: 14, color: '#444', textAlign: 'center', lineHeight: 22 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 30 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.15)' },
  bottomBar: { paddingHorizontal: 20, paddingBottom: 10 },
  nextBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  nextBtnT: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
});
