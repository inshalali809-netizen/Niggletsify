import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, Alert, ScrollView, Switch,
} from 'react-native';
import { authService } from '../services/authService';
import { FIREBASE_CONFIG } from '../services/firebaseConfig';

const DB = FIREBASE_CONFIG.databaseURL;

export default function ProfileScreen({ onLogout }) {
  const user = authService.getUser();
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const saveDisplayName = async () => {
    if (!newName.trim()) { Alert.alert('Error', 'Name cannot be empty'); return; }
    setSaving(true);
    try {
      await fetch(`${DB}/users/${user.uid}/displayName.json?auth=${user.idToken}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newName.trim()),
      });
      authService.updateDisplayName(newName.trim());
      setEditing(false);
      Alert.alert('✅', 'Name updated!');
    } catch (e) {
      Alert.alert('Error', 'Could not update name');
    }
    setSaving(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => { authService.logout(); onLogout(); } },
    ]);
  };

  const initial = (user?.displayName || '?')[0].toUpperCase();

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Avatar */}
      <View style={s.avatarWrap}>
        <View style={s.avatar}>
          <Text style={s.avatarTxt}>{initial}</Text>
        </View>
        <Text style={s.name}>{user?.displayName}</Text>
        <Text style={s.email}>{user?.email}</Text>
      </View>

      {/* Edit Name */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>PROFILE</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.label}>Display Name</Text>
            {editing ? (
              <View style={s.editRow}>
                <TextInput
                  style={s.input}
                  value={newName}
                  onChangeText={setNewName}
                  autoFocus
                  placeholderTextColor="#555"
                />
                <TouchableOpacity style={s.saveBtn} onPress={saveDisplayName} disabled={saving}>
                  <Text style={s.saveBtnTxt}>{saving ? '...' : 'Save'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setEditing(false)}>
                  <Text style={s.cancelBtnTxt}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditing(true)}>
                <Text style={s.value}>{user?.displayName} ✏️</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={[s.row, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }]}>
            <Text style={s.label}>Email</Text>
            <Text style={s.value}>{user?.email}</Text>
          </View>
        </View>
      </View>

      {/* Settings */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>SETTINGS</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.label}>Notifications</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#333', true: '#00c853' }}
              thumbColor={notifications ? '#fff' : '#888'}
            />
          </View>
        </View>
      </View>

      {/* App Info */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>ABOUT</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.label}>App</Text>
            <Text style={s.value}>Niggletsify 🔥</Text>
          </View>
          <View style={[s.row, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }]}>
            <Text style={s.label}>Version</Text>
            <Text style={s.value}>1.0.0</Text>
          </View>
          <View style={[s.row, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }]}>
            <Text style={s.label}>Messages stored in</Text>
            <Text style={s.value}>Firebase (Cloud) ☁️</Text>
          </View>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Text style={s.logoutTxt}>🚪 Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  content: { padding: 20, paddingBottom: 40 },
  avatarWrap: { alignItems: 'center', paddingVertical: 30 },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#00c853', alignItems: 'center',
    justifyContent: 'center', marginBottom: 14,
    shadowColor: '#00c853', shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  avatarTxt: { fontSize: 40, color: '#000', fontWeight: 'bold' },
  name: { fontSize: 22, color: '#fff', fontWeight: 'bold', marginBottom: 4 },
  email: { fontSize: 14, color: '#ffffff66' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 11, color: '#ffffff44', fontWeight: '700', marginBottom: 8, letterSpacing: 1 },
  card: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  label: { fontSize: 15, color: '#fff' },
  value: { fontSize: 15, color: '#ffffff88' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 8, color: '#fff', fontSize: 15, minWidth: 120 },
  saveBtn: { backgroundColor: '#00c853', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  saveBtnTxt: { color: '#000', fontWeight: 'bold', fontSize: 13 },
  cancelBtn: { padding: 8 },
  cancelBtnTxt: { color: '#ff4444', fontSize: 16 },
  logoutBtn: {
    backgroundColor: 'rgba(255,68,68,0.15)', borderRadius: 16,
    padding: 18, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,68,68,0.3)',
  },
  logoutTxt: { color: '#ff4444', fontWeight: 'bold', fontSize: 16 },
});
