import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import API from '../services/api';

interface Task {
  _id: string;
  completed: boolean;
}

interface UserInfo {
  name: string;
  email: string;
}

const ProfileScreen = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [total, setTotal] = useState(0);
  const [completed, setCompleted] = useState(0);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const [userRes, tasksRes] = await Promise.all([
        API.get('/auth/me'),
        API.get('/tasks'),
      ]);

      setUser({ name: userRes.data.name, email: userRes.data.email });

      const tasks: Task[] = tasksRes.data.tasks || tasksRes.data;
      setTotal(tasks.length);
      setCompleted(tasks.filter(t => t.completed).length);
    } catch (error) {
      // Silent fail — screen just shows blanks/0s if this errors
    } finally {
      setLoading(false);
    }
  };

  // Refresh every time the Profile tab comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, []),
  );

  const pending = total - completed;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const initials = user?.name
    ? user.name
        .split(' ')
        .map(part => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '';

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Profile</Text>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={styles.identityCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials || '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>
                {user?.name || 'Unknown User'}
              </Text>
              <Text style={styles.userEmail}>{user?.email || '—'}</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{total}</Text>
              <Text style={styles.statLabel}>Total Tasks</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#28a745' }]}>
                {completed}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#ffc107' }]}>
                {pending}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#007AFF' }]}>
                {completionRate}%
              </Text>
              <Text style={styles.statLabel}>Completion Rate</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

export default ProfileScreen;

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
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '47%',
    marginBottom: 15,
    alignItems: 'center',
    elevation: 2,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#222',
  },
  statLabel: {
    marginTop: 6,
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
});