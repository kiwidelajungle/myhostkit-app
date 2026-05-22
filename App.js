import { BrandingProvider } from './src/context/BrandingProvider';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import CGUScreen from './src/screens/CGUScreen';
import HostTabs from './src/navigation/HostTabs';
import GuestTabs from './src/navigation/GuestTabs';
import CleanerTabs from './src/navigation/CleanerTabs';
import AdminTabs from './src/navigation/AdminTabs';
import CompleteProfileScreen from './src/screens/CompleteProfileScreen';
import { isAdmin } from './src/utils/subscription';
import { supabase } from './src/config/supabase';
import { checkInactivity } from './src/utils/accountManager';

import { registerPushToken } from './src/utils/notifications';
import * as Sentry from '@sentry/react-native';
import { initMonitoring, track, clearUser } from './src/utils/monitoring';
import { initLang } from './src/i18n';

initLang();

var STRIPE_PUBLISHABLE_KEY = 'pk_test_51THrgh1Dfb6RH0ekGsf0O4JpSGj6n7TJHyvIRvMFVdlPe3lUmdkVAOkkvy0bujkFNHBkmbLmyjBZS66kaonreejT00uiSWqT4C';

Sentry.init({
  dsn: 'https://ef79f48a5fa2a83de148bb5219e6dd66@o4511258819428352.ingest.de.sentry.io/4511258839613520',
  environment: __DEV__ ? 'development' : 'production',
  enabled: !__DEV__,
  tracesSampleRate: 0.1,
  sendDefaultPii: true,
  enableLogs: false,
  integrations: [],
  beforeSend: function(event) {
    if (event.exception) {
      var err = event.exception.values && event.exception.values[0];
      var msg = err && err.value;
      if (msg && /Network request failed|timeout|aborted/i.test(msg)) {
        return null;
      }
    }
    return event;
  },
});

var Stack = createNativeStackNavigator();

export default Sentry.wrap(function App() {
  var _session = useState(null); var session = _session[0]; var setSession = _session[1];
  var _role = useState(null); var role = _role[0]; var setRole = _role[1];
  var _profileComplete = useState(null); var profileComplete = _profileComplete[0]; var setProfileComplete = _profileComplete[1];
  var _showOnboarding = useState(null); var showOnboarding = _showOnboarding[0]; var setShowOnboarding = _showOnboarding[1];
  var _showRoleTuto = useState(false); var showRoleTuto = _showRoleTuto[0]; var setShowRoleTuto = _showRoleTuto[1];
  var _showSplash = useState(true); var showSplash = _showSplash[0]; var setShowSplash = _showSplash[1];
  var _cguAccepted = useState(false); var cguAccepted = _cguAccepted[0]; var setCguAccepted = _cguAccepted[1];
  var _checkingCgu = useState(false); var checkingCgu = _checkingCgu[0]; var setCheckingCgu = _checkingCgu[1];

  // Initialize monitoring (Sentry + PostHog) once at app start
  useEffect(function() { initMonitoring(); }, []);
  useEffect(function() {
    // Vérifier si l'onboarding a déjà été vu
    AsyncStorage.getItem('onboarding_done').then(function(v) {
      setShowOnboarding(v !== 'true');
    });
    supabase.auth.getSession().then(function(r) {
      if (r.data.session) {
        setSession(r.data.session);
        // Charger le rôle depuis la base
        supabase.from('profiles').select('role,profile_complete').eq('id', r.data.session.user.id).single().then(function(pr) {
          if (pr.data && pr.data.role) {
            setRole(pr.data.role);
            // Vérifier tuto du rôle
            AsyncStorage.getItem('tuto_' + pr.data.role + '_done').then(function(v) {
              if (v !== 'true' && pr.data.role !== 'admin') setShowRoleTuto(true);
            });
            // Vérifier CGU
            supabase.from('cgu_acceptances').select('id').eq('user_id', r.data.session.user.id).limit(1).then(function(cr) {
              if (cr.data && cr.data.length > 0) setCguAccepted(true);
            });
          }
        });
      }
    });
    var sub = supabase.auth.onAuthStateChange(function(_, s) {
      setSession(s);
      if (!s) { setRole(null); setCguAccepted(false); }
      else if (s.user && !role) {
        supabase.from('profiles').select('role,profile_complete').eq('id', s.user.id).single().then(function(pr) {
          if (pr.data && pr.data.role) { setRole(pr.data.role); setProfileComplete(pr.data.profile_complete === true || pr.data.role === 'guest' || pr.data.role === 'admin'); }
        });
      }
    });
    return function() { sub.data.subscription.unsubscribe(); };
  }, []);

  function login(s, r) {
    setSession(s);
    setRole(r);
    // [14] Enregistrer le push token
    if (r !== 'guest' && s && s.user) { registerPushToken(s.user.id).catch(function(){}); }

    // Vérifier si le tuto du rôle a été vu
    var tutoKey = 'tuto_' + r + '_done';
    AsyncStorage.getItem(tutoKey).then(function(v) {
      if (v !== 'true' && r !== 'admin') {
        setShowRoleTuto(true);
      }
    });

    // Vérifier si l'utilisateur a accepté les CGU (sauf voyageur guest)
    if (r === 'guest') { setCguAccepted(true); return; }
    setCheckingCgu(true);
    supabase.from('cgu_acceptances').select('id').eq('user_id', s.user.id).limit(1).then(function(cr) {
      setCheckingCgu(false);
      if (cr.data && cr.data.length > 0) { setCguAccepted(true); }
      else { setCguAccepted(false); }

      // ─── FEATURE 5 : Vérification inactivité 2-3 ans ───
      if (cr.data && cr.data.length > 0) {
        checkInactivity(s, r, logout);
      }
    });
  }

  function logout() { track('logout'); clearUser(); supabase.auth.signOut(); setSession(null); setRole(null); setCguAccepted(false); }

  if (showSplash) {
    return <BrandingProvider brandSlug='keyla'>
    <SafeAreaProvider><StatusBar style="light" /><SplashScreen onFinish={function() { setShowSplash(false); }} /></SafeAreaProvider>
    </BrandingProvider>;
  }

  // Pas connecté → Login
  // Onboarding au premier lancement
  if (showOnboarding === null) return null; // chargement
  if (showOnboarding && !session) {
    return <BrandingProvider brandSlug='keyla'>
    <SafeAreaProvider><StatusBar style="dark" /><OnboardingScreen onDone={function() { AsyncStorage.setItem('onboarding_done', 'true'); setShowOnboarding(false); }} /></SafeAreaProvider>
    </BrandingProvider>;
  }

  if (!session || !role) {
    return <BrandingProvider brandSlug='keyla'>
    <SafeAreaProvider><StatusBar style="dark" /><NavigationContainer><Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="Login">{function(p) { return <LoginScreen {...p} onLogin={login} />; }}</Stack.Screen></Stack.Navigator></NavigationContainer></SafeAreaProvider>
    </BrandingProvider>;
  }

  // Connecté mais CGU non acceptées → CGU
  if (!cguAccepted && !checkingCgu && role !== 'guest') {
    return <BrandingProvider brandSlug='keyla'>
    <SafeAreaProvider><StatusBar style="dark" /><CGUScreen session={session} role={role} onAccept={function() { setCguAccepted(true); }} /></SafeAreaProvider>
    </BrandingProvider>;
  }

  // Loading CGU check
  if (checkingCgu) return null;

  // Tuto du rôle — première connexion dans ce rôle
  if (session && role && role !== 'guest' && role !== 'admin' && profileComplete === false) {
    return <CompleteProfileScreen role={role} session={session} onComplete={function(){setProfileComplete(true);}} />;
  }
  if (showRoleTuto && role && role !== 'admin') {
    return <BrandingProvider brandSlug='keyla'>
    <SafeAreaProvider><StatusBar style="dark" /><OnboardingScreen role={role} referralCode={'MHK-' + (session.user.id || '').substring(0,6).toUpperCase()} onDone={function() { AsyncStorage.setItem('tuto_' + role + '_done', 'true'); setShowRoleTuto(false); }} /></SafeAreaProvider>
    </BrandingProvider>;
  }

  // Connecté + CGU OK → App
  return (
    <BrandingProvider brandSlug='keyla'>
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAdmin(session.user.email) ? (
            <Stack.Screen name="Admin">{function(p) { return <AdminTabs {...p} session={session} onLogout={logout} />; }}</Stack.Screen>
          ) : role === 'host' ? (
            <Stack.Screen name="Host">{function(p) { return <HostTabs {...p} session={session} onLogout={logout} />; }}</Stack.Screen>
          ) : role === 'cleaner' ? (
            <Stack.Screen name="Cleaner">{function(p) { return <CleanerTabs {...p} session={session} onLogout={logout} />; }}</Stack.Screen>
          ) : (
            <Stack.Screen name="Guest">{function(p) { return <GuestTabs {...p} session={session} onLogout={logout} />; }}</Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
    </BrandingProvider>
  );
});



