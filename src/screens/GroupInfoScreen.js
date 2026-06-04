import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { authService } from '../services/authService';
import { chatService } from '../services/chatService';
import { FIREBASE_CONFIG } from '../services/firebaseConfig';

const DB = FIREBASE_CONFIG.databaseURL;
const getToken = () => authService.getUser()?.idToken || '';

export default function GroupInfoScreen({ route, navigation }) {
  const { chatId, chatName } = route.params;
  const [chat, setChat] = useState(null);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const me = authService.getUser();

  useEffect(() => {
    navigation.setOptions({ title: chatName + ' Info' });
    loadChat();
  }, []);

  const loadChat = async () => {
    const token = getToken();
    const res = await fetch(`${DB}/chats/${chatId}.json?auth=${token}`);
    const data = await res.json();
    setChat(data);
    setLoading(false);
  };

  const searchUsers = async (text) => {
    setSearch(text);
    if (text.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const token = getToken();
      const url = `${DB}/users.json?auth=${token}&orderBy="displayName"&startAt="${text}"&endAt="${text}\uf8ff"`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && typeof data === 'object') {
        const existing = Object.keys(chat?.members || {});
        setSearchResults(Object.values(data).filter(u => !existing.includes(u.uid)));
      } else setSearchResults([]);
    } catch (e) { setSearchResults([]); }
    setSearching(false);
  };

  const addMember = async (user) => {
    try {
      const token = getToken();
      await fetch(`${DB}/chats/${chatId}/members/${user.uid}.json?auth=${token}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(true),
      });
      await fetch(`${DB}/chats/${chatId}/memberNames/${user.uid}.json?auth=${token}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user.displayName),
      });
      await fetch(`${DB}/userChats/${user.uid}/${chatId}.json?auth=${token}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(true),
      });
      Alert.alert('✅', `${user.displayName} added!`);
      setSearch('');
      setSearchResults([]);
      loadChat();
    } catch (e) { Alert.alert('Error', 'Could not add member'); }
  };

  const removeMember = (uid, name) => {
    Alert.alert('Remove Member', `Remove ${name} from the group?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          const token = getToken();
          await fetch(`${DB}/chats/${chatId}/members/${uid}.json?auth=${token}`, { method: 'DELETE' });
          await fetch(`${DB}/userChats/${uid}/${chatId}.json?auth=${token}`, { method: 'DELETE' });
          loadChat();
        }
      }
    ]);
  };

  const deleteGroup = () => {
    Alert.alert('Delete Group', 'This will delete the group for everyone. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const token = getToken();
          const members = Object.keys(chat?.members || {});
          for (const uid of members) {
            await fetch(`${DB}/userChats/${uid}/${chatId}.json?auth=${token}`, { method: 'DELETE' });
          }
          await fetch(`${DB}/chats/${chatId}.json?auth=${token}`, { method: 'DELETE' });
          await fetch(`${DB}/messages/${chatId}.json?auth=${token}`, { method: 'DELETE' });
          navigation.navigate('Chats');
        }
      }
    ]);
  };

  const leaveGroup = () => {
    Alert.alert('Leave Group', 'Leave this group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive', onPress: async () => {
          const token = getToken();
          await fetch(`${DB}/chats/${chatId}/members/${me.uid}.json?auth=${token}`, { method: 'DELETE' });
          await fetch(`${DB}/userChats/${me.uid}/${chatId}.json?auth=${token}`, { method: 'DELETE' });
          navigation.navigate('Chats');
        }
      }
    ]);
  };

  if (loading) return <ActivityIndicator color="#00c853" style={{ marginTop: 40 }} />;

  const members = Object.entries(chat?.members || {});

  return (
    <View style={s.container}>
      {/* Group header */}
      <View style={s.header}>
        <View style={s.groupAvatar}><Text style={s.groupAvatarTxt}>👥</Text></View>
        <Text style={s.groupName}>{chatName}</Text>
        <Text style={s.memberCount}>{members.length} members</Text>
      </View>

      {/* Add member search */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>ADD MEMBER</Text>
        <TextInput
          style={s.search}
          placeholder="Search by name..."
          placeholderTextColor="#555"
          value={search}
          onChangeText={searchUsers}
        />
        {searching && <ActivityIndicator color="#00c853" />}
        {searchResults.map(user => (
          <TouchableOpacity key={user.uid} style={s.userRow} onPress={() => addMember(user)}>
            <View style={s.avatar}><Text style={s.avatarTxt}>{user.displayName[0].toUpperCase()}</Text></View>
            <Text style={s.userName}>{user.displayName}</Text>
            <Text style={s.addBtn}>+ Add</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Members list */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>MEMBERS</Text>
        <View style={s.card}>
          {members.map(([uid], index) => {
            const name = chat.memberNames?.[uid] || 'Unknown';
            const isMe = uid === me.uid;
            return (
              <View key={uid} style={[s.memberRow, index > 0 && s.borderTop]}>
                <View style={s.avatar}><Text style={s.avatarTxt}>{name[0].toUpperCase()}</Text></View>
                <Text style={s.userName}>{name}{isMe ? ' (You)' : ''}</Text>
                {!isMe && (
                  <TouchableOpacity onPress={() => removeMember(uid, name)}>
                    <Text style={s.removeBtn}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Actions */}
      <TouchableOpacity style={s.leaveBtn} onPress={leaveGroup}>
        <Text style={s.leaveBtnTxt}>🚪 Leave Group</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.deleteBtn} onPress={deleteGroup}>
        <Text style={s.deleteBtnTxt}>🗑️ Delete Group</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a', padding: 16 },
  header: { alignItems: 'center', paddingVertical: 20 },
  groupAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#2979ff', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  groupAvatarTxt: { fontSize: 36 },
  groupName: { fontSize: 22, color: '#fff', fontWeight: 'bold' },
  memberCount: { fontSize: 14, color: '#ffffff55', marginTop: 4 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, color: '#ffffff44', fontWeight: '700', marginBottom: 8, letterSpacing: 1 },
  search: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: 12, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 8 },
  card: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 6 },
  borderTop: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#00c853', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarTxt: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  userName: { flex: 1, fontSize: 15, color: '#fff', fontWeight: '600' },
  addBtn: { color: '#00c853', fontWeight: 'bold', fontSize: 14 },
  removeBtn: { color: '#ff4444', fontSize: 13 },
  leaveBtn: { backgroundColor: 'rgba(255,165,0,0.15)', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,165,0,0.3)' },
  leaveBtnTxt: { color: '#FFA500', fontWeight: 'bold', fontSize: 15 },
  deleteBtn: { backgroundColor: 'rgba(255,68,68,0.15)', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,68,68,0.3)' },
  deleteBtnTxt: { color: '#ff4444', fontWeight: 'bold', fontSize: 15 },
});
