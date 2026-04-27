import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useICalSync } from '../../hooks/useICalSync';

const C = {
  ink: '#0a1628',
  inkSoft: '#142238',
  paper: '#fbf8f3',
  paperWarm: '#f4ede0',
  gold: '#c89b5b',
  goldDeep: '#a87a3d',
  text: '#1c1c1e',
  textSoft: '#525252',
  border: '#e5e7eb',
  success: '#16a34a',
  warning: '#f59e0b',
  danger: '#dc2626',
};

const PLATFORM_LABELS = {
  airbnb: 'Airbnb',
  booking: 'Booking.com',
  abritel: 'Abritel',
  vrbo: 'VRBO',
  other: 'Autre',
};

const PLATFORM_COLORS = {
  airbnb: '#FF385C',
  booking: '#003580',
  abritel: '#2DA771',
  vrbo: '#1463F3',
  other: '#525252',
};

export default function MyCalendarsTab() {
  const {
    properties,
    loading,
    syncing,
    error,
    fetchProperties,
    updateIcalUrl,
    removeIcalUrl,
    triggerSync,
  } = useICalSync();

  const [editing, setEditing] = useState(null);
  const [icalInput, setIcalInput] = useState('');
  const [platformInput, setPlatformInput] = useState('airbnb');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProperties();
    setRefreshing(false);
  };

  const openEditModal = (prop) => {
    setEditing(prop);
    setIcalInput(prop.ical_url || '');
    setPlatformInput(prop.platform || 'airbnb');
  };

  const closeEditModal = () => {
    Keyboard.dismiss();
    setEditing(null);
    setIcalInput('');
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!icalInput.startsWith('http')) {
      Alert.alert('URL invalide', "L'URL doit commencer par https://");
      return;
    }
    Keyboard.dismiss();
    const ok = await updateIcalUrl(editing.id, icalInput.trim(), platformInput);
    if (ok) {
      Alert.alert('Enregistre', 'Le calendrier sera synchronise dans les 15 prochaines minutes.');
      closeEditModal();
    } else {
      Alert.alert('Erreur', error || "Impossible d'enregistrer");
    }
  };

  const handleRemove = () => {
    if (!editing) return;
    Alert.alert(
      'Supprimer ?',
      'Le calendrier ne sera plus synchronise pour ce logement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await removeIcalUrl(editing.id);
            closeEditModal();
          },
        },
      ]
    );
  };

  const handleSyncNow = async () => {
    const result = await triggerSync();
    if (result.success) {
      Alert.alert(
        'Sync terminee',
        `${result.bookings_upserted ?? 0} reservations - ${result.conflicts_detected ?? 0} conflit(s) detecte(s)`
      );
    } else {
      Alert.alert('Erreur', result.message || 'Sync echouee');
    }
  };

  const formatRelativeTime = (iso) => {
    if (!iso) return 'Jamais synchronise';
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "A l'instant";
    if (min < 60) return `Il y a ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `Il y a ${h}h`;
    const d = Math.floor(h / 24);
    return `Il y a ${d}j`;
  };

  const getSyncIcon = (lastSync) => {
    if (!lastSync) return { color: C.textSoft, label: '-' };
    const diff = Date.now() - new Date(lastSync).getTime();
    if (diff < 30 * 60 * 1000) return { color: C.success, label: '*' };
    if (diff < 24 * 3600 * 1000) return { color: C.warning, label: '*' };
    return { color: C.danger, label: '*' };
  };

  return (
    <View style={s.container}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.gold} />}
      >
        <View style={s.subtitleBox}>
          <Text style={s.subtitle}>
            Sync automatique toutes les 15 min - {properties.filter(p => p.ical_url).length}/{properties.length} actifs
          </Text>
        </View>

        <TouchableOpacity
          style={[s.syncButton, syncing && s.syncButtonDisabled]}
          onPress={handleSyncNow}
          disabled={syncing || properties.filter(p => p.ical_url).length === 0}
        >
          {syncing ? (
            <ActivityIndicator color={C.ink} />
          ) : (
            <Text style={s.syncButtonText}>Synchroniser maintenant</Text>
          )}
        </TouchableOpacity>

        {loading && properties.length === 0 && (
          <ActivityIndicator size="large" color={C.gold} style={{ marginTop: 40 }} />
        )}

        {!loading && properties.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Aucun logement</Text>
            <Text style={s.emptyText}>Ajoutez d'abord un logement dans l'app</Text>
          </View>
        )}

        {properties.map((prop) => {
          const icon = getSyncIcon(prop.last_sync_at);
          const platformColor = PLATFORM_COLORS[prop.platform || 'other'] || C.textSoft;

          return (
            <TouchableOpacity
              key={prop.id}
              style={s.card}
              onPress={() => openEditModal(prop)}
              activeOpacity={0.7}
            >
              <View style={s.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{prop.name}</Text>
                  {prop.address && <Text style={s.cardSubtitle}>{prop.address}</Text>}
                </View>
                <Text style={[s.statusDot, { color: icon.color }]}>{icon.label}</Text>
              </View>

              <View style={s.cardBody}>
                {prop.ical_url ? (
                  <>
                    <View style={s.row}>
                      <View style={[s.platformBadge, { backgroundColor: platformColor }]}>
                        <Text style={s.platformText}>
                          {PLATFORM_LABELS[prop.platform || 'other']}
                        </Text>
                      </View>
                      <Text style={s.syncedAt}>{formatRelativeTime(prop.last_sync_at)}</Text>
                    </View>
                    <Text style={s.icalUrl} numberOfLines={1}>
                      {prop.ical_url.replace(/(https?:\/\/[^/]+).*/, '$1...')}
                    </Text>
                  </>
                ) : (
                  <Text style={s.notConfigured}>+ Ajouter une URL iCal</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 60 }} />
      </ScrollView>

      <Modal visible={!!editing} animationType="slide" transparent onRequestClose={closeEditModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={closeEditModal}>
            <View style={s.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={s.modalCard}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={s.modalTitle}>{editing?.name}</Text>
              <Text style={s.modalSubtitle}>Configurez la sync iCal</Text>

              <Text style={s.label}>Plateforme</Text>
              <View style={s.platformPicker}>
                {Object.keys(PLATFORM_LABELS).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[s.platformChip, platformInput === p && s.platformChipActive]}
                    onPress={() => setPlatformInput(p)}
                  >
                    <Text style={[s.platformChipText, platformInput === p && s.platformChipTextActive]}>
                      {PLATFORM_LABELS[p]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>URL iCal</Text>
              <TextInput
                style={s.input}
                value={icalInput}
                onChangeText={setIcalInput}
                placeholder="https://www.airbnb.com/calendar/ical/..."
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                multiline
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={Keyboard.dismiss}
              />

              <Text style={s.helpText}>
                Pour recuperer votre URL iCal :{'\n'}
                Airbnb : Calendrier - Synchroniser - Exporter le calendrier{'\n'}
                Booking : Extranet - Calendar - Sync calendars - Export
              </Text>

              <View style={s.modalActions}>
                {editing?.ical_url && (
                  <TouchableOpacity style={s.removeButton} onPress={handleRemove}>
                    <Text style={s.removeButtonText}>Supprimer</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.cancelButton} onPress={closeEditModal}>
                  <Text style={s.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveButton} onPress={handleSave}>
                  <Text style={s.saveButtonText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.paper },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  subtitleBox: { marginBottom: 12 },
  subtitle: { fontSize: 13, color: C.textSoft, textAlign: 'center' },
  syncButton: {
    backgroundColor: C.gold,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  syncButtonDisabled: { opacity: 0.4 },
  syncButtonText: { color: C.ink, fontWeight: '700', fontSize: 16 },
  empty: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: C.ink, marginBottom: 8 },
  emptyText: { fontSize: 14, color: C.textSoft, textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: C.ink },
  cardSubtitle: { fontSize: 12, color: C.textSoft, marginTop: 2 },
  statusDot: { fontSize: 24, marginLeft: 8 },
  cardBody: { marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  platformBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  platformText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  syncedAt: { fontSize: 12, color: C.textSoft },
  icalUrl: { fontSize: 11, color: C.textSoft, marginTop: 4 },
  notConfigured: { color: C.gold, fontWeight: '600', fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCard: {
    backgroundColor: C.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalTitle: { fontSize: 22, fontWeight: '700', color: C.ink },
  modalSubtitle: { fontSize: 14, color: C.textSoft, marginTop: 4, marginBottom: 20 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  platformPicker: { flexDirection: 'row', flexWrap: 'wrap' },
  platformChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
    marginBottom: 8,
  },
  platformChipActive: { backgroundColor: C.ink, borderColor: C.ink },
  platformChipText: { color: C.text, fontSize: 13, fontWeight: '500' },
  platformChipTextActive: { color: C.gold },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 13,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 60,
  },
  helpText: { fontSize: 12, color: C.textSoft, marginTop: 12, lineHeight: 18 },
  modalActions: { flexDirection: 'row', marginTop: 24 },
  removeButton: { flex: 1, padding: 14, alignItems: 'center' },
  removeButtonText: { color: C.danger, fontWeight: '600' },
  cancelButton: { flex: 1, padding: 14, alignItems: 'center' },
  cancelButtonText: { color: C.textSoft, fontWeight: '600' },
  saveButton: {
    flex: 1.5,
    backgroundColor: C.ink,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: { color: C.gold, fontWeight: '700' },
});