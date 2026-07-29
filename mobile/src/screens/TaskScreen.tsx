import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Task {
  _id: string;
  title: string;
  description: string;
  priority: string;
  deadline: string;
  completed: boolean;
}

const PRIORITIES = ['Low', 'Medium', 'High'];

// Numeric weight used by the smart-sort algorithm below.
// Higher priority = higher weight = more influence on the final score.
const PRIORITY_WEIGHT: Record<string, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

type StatusFilter = 'All' | 'Pending' | 'Completed';
type PriorityFilter = 'All' | 'Low' | 'Medium' | 'High';

const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'high':
      return '#dc3545';
    case 'medium':
      return '#ffc107';
    case 'low':
      return '#28a745';
    default:
      return '#6c757d';
  }
};

/**
 * Smart sort score for a task, combining priority and deadline urgency
 * into a single number so both factors influence ordering together
 * (rather than sorting by one field and only tie-breaking with the other).
 *
 * How it works:
 *  - Each priority level contributes a large base score (weight * 1000),
 *    so priority is the dominant factor overall.
 *  - Within the same priority, we subtract "days until deadline" — so a
 *    task with a closer (or overdue/negative) deadline gets a HIGHER
 *    score than one with a distant deadline, and naturally sorts first.
 *  - Overdue tasks (daysLeft is negative) get an even bigger boost,
 *    since subtracting a negative number increases the score further —
 *    this pushes overdue tasks to the very top within their priority band.
 *
 * Example: a High priority task due tomorrow will outrank a High priority
 * task due next month, but will still outrank a Medium priority task
 * even if the Medium one is due sooner — priority dominates, deadline
 * breaks ties within the same priority level.
 */
const getTaskScore = (task: Task): number => {
  const priorityWeight = PRIORITY_WEIGHT[task.priority] ?? 1;
  const deadlineDate = new Date(task.deadline);
  const now = new Date();
  const daysLeft = Math.floor(
    (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  return priorityWeight * 1000 - daysLeft;
};

const TaskScreen = () => {
  const { logout } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('All');

  const formatDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const fetchTasks = async () => {
    try {
      const res = await API.get('/tasks');
      setTasks(res.data.tasks || res.data);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Failed to fetch tasks',
      );
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const addTask = async () => {
    if (!title.trim() || !deadline) {
      Alert.alert('Error', 'Title and Deadline are required');
      return;
    }

    try {
      await API.post('/tasks', {
        title,
        description,
        priority,
        dateTime: new Date().toISOString(),
        deadline: formatDate(deadline),
      });

      setTitle('');
      setDescription('');
      setPriority('Medium');
      setDeadline(null);

      fetchTasks();
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Failed to add task',
      );
    }
  };

  const toggleComplete = async (id: string, currentStatus: boolean) => {
    try {
      await API.patch(`/tasks/${id}`, {
        completed: !currentStatus,
      });
      fetchTasks();
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Failed to update task',
      );
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await API.delete(`/tasks/${id}`);
      fetchTasks();
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Failed to delete task',
      );
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  // Applies status + priority filters, then sorts using the smart
  // priority/deadline score. Completed tasks are always pushed to the
  // bottom (regardless of score) so active work stays on top.
  // Recomputed only when tasks or filter selections change.
  const visibleTasks = useMemo(() => {
    let filtered = tasks;

    if (statusFilter === 'Pending') {
      filtered = filtered.filter(t => !t.completed);
    } else if (statusFilter === 'Completed') {
      filtered = filtered.filter(t => t.completed);
    }

    if (priorityFilter !== 'All') {
      filtered = filtered.filter(t => t.priority === priorityFilter);
    }

    return [...filtered].sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      return getTaskScore(b) - getTaskScore(a);
    });
  }, [tasks, statusFilter, priorityFilter]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>My Tasks</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        placeholder="Task Title"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />

      <TextInput
        placeholder="Task Description"
        value={description}
        onChangeText={setDescription}
        style={styles.input}
        multiline
      />

      <Text style={styles.label}>Priority</Text>
      <View style={styles.priorityPicker}>
        {PRIORITIES.map(p => (
          <TouchableOpacity
            key={p}
            style={[
              styles.priorityOption,
              { borderColor: getPriorityColor(p) },
              priority === p && { backgroundColor: getPriorityColor(p) },
            ]}
            onPress={() => setPriority(p)}>
            <Text
              style={[
                styles.priorityOptionText,
                priority === p && { color: '#fff' },
              ]}>
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Deadline</Text>
      <TouchableOpacity
        style={styles.dateInput}
        onPress={() => setShowDatePicker(true)}>
        <Text style={deadline ? styles.dateText : styles.datePlaceholder}>
          {deadline ? formatDate(deadline) : 'Select a deadline'}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={deadline || new Date()}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (event.type === 'set' && selectedDate) {
              setDeadline(selectedDate);
            }
          }}
        />
      )}

      <TouchableOpacity style={styles.addBtn} onPress={addTask}>
        <Text style={styles.btnText}>Add Task</Text>
      </TouchableOpacity>

      {/* Status filter: All / Pending / Completed */}
      <View style={styles.filterRow}>
        {(['All', 'Pending', 'Completed'] as StatusFilter[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterChip,
              statusFilter === f && styles.filterChipActive,
            ]}
            onPress={() => setStatusFilter(f)}>
            <Text
              style={[
                styles.filterChipText,
                statusFilter === f && styles.filterChipTextActive,
              ]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Priority filter: All / Low / Medium / High */}
      <View style={styles.filterRow}>
        {(['All', 'Low', 'Medium', 'High'] as PriorityFilter[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterChip,
              priorityFilter === f && {
                backgroundColor:
                  f === 'All' ? '#333' : getPriorityColor(f),
                borderColor:
                  f === 'All' ? '#333' : getPriorityColor(f),
              },
            ]}
            onPress={() => setPriorityFilter(f)}>
            <Text
              style={[
                styles.filterChipText,
                priorityFilter === f && styles.filterChipTextActive,
              ]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sortNote}>
        Sorted by priority + closest deadline
      </Text>

      <FlatList
        data={visibleTasks}
        keyExtractor={item => item._id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              {
                borderLeftWidth: 5,
                borderLeftColor: getPriorityColor(item.priority),
              },
            ]}>
            <Text
              style={[
                styles.taskTitle,
                item.completed && styles.completed,
              ]}>
              {item.title}
            </Text>

            <Text style={styles.description}>{item.description}</Text>

            <View style={styles.priorityBadge}>
              <View
                style={[
                  styles.priorityDot,
                  { backgroundColor: getPriorityColor(item.priority) },
                ]}
              />
              <Text
                style={[
                  styles.priorityText,
                  { color: getPriorityColor(item.priority) },
                ]}>
                {item.priority}
              </Text>
            </View>

            <Text style={styles.info}>
              Deadline: {item.deadline?.toString().slice(0, 10)}
            </Text>

            <View style={styles.row}>
              <TouchableOpacity
                style={styles.completeBtn}
                onPress={() => toggleComplete(item._id, item.completed)}>
                <Text style={styles.btnText}>
                  {item.completed ? 'Undo' : 'Complete'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deleteTask(item._id)}>
                <Text style={styles.btnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No Tasks Available</Text>
        }
      />
    </View>
  );
};

export default TaskScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  logoutBtn: {
    backgroundColor: '#dc3545',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  dateInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  dateText: {
    color: '#000',
  },
  datePlaceholder: {
    color: '#999',
  },
  priorityPicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priorityOption: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  priorityOptionText: {
    fontWeight: '600',
    color: '#555',
  },
  addBtn: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#333',
    borderColor: '#333',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  sortNote: {
    fontSize: 11,
    color: '#999',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  description: {
    marginTop: 5,
    color: '#555',
  },
  info: {
    marginTop: 5,
    color: '#444',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  priorityText: {
    fontWeight: '600',
    fontSize: 14,
  },
  completed: {
    textDecorationLine: 'line-through',
    color: 'green',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  completeBtn: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 8,
    width: '47%',
    alignItems: 'center',
  },
  deleteBtn: {
    backgroundColor: '#dc3545',
    padding: 10,
    borderRadius: 8,
    width: '47%',
    alignItems: 'center',
  },
  empty: {
    textAlign: 'center',
    marginTop: 50,
    color: 'gray',
    fontSize: 16,
  },
});