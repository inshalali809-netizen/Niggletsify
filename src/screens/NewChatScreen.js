import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { authService } from '../services/authService';
import { chatService } from '../services/chatService';
import { FIREBASE_CONFIG } from '../services/firebaseConfig';

const DB = FIREBASE_CONFIG.databaseURL;

export default function NewChatScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [mode, setMode] = useState('dm'); // 'dm' | 'group'
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  const searchUsers = async (text) => {
    setSearch(text);
    if (text.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const token = authService.getUser()?.idToken || '';
      const me = authService.getUser()?.uid;
      // Search by displayName prefix
      const url = `${DB}/users.json?auth=${token}&orderBy="displayName"&startAt="${text}"&endAt="${text}\uf8ff"`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && typeof data === 'object') {
        const users = Object.values(data).filter(u => u.uid !== me);
        setResults(users);
      } else {
        setResults([]);
      }
    } catch (e) { setResults([]); }
    setSearching(false);
  };

  const startDM = async (user) => {
    try {
      const chatId = await chatService.createDirectChat(user.uid, user.displayName);
      navigation.replace('Chat', { chatId, chatName: user.displayName });
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const toggleSelect = (user) => {
    setSelected(prev =>
      prev.find(u => u.uid === user.uid)
        ? prev.filter(u => u.uid !== user.uid)
        : [...prev, user]
    );
  };

  const createGroup = async () => {
    if (!groupName.trim()) { Alert.alert('Error', 'Enter a group name'); return; }
    if (selected.length < 1) { Alert.alert('Error', 'Select at least 1 person'); return; }
    setCreatingGroup(true);
    try {
      const chatId = await chatService.createGroupChat(groupName.trim(), selected.map(u => u.uid), selected);
      navigation.replace('Chat', { chatId, chatName: groupName.trim() });
    } catch (e) { Alert.alert('Error', e.message); }
    setCreatingGroup(false);
  };

  return (
    <View style={s.container}>
      {/* Mode toggle */}
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, mode === 'dm' && s.tabActive]} onPress={() => { setMode('dm'); setSelected([]); }}>
          <Text style={[s.tabTxt, mode === 'dm' && s.tabTxtActive]}>💬 Direct Message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, mode === 'group' && s.tabActive]} onPress={() => { setMode('group'); }}>
          <Text style={[s.tabTxt, mode === 'group' && s.tabTxtActive]}>👥 New Group</Text>
        </TouchableOpacity>
      </View>

      {/* Group name input */}
      {mode === 'group' && (
        <TextInput
          style={s.groupInput}
          placeholder="Group name..."
          placeholderTextColor="#555"
          value={groupName}
          onChangeText={setGroupName}
        />
      )}

      {/* Search */}
      <TextInput
        style={s.search}
        placeholder="Search by name (type at least 2 letters)..."
        placeholderTextColor="#555"
        value={search}
        onChangeText={searchUsers}
        autoFocus
      />

      {/* Selected chips for group */}
      {mode === 'group' && selected.length > 0 && (
        <View style={s.chips}>
          {selected.map(u => (
            <TouchableOpacity key={u.uid} style={s.chip} onPress={() => toggleSelect(u)}>
              <Text style={s.chipTxt}>{u.displayName} ✕</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Empty state */}
      {search.length < 2 && (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🔍</Text>
          <Text style={s.emptyTxt}>Type a name to search</Text>
          <Text style={s.emptySub}>At least 2 characters needed</Text>
        </View>
      )}

      {/* Loading */}
      {searching && <ActivityIndicator color="#00c853" style={{ marginTop: 20 }} />}

      {/* Results */}
      {!searching && search.length >= 2 && (
        <FlatList
          data={results}
          keyExtractor={item => item.uid}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyTxt}>No users found for "{search}"</Text>
              <Text style={s.emptySub}>Make sure they spelled their name correctly</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isSelected = selected.find(u => u.uid === item.uid);
            return (
              <TouchableOpacity
                style={[s.row, isSelected && s.rowSelected]}
                onPress={() => mode === 'dm' ? startDM(item) : toggleSelect(item)}>
                <View style={[s.avatar, isSelected && s.avatarSelected]}>
                  <Text style={s.avatarTxt}>{(item.displayName || '?')[0].toUpperCase()}</Text>
                </View>
                <View style={s.info}>
                  <Text style={s.name}>{item.displayName}</Text>
                  <Text style={s.email}>{item.email}</Text>
                </View>
                {mode === 'group' && (
                  <View style={[s.check, isSelected && s.checkSelected]}>
                    {isSelected && <Text style={s.checkTxt}>✓</Text>}
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Create group button */}
      {mode === 'group' && selected.length > 0 && (
        <TouchableOpacity style={s.createBtn} onPress={createGroup} disabled={creatingGroup}>
          <Text style={s.createBtnTxt}>
            {creatingGroup ? 'Creating...' : `Create Group (${selected.length} people)`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  tabs: { flexDirection: 'row', padding: 12, gap: 8 },
  tab: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  tabActive: { backgroundColor: 'rgba(0,200,83,0.15)', borderColor: '#00c853' },
  tabTxt: { color: '#ffffff66', fontWeight: '600', fontSize: 13 },
  tabTxtActive: { color: '#00c853' },
  groupInput: { marginHorizontal: 12, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 14, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: 'rgba(0,200,83,0.3)' },
  search: { margin: 12, marginTop: 0, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 14, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  chip: { backgroundColor: 'rgba(0,200,83,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#00c853' },
  chipTxt: { color: '#00c853', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 50, padding: 20 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTxt: { fontSize: 16, color: '#fff', fontWeight: '600', textAlign: 'center' },
  emptySub: { fontSize: 13, color: '#ffffff44', marginTop: 6, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  rowSelected: { backgroundColor: 'rgba(0,200,83,0.08)' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#00c853', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarSelected: { backgroundColor: '#00a040' },
  avatarTxt: { color: '#000', fontWeight: 'bold', fontSize: 20 },
  info: { flex: 1 },
  name: { fontSize: 16, color: '#fff', fontWeight: '700' },
  email: { fontSize: 13, color: '#ffffff55' },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#ffffff33', alignItems: 'center', justifyContent: 'center' },
  checkSelected: { backgroundColor: '#00c853', borderColor: '#00c853' },
  checkTxt: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  createBtn: { margin: 16, backgroundColor: '#00c853', borderRadius: 16, padding: 18, alignItems: 'center' },
  createBtnTxt: { color: '#000', fontWeight: 'bold', fontSize: 16 },
});
