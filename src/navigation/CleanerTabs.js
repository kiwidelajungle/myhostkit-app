import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import CleanerOnboarding from '../screens/cleaner/CleanerOnboarding';
import CleanerDashboard from '../screens/cleaner/CleanerDashboard';
import CleaningChatList from '../screens/CleaningChatList';
import NotificationsScreen from '../screens/NotificationsScreen';
import CleanerSettings from '../screens/cleaner/CleanerSettings';
import CleanerMoreScreen from '../screens/cleaner/CleanerMoreScreen';
import { useLang } from '../i18n';

var T = {
  navy: '#0a1628',
  navyLight: '#142238',
  gold: '#C8965A',
  goldSoft: '#d4a96b',
  muted: '#8a9099',
};

var Tab = createBottomTabNavigator();

export default function CleanerTabs(props) {
  useLang();
  var _hasProfile = useState(null); var hasProfile = _hasProfile[0]; var setHasProfile = _hasProfile[1];
  var _reload = useState(0); var reload = _reload[0]; var setReload = _reload[1];

  useEffect(function() {
    supabase.from('cleaners').select('id').eq('user_id', props.session.user.id).then(function(r) {
      setHasProfile(r.data && r.data.length > 0);
    });
  }, [reload]);

  if (hasProfile === null) return null;
  if (!hasProfile) return <CleanerOnboarding session={props.session} supabase={supabase} onComplete={function() { setReload(reload + 1); }} />;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: T.navy,
          borderTopColor: T.navyLight,
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 28,
          paddingTop: 10,
        },
        tabBarActiveTintColor: T.gold,
        tabBarInactiveTintColor: T.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Missions"
        options={{
          tabBarLabel: 'Missions',
          tabBarIcon: function(o) { return <Ionicons name={o.focused ? 'briefcase' : 'briefcase-outline'} size={22} color={o.color} />; },
        }}
      >
        {function(p) { return <CleanerDashboard {...p} session={props.session} supabase={supabase} />; }}
      </Tab.Screen>

      <Tab.Screen
        name="Messages"
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: function(o) { return <Ionicons name={o.focused ? 'chatbubbles' : 'chatbubbles-outline'} size={22} color={o.color} />; },
        }}
      >
        {function(p) { return <CleaningChatList {...p} session={props.session} role="cleaner" />; }}
      </Tab.Screen>

      <Tab.Screen
        name="Notifs"
        options={{
          tabBarLabel: 'Notifs',
          tabBarIcon: function(o) { return <Ionicons name={o.focused ? 'notifications' : 'notifications-outline'} size={22} color={o.color} />; },
        }}
      >
        {function(p) { return <NotificationsScreen {...p} session={props.session} role="cleaner" onNavigate={function(screen){p.navigation.navigate(screen);}} />; }}
      </Tab.Screen>

      <Tab.Screen
        name="More"
        options={{
          tabBarLabel: 'Plus',
          tabBarIcon: function(o) { return <Ionicons name={o.focused ? 'apps' : 'apps-outline'} size={22} color={o.color} />; },
        }}
      >
        {function(p) { return <CleanerMoreScreen {...p} session={props.session} />; }}
      </Tab.Screen>

      <Tab.Screen
        name="Profile"
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: function(o) { return <Ionicons name={o.focused ? 'person' : 'person-outline'} size={22} color={o.color} />; },
        }}
      >
        {function(p) { return <CleanerSettings {...p} session={props.session} onLogout={props.onLogout} />; }}
      </Tab.Screen>
    </Tab.Navigator>
  );
}