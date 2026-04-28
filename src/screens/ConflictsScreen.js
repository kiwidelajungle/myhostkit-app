import React, { useState } from 'react';
import { t, useLang } from '../i18n';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { useICalSync } from '../hooks/useICalSync';

const C = {
  ink: '#0a1628',
  paper: '#fbf8f3',
  paperWarm: '#f4ede0',
  gold: '#c89b5b',
  text: '#1c1c1e',
  textSoft: '#525252',
  border: '#e5e7eb',
  danger: '#dc2626',
  warning: '#f59e0b',
  success: '#16a34a',
};

const PLATFORM_LABELS = {
  airbnb: 'Airbnb',
  booking: 'Booking.com',
  abritel: 'Abritel',
  vrbo: 'VRBO',
  other: 'Autre',
};

const PLATFORM_LINKS = {
  airbnb: 'https://www.airbnb.com/hosting/calendar',
  booking: 'https://admin.booking.com/hotel/hoteladmin/extranet_ng/manage/calendar/index.html',
  abritel: 'https://www.abritel.fr/lyc',
  vrbo: 'https://www.vrbo.com/lodge-manager',
};

function getPlatformColor(platform) {
  const map = {
    airbnb: '#FF385C',
    booking: '#003580',
    abritel: '#2DA771',
    vrbo: '#1463F3',
  };
  return map[platform || ''] || C.textSoft;
}

export default function ConflictsScreen() {
  useLang();
  const { conflicts, fetchConflicts, resolveConflict, error } = useICalSync();
  const [refreshing, setRefreshing] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConflicts();
    setRefreshing(false);
  };

  const formatDate = (iso) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const calculateNights = (start, end) => {
    const days = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
    return Math.max(1, days);
  };

  const handleResolve = (conflict) => {
    Alert.alert(
      'Marquer comme resolu ?',
      `Confirmez-vous avoir bloque la date du ${formatDate(conflict.overlap_start)} au ${formatDate(conflict.overlap_end)} sur l'une des plateformes ?`,
      [
        { text: t('common_cancel'), style: 'cancel' },
        {
          text: "Oui, c'est resolu",
          onPress: async () => {
            setResolvingId(conflict.id);
            const ok = await resolveConflict(conflict.id);
            setResolvingId(null);
            if (!ok) {
              Alert.alert(t('common_error'), error || t('conflicts_err_resolve'));
            }
          },
        },
      ]
    );
  };

  const openPlatform = (platform) => {
    const url = PLATFORM_LINKS[platform] || `https://www.${platform}.com`;
    Linking.openURL(url).catch(() => {
      Alert.alert(t('common_error'), t('conflicts_err_link'));
    });
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Conflits</Text>
        <Text style={s.subtitle}>
          {conflicts.length === 0
            ? t('conflicts_empty_filter')
            : `${conflicts.length} conflit${conflicts.length > 1 ? 's' : ''} a resoudre`}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.gold} />}
      >
        {conflicts.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>OK</Text>
            <Text style={s.emptyTitle}>{t('conflicts_empty_title')}</Text>
            <Text style={s.emptyText}>
              Tous vos calendriers sont synchronises et coherents. Continuez comme ca !
            </Text>
          </View>
        )}

        {conflicts.map((conflict) => {
          const isResolving = resolvingId === conflict.id;
          const nights = calculateNights(conflict.overlap_start, conflict.overlap_end);

          return (
            <View key={conflict.id} style={s.card}>
              <View
                style={[
                  s.severityBadge,
                  conflict.severity === 'critical' ? s.severityCritical : s.severityWarning,
                ]}
              >
                <Text style={s.severityText}>
                  {conflict.severity === 'critical' ? 'CRITIQUE' : 'ATTENTION'}
                </Text>
              </View>

              <Text style={s.listingName}>{conflict.listing_name}</Text>
              {conflict.listing_address && (
                <Text style={s.listingAddress}>{conflict.listing_address}</Text>
              )}

              <View style={s.dateBlock}>
                <Text style={s.dateLabel}>Periode en conflit</Text>
                <Text style={s.dateValue}>
                  {formatDate(conflict.overlap_start)} - {formatDate(conflict.overlap_end)}
                </Text>
                <Text style={s.dateNights}>{nights} nuit{nights > 1 ? 's' : ''}</Text>
              </View>

              <View style={s.platformsRow}>
                <TouchableOpacity
                  style={[s.platformPill, { backgroundColor: getPlatformColor(conflict.platform_a) }]}
                  onPress={() => conflict.platform_a && openPlatform(conflict.platform_a)}
                >
                  <Text style={s.platformPillText}>
                    {PLATFORM_LABELS[conflict.platform_a || ''] || conflict.platform_a}
                  </Text>
                </TouchableOpacity>
                <Text style={s.platformVs}>vs</Text>
                <TouchableOpacity
                  style={[s.platformPill, { backgroundColor: getPlatformColor(conflict.platform_b) }]}
                  onPress={() => conflict.platform_b && openPlatform(conflict.platform_b)}
                >
                  <Text style={s.platformPillText}>
                    {PLATFORM_LABELS[conflict.platform_b || ''] || conflict.platform_b}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={s.actionBox}>
                <Text style={s.actionTitle}>Action recommandee</Text>
                <Text style={s.actionText}>
                  Choisissez la plateforme a honorer (generalement celle qui a reserve en premier),
                  puis bloquez manuellement la date sur l'autre plateforme. Touchez les badges ci-dessus
                  pour ouvrir directement le calendrier.
                </Text>
              </View>

              <TouchableOpacity
                style={[s.resolveButton, isResolving && s.resolveButtonDisabled]}
                onPress={() => handleResolve(conflict)}
                disabled={isResolving}
              >
                {isResolving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.resolveButtonText}>Marquer comme resolu</Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.paper },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 30, fontWeight: '700', color: C.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: C.textSoft, marginTop: 4 },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  empty: { alignItems: 'center', padding: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 16, color: C.success, fontWeight: '700' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: C.ink, marginBottom: 8 },
  emptyText: { fontSize: 14, color: C.textSoft, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  severityCritical: { backgroundColor: '#fee2e2' },
  severityWarning: { backgroundColor: '#fef3c7' },
  severityText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  listingName: { fontSize: 18, fontWeight: '700', color: C.ink },
  listingAddress: { fontSize: 13, color: C.textSoft, marginTop: 2, marginBottom: 16 },
  dateBlock: {
    backgroundColor: C.paperWarm,
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
  },
  dateLabel: {
    fontSize: 11,
    color: C.textSoft,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateValue: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 4 },
  dateNights: { fontSize: 12, color: C.textSoft, marginTop: 2 },
  platformsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  platformPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, marginHorizontal: 6 },
  platformPillText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  platformVs: { color: C.danger, fontSize: 16, fontWeight: '700', marginHorizontal: 4 },
  actionBox: {
    backgroundColor: '#fef3c7',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: C.warning,
  },
  actionTitle: { fontSize: 13, fontWeight: '700', color: '#7c2d12', marginBottom: 6 },
  actionText: { fontSize: 13, color: '#7c2d12', lineHeight: 19 },
  resolveButton: {
    backgroundColor: C.success,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  resolveButtonDisabled: { opacity: 0.5 },
  resolveButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});