// src/utils/db.js — FIX-06: Helper gestion erreurs DB
import { Alert } from 'react-native';

export async function dbQuery(promise, setLoading, errorMsg) {
  if (setLoading) setLoading(true);
  try {
    const { data, error } = await promise;
    if (setLoading) setLoading(false);
    if (error) {
      console.error('[DB Error]', error);
      Alert.alert('Erreur', errorMsg || error.message);
      return null;
    }
    return data;
  } catch (e) {
    if (setLoading) setLoading(false);
    console.error('[DB Exception]', e);
    Alert.alert('Erreur réseau', 'Vérifiez votre connexion internet.');
    return null;
  }
}

// Requête silencieuse (background refresh)
export async function dbSilent(promise) {
  try {
    const { data, error } = await promise;
    if (error) { console.error('[DB Silent]', error); return null; }
    return data;
  } catch (e) {
    console.error('[DB Silent Exception]', e);
    return null;
  }
}
