import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import AdminDashboard from '../screens/admin/AdminDashboard';
import AdminUsers from '../screens/admin/AdminUsers';
import AdminBookings from '../screens/admin/AdminBookings';
import AdminSupport from '../screens/admin/AdminSupport';
import { t, useLang } from '../i18n';

var T = { accent: '#C8965A', dark: '#141414', dark2: '#1E1E1E', muted: '#9B9B9B' };
var Tab = createBottomTabNavigator();

export default function AdminTabs(props) {
  useLang();
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: T.dark, borderTopColor: T.dark2, height: 85, paddingBottom: 25, paddingTop: 8 }, tabBarActiveTintColor: T.accent, tabBarInactiveTintColor: T.muted, tabBarLabelStyle: { fontSize: 9, fontWeight: '600' } }}>
      <Tab.Screen name="ADash" options={{ tabBarLabel: t('tab_admin_dashboard'), tabBarIcon: function(o) { return <Text style={{ fontSize: 17, opacity: o.focused ? 1 : 0.4 }}>📊</Text>; } }}>
        {function(p) { return <AdminDashboard {...p} session={props.session} />; }}
      </Tab.Screen>
      <Tab.Screen name="AUsers" options={{ tabBarLabel: t('tab_admin_users'), tabBarIcon: function(o) { return <Text style={{ fontSize: 17, opacity: o.focused ? 1 : 0.4 }}>👥</Text>; } }}>
        {function(p) { return <AdminUsers {...p} session={props.session} />; }}
      </Tab.Screen>
      <Tab.Screen name="ABookings" options={{ tabBarLabel: t('tab_admin_bookings'), tabBarIcon: function(o) { return <Text style={{ fontSize: 17, opacity: o.focused ? 1 : 0.4 }}>📋</Text>; } }}>
        {function(p) { return <AdminBookings {...p} session={props.session} />; }}
      </Tab.Screen>
      <Tab.Screen name="ASupport" options={{ tabBarLabel: t('tab_admin_support'), tabBarIcon: function(o) { return <Text style={{ fontSize: 17, opacity: o.focused ? 1 : 0.4 }}>🛠️</Text>; } }}>
        {function(p) { return <AdminSupport {...p} session={props.session} onLogout={props.onLogout} />; }}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
