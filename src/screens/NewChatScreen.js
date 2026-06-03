import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { chatService } from '../services/chatService';

export default function NewChatScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chatService.getUsers().then(u => {
      setUsers(u); setFiltered(u); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!search) { setFiltered(users); return; }
    setFiltered(users.filter(u =>
      u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    ));
  }, [search, users]);

  const startChat = async (user) => {
    try {
      const chatId = await chatService.createDirectChat(user.uid, user.displayName);
      navigation.replace('Chat', { chatId, chatName: user.displayName });
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={s.container}>
      <TextInput
        style={s.search}
        placeholder="Search by name or email..."
        placeholderTextColor="#555"
        value={search}
        onChangeText={setSearch}
      />
      {loading ? (
        <ActivityIndicator color="#00c853" style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No users found</Text>
          <Text style={s.emptySub}>Ask friends to register on Niggletsify!</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.uid}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.row} onPress={() => startChat(item)}>
              <View style={s.avatar}>
                <Text style={s.avatarTxt}>{(item.displayName || '?')[0].toUpperCase()}</Text>
              </View>
              <View style={s.info}>
                <Text style={s.name}>{item.displayName}</Text>
                <Text style={s.email}>{item.email}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  search: {
    margin: 16, backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14, padding: 14, color: '#fff', fontSize: 15,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#00c853', alignItems: 'center',
    justifyContent: 'center', marginRight: 14,
  },
  avatarTxt: { color: '#000', fontWeight: 'bold', fontSize: 20 },
  info: { flex: 1 },
  name: { fontSize: 16, color: '#fff', fontWeight: '700' },
  email: { fontSize: 13, color: '#ffffff55' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyTitle: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
  emptySub: { fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center' },
});
