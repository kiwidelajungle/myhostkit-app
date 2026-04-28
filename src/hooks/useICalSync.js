import { t } from '../i18n';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';

export function useICalSync() {
  const [properties, setProperties] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('properties')
      .select('id, user_id, name, address, city, platform, ical_url, last_sync_at')
      .order('name', { ascending: true });
    if (err) setError(err.message);
    else setProperties(data || []);
    setLoading(false);
  }, []);

  const updateIcalUrl = useCallback(async (propertyId, icalUrl, platform) => {
    setError(null);
    const { error: err } = await supabase
      .from('properties')
      .update({ ical_url: icalUrl || null, platform })
      .eq('id', propertyId);
    if (err) { setError(err.message); return false; }
    await fetchProperties();
    return true;
  }, [fetchProperties]);

  const removeIcalUrl = useCallback(async (propertyId) => {
    const { error: err } = await supabase
      .from('properties')
      .update({ ical_url: null })
      .eq('id', propertyId);
    if (err) { setError(err.message); return false; }
    await fetchProperties();
    return true;
  }, [fetchProperties]);

  const fetchConflicts = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('booking_conflicts')
      .select('*')
      .eq('is_resolved', false)
      .order('overlap_start', { ascending: true });
    if (err) setError(err.message);
    else setConflicts(data || []);
  }, []);

  const resolveConflict = useCallback(async (conflictId) => {
    const { error: err } = await supabase
      .from('booking_conflicts')
      .update({ is_resolved: true, resolved_at: new Date().toISOString(), resolved_by_user: true })
      .eq('id', conflictId);
    if (err) { setError(err.message); return false; }
    await fetchConflicts();
    return true;
  }, [fetchConflicts]);

  const fetchBookings = useCallback(async (fromDate, toDate) => {
    const today = fromDate || new Date().toISOString().slice(0, 10);
    const limit = toDate || new Date(Date.now() + 365 * 86400 * 1000).toISOString().slice(0, 10);
    const { data, error: err } = await supabase
      .from('bookings')
      .select('id, property_id, platform, source, checkin_date, checkout_date, status, guest_name, properties!inner(name)')
      .gte('checkout_date', today)
      .lte('checkin_date', limit)
      .in('status', ['confirmed', 'blocked'])
      .order('checkin_date', { ascending: true });
    if (err) {
      setError(err.message);
    } else {
      const formatted = (data || []).map((b) => ({
        id: b.id,
        property_id: b.property_id,
        platform: b.platform,
        source: b.source,
        checkin_date: b.checkin_date,
        checkout_date: b.checkout_date,
        status: b.status,
        guest_name: b.guest_name,
        property_name: Array.isArray(b.properties) ? b.properties[0]?.name : b.properties?.name,
      }));
      setBookings(formatted);
    }
  }, []);

  const triggerSync = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke('ical-sync', { body: {} });
      if (invokeErr) { setError(invokeErr.message); return { success: false, message: invokeErr.message }; }
      await Promise.all([fetchProperties(), fetchConflicts(), fetchBookings()]);
      return { success: true, bookings_upserted: data?.bookings_upserted, conflicts_detected: data?.conflicts_detected };
    } catch (e) {
      setError(e?.message || t('hook_err_unknown'));
      return { success: false, message: e?.message };
    } finally {
      setSyncing(false);
    }
  }, [fetchProperties, fetchConflicts, fetchBookings]);

  const fetchUnresolvedCount = useCallback(async () => {
    const userRes = await supabase.auth.getUser();
    const userId = userRes?.data?.user?.id;
    if (!userId) return 0;
    const { data, error: err } = await supabase.rpc('unresolved_conflicts_count', { p_user_id: userId });
    return err ? 0 : data || 0;
  }, []);

  const fetchRecentSyncLogs = useCallback(async (propertyId) => {
    let query = supabase.from('ical_sync_logs').select('*').order('started_at', { ascending: false }).limit(10);
    if (propertyId) query = query.eq('property_id', propertyId);
    const { data, error: err } = await query;
    if (err) return [];
    return data || [];
  }, []);

  useEffect(() => {
    fetchProperties();
    fetchConflicts();
    fetchBookings();
  }, [fetchProperties, fetchConflicts, fetchBookings]);

  return {
    properties, conflicts, bookings, loading, syncing, error,
    fetchProperties, updateIcalUrl, removeIcalUrl, triggerSync,
    fetchConflicts, resolveConflict, fetchBookings,
    fetchUnresolvedCount, fetchRecentSyncLogs,
  };
}