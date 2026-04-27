// CRITIQUE: Clés lues depuis les variables d'environnement
// Ne JAMAIS committer ce fichier avec des clés en dur
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

var SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://illovwqvszjuasftwkxh.supabase.co';
var SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsbG92d3F2c3pqdWFzZnR3a3hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMTk4NDQsImV4cCI6MjA5MDg5NTg0NH0.EMR86eBRtW9tF118YB1Xq2NL08FajJ7HLp51YwmF4_Y';

if (!SUPABASE_ANON) {
  console.warn('[SUPABASE] Clé ANON manquante — créez un fichier .env avec EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

var EDGE_URL = SUPABASE_URL + '/functions/v1';

var supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export { supabase, SUPABASE_URL, SUPABASE_ANON, EDGE_URL };
