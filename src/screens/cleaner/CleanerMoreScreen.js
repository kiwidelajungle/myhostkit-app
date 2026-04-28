import React, { useState } from 'react';
import { t, useLang } from '../../i18n';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';

import CleanerCalendar from './CleanerCalendar';
import CleanerReport from './CleanerReport';
import CleanerTeam from './CleanerTeam';

const C = {
  navy: '#0a1628',
  paper: '#fbf8f3',
  paperWarm: '#f4ede0',
  gold: '#C8965A',
  text: '#1c1c1e',
  textSoft: '#525252',
  border: '#e5e7eb',
  white: '#fff',
};

export default function CleanerMoreScreen(props) {
  useLang();
  const [activeModal, setActiveModal] = useState(null);

  const tools = [
    {
      key: 'calendar',
      icon: 'calendar-outline',
      title: t('cmore_avail_title'),
      subtitle: t('cmore_avail_sub'),
      color: C.gold,
    },
    {
      key: 'report',
      icon: 'camera-outline',
      title: t('cmore_reports_title'),
      subtitle: t('cmore_reports_sub'),
      color: C.gold,
    },
    {
      key: 'team',
      icon: 'people-outline',
      title: t('cmore_team_title'),
      subtitle: t('cmore_team_sub'),
      color: C.gold,
    },
  ];

  const renderModalContent = () => {
    switch (activeModal) {
      case 'calendar':
        return <CleanerCalendar session={props.session} supabase={supabase} />;
      case 'report':
        return <CleanerReport session={props.session} />;
      case 'team':
        return <CleanerTeam session={props.session} />;
      default:
        return null;
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{t('more_page_title')}</Text>
        <Text style={s.subtitle}>{t('more_page_sub_cleaner')}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {tools.map((tool) => (
          <TouchableOpacity
            key={tool.key}
            style={s.card}
            onPress={() => setActiveModal(tool.key)}
            activeOpacity={0.7}
          >
            <View style={[s.iconBox, { backgroundColor: tool.color + '20' }]}>
              <Ionicons name={tool.icon} size={24} color={tool.color} />
            </View>

            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.cardTitle}>{tool.title}</Text>
              <Text style={s.cardSubtitle}>{tool.subtitle}</Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={C.textSoft} />
          </TouchableOpacity>
        ))}

        <View style={{ height: 60 }} />
      </ScrollView>

      <Modal
        visible={activeModal !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setActiveModal(null)}
      >
        <SafeAreaView style={s.modalContainer}>
          <View style={s.modalHeader}>
            <TouchableOpacity
              style={s.closeButton}
              onPress={() => setActiveModal(null)}
            >
              <Ionicons name="close" size={28} color={C.navy} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            {renderModalContent()}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.paper },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', color: C.navy, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: C.textSoft, marginTop: 4 },
  scroll: { paddingHorizontal: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: C.navy },
  cardSubtitle: { fontSize: 12, color: C.textSoft, marginTop: 2 },
  modalContainer: { flex: 1, backgroundColor: C.paper },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: C.paper,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  closeButton: { padding: 8 },
});