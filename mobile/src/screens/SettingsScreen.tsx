import React, { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_KEY = 'notificationsEnabled';

const SettingsScreen = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);

  // Load saved preference on mount
  useEffect(() => {
    const loadPreference = async () => {
      const stored = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      // Default to enabled if nothing saved yet
      setNotificationsEnabled(stored === null ? true : stored === 'true');
      setLoaded(true);
    };
    loadPreference();
  }, []);

  const toggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, value ? 'true' : 'false');
  };

  if (!loaded) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Settings</Text>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Task Reminders</Text>
          <Text style={styles.rowSubtitle}>
            Get notified about upcoming task deadlines
          </Text>
        </View>
        <Switch
          value={notificationsEnabled}
          onValueChange={toggleNotifications}
          trackColor={{ false: '#ccc', true: '#007AFF' }}
        />
      </View>
    </View>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    elevation: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#777',
    marginTop: 4,
  },
});