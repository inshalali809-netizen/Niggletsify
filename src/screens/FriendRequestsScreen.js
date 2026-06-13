import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { friendService } from '../services/friendService';
import { chatService } from '../services/chatService';
import moment from 'moment';

export default function FriendRequestsScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const reqs = await friendService.getIncomingRequests();
    setRequests(reqs);
    setLoading(false);
  };

  const accept = async (req) => {
    setProcessing(req.senderId);
    await friendService.acceptRequest(req.senderId, req.senderName);
    const chatId = await chatService.createDirectChat(req.senderId, req.senderName);
    setRequests(r => r.filter(x => x.senderId !== req.senderId));
    setProcessing(null);
    navigation.navigate('Chat', { chatId, chatName: req.senderName, isGroup: false });
  };

  const reject = async (req) => {
    setProcessing(req.senderId);
    await friendService.rejectRequest(req.senderId);
    setRequests(r => r.filter(x => x.senderId !== req.senderId));
    setProcessing(null);
  };

  return (
    <View style={s.container}>
      {loading ? (
        <ActivityIndicator color="#00c853" style={{ marginTop: 40 }} />
      ) : requests.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>👋</Text>
          <Text style={s.emptyTxt}>No friend requests</Text>
          <Text style={s.emptySub}>When someone sends you a request, it will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={item => item.senderId}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.avatar}>
                <Text style={s.avatarTxt}>{(item.senderName || '?')[0].toUpperCase()}</Text>
              </View>
              <View style={s.info}>
                <Text style={s.name}>{item.senderName}</Text>
                <Text style={s.time}>{moment(item.timestamp).fromNow()}</Text>
              </View>
              {processing === item.senderId ? (
                <ActivityIndicator color="#00c853" />
              ) : (
                <View style={s.btns}>
                  <TouchableOpacity style={s.acceptBtn} onPress={() => accept(item)}>
                    <Text style={s.acceptTxt}>✓ Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.rejectBtn} onPress={() => reject(item)}>
                    <Text style={s.rejectTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyIcon: { fontSize: 50, marginBottom: 16 },
  emptyTxt: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
  emptySub: { fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#00c853', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarTxt: { color: '#000', fontWeight: 'bold', fontSize: 22 },
  info: { flex: 1 },
  name: { fontSize: 16, color: '#fff', fontWeight: '700' },
  time: { fontSize: 12, color: '#ffffff44', marginTop: 2 },
  btns: { flexDirection: 'row', gap: 8 },
  acceptBtn: { backgroundColor: '#00c853', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  acceptTxt: { color: '#000', fontWeight: 'bold', fontSize: 13 },
  rejectBtn: { backgroundColor: 'rgba(255,68,68,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,68,68,0.4)' },
  rejectTxt: { color: '#ff4444', fontWeight: 'bold', fontSize: 13 },
});
