import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import TaskScreen from '../screens/TaskScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Defines the tabs available after the user logs in
export type AppTabParamList = {
  Task: undefined;
  Profile: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

const ICONS: Record<keyof AppTabParamList, { active: string; inactive: string }> = {
  Task: { active: 'checkbox', inactive: 'checkbox-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
  Settings: { active: 'settings', inactive: 'settings-outline' },
};

const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
        tabBarIcon: ({ color, size, focused }) => {
          const iconSet = ICONS[route.name as keyof AppTabParamList];
          const iconName = focused ? iconSet.active : iconSet.inactive;
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}>
      <Tab.Screen name="Task" component={TaskScreen} options={{ title: 'Tasks' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export default AppNavigator;