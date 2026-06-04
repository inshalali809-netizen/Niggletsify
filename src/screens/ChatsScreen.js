import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { authService } from '../services/authService';
import { chatService } from '../services/chatService';
import moment from 'moment';

export default function ChatsScreen({ navigation, onLogout }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState('');
  const lastReadRef = useRef({});

  useEffect(() => {
    const user = authService.getUser();
    if (user) setUid(user.uid);
  }, []);

  useEffect(() => {
    const unsub = chatService.listenToChats(data => {
      setChats(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const getName = useCallback((chat) => chatService.getChatName(chat, uid), [uid]);
  const getUnread = (chat) => {
    if (!chat.lastMessage?.timestamp) return false;
    const lastRead = lastReadRef.current[chat.id] || 0;
    return chat.lastMessage.senderId !== uid && chat.lastMessage.timestamp > lastRead;
  };

  const renderItem = ({ item }) => {
    const unread = getUnread(item);
    return (
      <TouchableOpacity style={s.row} onPress={() => {
        lastReadRef.current[item.id] = Date.now();
        navigation.navigate('Chat', { chatId: item.id, chatName: getName(item), isGroup: item.type === 'group' });
      }}>
        <View style={[s.avatar, { backgroundColor: item.type === 'group' ? '#2979ff' : '#00c853' }]}>
          <Text style={s.avatarTxt}>{item.type === 'group' ? '👥' : (getName(item) || '?')[0].toUpperCase()}</Text>
        </View>
        <View style={s.info}>
          <View style={s.rowTop}>
            <Text style={[s.name, unread && s.nameUnread]}>{getName(item)}</Text>
            <Text style={[s.time, unread && s.timeUnread]}>
              {item.lastMessage?.timestamp ? moment(item.lastMessage.timestamp).fromNow() : ''}
            </Text>
          </View>
          <View style={s.rowBottom}>
            <Text style={[s.last, unread && s.lastUnread]} numberOfLines={1}>
              {item.lastMessage?.senderId === uid ? 'You: ' : ''}{item.lastMessage?.text || 'No messages yet'}
            </Text>
            {unread && <View style={s.unreadDot} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <View style={s.profileBtn}>
            <Text style={s.profileTxt}>{(authService.getUser()?.displayName || '?')[0].toUpperCase()}</Text>
          </View>
        </TouchableOpacity>
        <Text style={s.title}>Niggletsify 🔥</Text>
        <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('NewChat')}>
          <Text style={{ fontSize: 20 }}>✏️</Text>
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
        <FlatList data={chats} keyExtractor={item => item.id} renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={false} tintColor="#00c853" />} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  profileBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#00c853', alignItems: 'center', justifyContent: 'center' },
  profileTxt: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  fab: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,200,83,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,200,83,0.3)' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarTxt: { fontSize: 22, color: '#fff', fontWeight: 'bold' },
  info: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, color: '#ffffffcc', fontWeight: '600' },
  nameUnread: { color: '#fff', fontWeight: '800' },
  time: { fontSize: 11, color: '#ffffff44' },
  timeUnread: { color: '#00c853', fontWeight: '700' },
  last: { fontSize: 13, color: '#ffffff44', flex: 1 },
  lastUnread: { color: '#ffffffaa', fontWeight: '600' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00c853', marginLeft: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  emptySub: { fontSize: 14, color: '#666', marginTop: 8 },
});
