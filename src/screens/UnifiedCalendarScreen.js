import React, { useMemo, useState } from 'react';
import { t, useLang } from '../i18n';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useICalSync } from '../hooks/useICalSync';

LocaleConfig.locales['fr'] = {
  monthNames: [
    'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
  ],
  monthNamesShort: ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec'],
  dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  dayNamesShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
  today: "Aujourd'hui",
};
LocaleConfig.defaultLocale = 'fr';

const C = {
  ink: '#0a1628',
  paper: '#fbf8f3',
  gold: '#c89b5b',
  text: '#1c1c1e',
  textSoft: '#525252',
  border: '#e5e7eb',
  danger: '#dc2626',
};

const PLATFORM_COLORS = {
  airbnb: '#FF385C',
  booking: '#003580',
  abritel: '#2DA771',
  vrbo: '#1463F3',
  other: '#525252',
};

const PLATFORM_LABELS = {
  airbnb: 'Airbnb',
  booking: 'Booking',
  abritel: 'Abritel',
  vrbo: 'VRBO',
  other: 'Autre',
};

export default function UnifiedCalendarScreen() {
  useLang();
  const { bookings, properties, conflicts } = useICalSync();
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const filteredBookings = useMemo(() => {
    if (!selectedPropertyId) return bookings;
    return bookings.filter((b) => b.property_id === selectedPropertyId);
  }, [bookings, selectedPropertyId]);

  const markedDates = useMemo(() => {
    const marks = {};

    filteredBookings.forEach((b) => {
      const color = PLATFORM_COLORS[b.platform] || C.textSoft;
      const start = b.checkin_date;
      const end = b.checkout_date;

      const startDate = new Date(start);
      const endDate = new Date(end);
      const days = [];
      for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
        days.push(d.toISOString().slice(0, 10));
      }

      days.forEach((day, idx) => {
        const isStart = idx === 0;
        const isEnd = idx === days.length - 1;
        if (!marks[day]) marks[day] = { periods: [] };
        if (!marks[day].periods) marks[day].periods = [];
        marks[day].periods.push({
          color,
          startingDay: isStart,
          endingDay: isEnd,
        });
      });
    });

    conflicts.forEach((c) => {
      const startDate = new Date(c.overlap_start);
      const endDate = new Date(c.overlap_end);
      for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
        const day = d.toISOString().slice(0, 10);
        if (!marks[day]) marks[day] = { periods: [] };
        marks[day].marked = true;
        marks[day].dotColor = C.danger;
      }
    });

    if (selectedDate) {
      if (!marks[selectedDate]) marks[selectedDate] = {};
      marks[selectedDate].selected = true;
      marks[selectedDate].selectedColor = C.gold;
    }

    return marks;
  }, [filteredBookings, conflicts, selectedDate]);

  const selectedDateBookings = useMemo(() => {
    if (!selectedDate) return [];
    return filteredBookings.filter((b) => {
      return b.checkin_date <= selectedDate && b.checkout_date > selectedDate;
    });
  }, [filteredBookings, selectedDate]);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{t('ucal_title')}</Text>
        <Text style={s.subtitle}>
          {filteredBookings.length} reservation{filteredBookings.length > 1 ? 's' : ''} - {conflicts.length} conflit{conflicts.length > 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterScroll}
      >
        <TouchableOpacity
          style={[s.filterChip, !selectedPropertyId && s.filterChipActive]}
          onPress={() => setSelectedPropertyId(null)}
        >
          <Text style={[s.filterChipText, !selectedPropertyId && s.filterChipTextActive]}>
            Tous
          </Text>
        </TouchableOpacity>
        {properties.map((prop) => (
          <TouchableOpacity
            key={prop.id}
            style={[s.filterChip, selectedPropertyId === prop.id && s.filterChipActive]}
            onPress={() => setSelectedPropertyId(prop.id)}
          >
            <Text
              style={[s.filterChipText, selectedPropertyId === prop.id && s.filterChipTextActive]}
              numberOfLines={1}
            >
              {prop.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.calendarWrap}>
          <Calendar
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markingType={'multi-period'}
            markedDates={markedDates}
            theme={{
              backgroundColor: '#fff',
              calendarBackground: '#fff',
              textSectionTitleColor: C.textSoft,
              selectedDayBackgroundColor: C.gold,
              selectedDayTextColor: C.ink,
              todayTextColor: C.gold,
              dayTextColor: C.ink,
              textDisabledColor: C.border,
              monthTextColor: C.ink,
              textMonthFontWeight: '700',
              textDayFontWeight: '500',
              textDayHeaderFontWeight: '600',
              arrowColor: C.gold,
              textDayFontSize: 14,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 12,
            }}
          />
        </View>

        <View style={s.legend}>
          <Text style={s.legendTitle}>{t('ucal_legend')}</Text>
          <View style={s.legendRow}>
            {Object.keys(PLATFORM_LABELS).map((key) => (
              <View key={key} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: PLATFORM_COLORS[key] }]} />
                <Text style={s.legendText}>{PLATFORM_LABELS[key]}</Text>
              </View>
            ))}
          </View>
          <View style={s.legendRow}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: C.danger }]} />
              <Text style={s.legendText}>{t('ucal_legend_conflict')}</Text>
            </View>
          </View>
        </View>

        {selectedDate && (
          <View style={s.detailsCard}>
            <Text style={s.detailsDate}>
              {new Date(selectedDate).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            {selectedDateBookings.length === 0 ? (
              <Text style={s.detailsEmpty}>{t('ucal_no_booking_today')}</Text>
            ) : (
              selectedDateBookings.map((b) => (
                <View key={b.id} style={s.bookingItem}>
                  <View
                    style={[
                      s.bookingPlatform,
                      { backgroundColor: PLATFORM_COLORS[b.platform] || C.textSoft },
                    ]}
                  >
                    <Text style={s.bookingPlatformText}>
                      {PLATFORM_LABELS[b.platform] || b.platform}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.bookingProperty}>{b.property_name || t('common_property')}</Text>
                    <Text style={s.bookingDates}>
                      Du {b.checkin_date} au {b.checkout_date}
                    </Text>
                    {b.guest_name && <Text style={s.bookingGuest}>{b.guest_name}</Text>}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.paper },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
  title: { fontSize: 30, fontWeight: '700', color: C.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: C.textSoft, marginTop: 4 },
  filterScroll: { paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 100, borderWidth: 1, borderColor: C.border, marginRight: 8, minHeight: 36, justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: C.ink, borderColor: C.ink },
  filterChipText: { color: C.text, fontSize: 13, fontWeight: '500' },
  filterChipTextActive: { color: C.gold },
  scroll: { paddingHorizontal: 16 },
  calendarWrap: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  legend: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 14, marginBottom: 4 },
  legendDot: { width: 12, height: 12, borderRadius: 3, marginRight: 6 },
  legendText: { fontSize: 12, color: C.text },
  detailsCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  detailsDate: {
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 14,
    textTransform: 'capitalize',
  },
  detailsEmpty: { fontSize: 14, color: C.textSoft, fontStyle: 'italic' },
  bookingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  bookingPlatform: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  bookingPlatformText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  bookingProperty: { fontWeight: '600', color: C.ink, fontSize: 14 },
  bookingDates: { color: C.textSoft, fontSize: 12, marginTop: 2 },
  bookingGuest: { color: C.textSoft, fontSize: 12, marginTop: 2 },
});