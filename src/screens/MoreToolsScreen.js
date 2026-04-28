import React, { useState } from 'react';
import { t, useLang } from '../i18n';
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
import { useICalSync } from '../hooks/useICalSync';

import MyCalendarsScreen from './MyCalendarsScreen';
import ConflictsScreen from './ConflictsScreen';
import UnifiedCalendarScreen from './UnifiedCalendarScreen';
import HostInventory from './host/HostInventory';
import CleaningChatList from './CleaningChatList';

const C = {
  navy: '#0a1628',
  paper: '#fbf8f3',
  paperWarm: '#f4ede0',
  gold: '#C8965A',
  text: '#1c1c1e',
  textSoft: '#525252',
  border: '#e5e7eb',
  danger: '#dc2626',
  success: '#16a34a',
  white: '#fff',
};

function formatRelativeTime(iso) {
  if (!iso) return t('more_never');
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "A l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `Il y a ${d}j`;
}

export default function MoreToolsScreen(props) {
  useLang();
  const [activeModal, setActiveModal] = useState(null);
  const { conflicts, properties } = useICalSync();
  const conflictCount = conflicts.length;

  const activeCalendars = properties.filter(p => p.ical_url).length;
  const totalProperties = properties.length;

  let lastSync = null;
  properties.forEach(p => {
    if (p.last_sync_at && (!lastSync || p.last_sync_at > lastSync)) {
      lastSync = p.last_sync_at;
    }
  });

  const tools = [
    {
      key: 'calendars',
      icon: 'calendar-outline',
      title: t('more_ical_title'),
      subtitle: t('more_ical_sub'),
      color: C.gold,
    },
    {
      key: 'conflicts',
      icon: 'warning-outline',
      title: t('more_conflicts_title'),
      subtitle: conflictCount > 0
        ? `${conflictCount} conflit${conflictCount > 1 ? 's' : ''} a resoudre`
        : t('more_conflicts_none'),
      color: conflictCount > 0 ? C.danger : C.gold,
      badge: conflictCount > 0 ? conflictCount : null,
    },
    {
      key: 'unified',
      icon: 'grid-outline',
      title: t('more_unified_title'),
      subtitle: t('more_unified_sub'),
      color: C.gold,
    },
    {
      key: 'inventory',
      icon: 'cube-outline',
      title: t('more_inv_title'),
      subtitle: t('more_inv_sub'),
      color: C.gold,
    },
    {
      key: 'messages',
      icon: 'chatbubbles-outline',
      title: t('more_msg_title'),
      subtitle: t('more_msg_sub'),
      color: C.gold,
    },
  ];

  const renderModalContent = () => {
    switch (activeModal) {
      case 'calendars':
        return <MyCalendarsScreen />;
      case 'conflicts':
        return <ConflictsScreen />;
      case 'unified':
        return <UnifiedCalendarScreen />;
      case 'inventory':
        return <HostInventory session={props.session} />;
      case 'messages':
        return <CleaningChatList session={props.session} role="host" />;
      default:
        return null;
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{t('more_page_title')}</Text>
        <Text style={s.subtitle}>{t('more_page_sub_host')}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>

        {/* BANDEAU STATS SYNC iCAL */}
        {totalProperties > 0 && (
          <TouchableOpacity
            style={s.statsBanner}
            onPress={() => setActiveModal('calendars')}
            activeOpacity={0.85}
          >
            <View style={s.statsHeader}>
              <Ionicons name="sync-outline" size={18} color={C.gold} />
              <Text style={s.statsHeaderText}>{t('more_sync_ical')}</Text>
            </View>

            <View style={s.statsRow}>
              <View style={s.statBox}>
                <Text style={s.statValue}>
                  <Text style={{ color: C.gold }}>{activeCalendars}</Text>
                  <Text style={s.statValueSoft}> / {totalProperties}</Text>
                </Text>
                <Text style={s.statLabel}>{t('more_active')}</Text>
              </View>

              <View style={s.statDivider} />

              <View style={s.statBox}>
                <Text style={[s.statValue, { color: conflictCount > 0 ? C.danger : C.success }]}>
                  {conflictCount}
                </Text>
                <Text style={s.statLabel}>{conflictCount !== 1 ? t('more_conflict_plural') : t('more_conflict_single')}</Text>
              </View>

              <View style={s.statDivider} />

              <View style={s.statBox}>
                <Text style={s.statValueSmall}>{formatRelativeTime(lastSync)}</Text>
                <Text style={s.statLabel}>{t('more_last_sync')}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

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
              <View style={s.cardTitleRow}>
                <Text style={s.cardTitle}>{tool.title}</Text>
                {tool.badge && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{tool.badge}</Text>
                  </View>
                )}
              </View>
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
  statsBanner: {
    backgroundColor: C.navy,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsHeaderText: {
    color: C.gold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginLeft: 6,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: C.white,
  },
  statValueSoft: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 18,
    fontWeight: '500',
  },
  statValueSmall: {
    fontSize: 13,
    fontWeight: '600',
    color: C.white,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 8,
  },
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
  cardTitleRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: C.navy },
  cardSubtitle: { fontSize: 12, color: C.textSoft, marginTop: 2 },
  badge: {
    backgroundColor: C.danger,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: { color: C.white, fontSize: 11, fontWeight: '700' },
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