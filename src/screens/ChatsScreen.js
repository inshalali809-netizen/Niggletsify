import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { authService } from '../services/authService';
import { chatService } from '../services/chatService';
import moment from 'moment';

export default function ChatsScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState('');

  useEffect(() => {
    authService.currentUser().then(u => { if (u) setUid(u.uid); });
  }, []);

  useEffect(() => {
    const unsub = chatService.listenToChats(data => {
      setChats(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const getName = useCallback((chat) => chatService.getChatName(chat, uid), [uid]);

  const getInitial = (name) => (name || '?')[0].toUpperCase();

  const renderItem = ({ item }) => (
    <TouchableOpacity style={s.row}
      onPress={() => navigation.navigate('Chat', { chatId: item.id, chatName: getName(item) })}>
      <View style={[s.avatar, { backgroundColor: item.type === 'group' ? '#2979ff' : '#00c853' }]}>
        <Text style={s.avatarTxt}>{item.type === 'group' ? '👥' : getInitial(getName(item))}</Text>
      </View>
      <View style={s.info}>
        <View style={s.row2}>
          <Text style={s.name}>{getName(item)}</Text>
          <Text style={s.time}>
            {item.lastMessage?.timestamp ? moment(item.lastMessage.timestamp).fromNow() : ''}
          </Text>
        </View>
        <Text style={s.last} numberOfLines={1}>
          {item.lastMessage?.text || 'No messages yet'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Niggletsify 🔥</Text>
        <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('NewChat')}>
          <Text style={{ fontSize: 22 }}>✏️</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#00c853" style={{ marginTop: 40 }} />
      ) : chats.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No chats yet!</Text>
          <Text style={s.emptySub}>Tap ✏️ to message someone</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={false} tintColor="#00c853" />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  fab: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#00c853',
    alignItems: 'center', justifyContent: 'center',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  avatarTxt: { fontSize: 22, color: '#fff', fontWeight: 'bold' },
  info: { flex: 1 },
  row2: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontSize: 16, fontWeight: '700', color: '#fff' },
  time: { fontSize: 11, color: '#ffffff44' },
  last: { fontSize: 13, color: '#ffffff55', marginTop: 3 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  emptySub: { fontSize: 14, color: '#666', marginTop: 8 },
});
