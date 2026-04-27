import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import GuestHome from '../screens/guest/GuestHome';
import GuestInfo from '../screens/guest/GuestInfo';
import GuestChat from '../screens/guest/GuestChat';
import { useLang } from '../i18n';

var T = {
  navy: '#0a1628',
  navyLight: '#142238',
  gold: '#C8965A',
  goldSoft: '#d4a96b',
  muted: '#8a9099',
};

var Tab = createBottomTabNavigator();

export default function GuestTabs(props) {
  useLang();
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
        name="Home"
        options={{
          tabBarLabel: 'Accueil',
          tabBarIcon: function(o) { return <Ionicons name={o.focused ? 'home' : 'home-outline'} size={22} color={o.color} />; },
        }}
      >
        {function(p) { return <GuestHome {...p} session={props.session} onLogout={props.onLogout} />; }}
      </Tab.Screen>

      <Tab.Screen
        name="Info"
        options={{
          tabBarLabel: 'Infos',
          tabBarIcon: function(o) { return <Ionicons name={o.focused ? 'document-text' : 'document-text-outline'} size={22} color={o.color} />; },
        }}
      >
        {function(p) { return <GuestInfo {...p} session={props.session} />; }}
      </Tab.Screen>

      <Tab.Screen
        name="Concierge"
        options={{
          tabBarLabel: 'Concierge',
          tabBarIcon: function(o) { return <Ionicons name={o.focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={22} color={o.color} />; },
        }}
      >
        {function(p) { return <GuestChat {...p} session={props.session} />; }}
      </Tab.Screen>
    </Tab.Navigator>
  );
}