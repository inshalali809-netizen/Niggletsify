import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { authService } from '../services/authService';
import { chatService } from '../services/chatService';
import moment from 'moment';

export default function ChatScreen({ route, navigation }) {
  const { chatId, chatName } = route.params;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [uid, setUid] = useState('');
  const listRef = useRef();

  useEffect(() => {
    navigation.setOptions({ title: chatName });
    authService.currentUser().then(u => { if (u) setUid(u.uid); });
  }, []);

  useEffect(() => {
    const unsub = chatService.listenToMessages(chatId, msgs => {
      setMessages(msgs);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return unsub;
  }, [chatId]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    await chatService.sendMessage(chatId, text);
  };

  const renderMsg = ({ item }) => {
    const isMe = item.senderId === uid;
    return (
      <View style={[s.msgWrap, isMe ? s.right : s.left]}>
        {!isMe && <Text style={s.senderName}>{item.senderName}</Text>}
        <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
          <Text style={s.msgText}>{item.text}</Text>
        </View>
        <Text style={[s.time, isMe && { textAlign: 'right' }]}>
          {moment(item.timestamp).format('h:mm A')}{isMe ? ' ✓✓' : ''}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderMsg}
        contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <Text style={s.empty}>No messages yet. Say hi! 👋</Text>
        }
      />

      <View style={s.bar}>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          placeholderTextColor="#555"
          multiline
          returnKeyType="send"
          onSubmitEditing={send}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[s.sendBtn, !input.trim() && s.sendDisabled]}
          onPress={send}
          disabled={!input.trim()}>
          <Text style={s.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  msgWrap: { marginBottom: 12 },
  left: { alignItems: 'flex-start' },
  right: { alignItems: 'flex-end' },
  senderName: { fontSize: 11, color: '#00c853', fontWeight: '700', marginBottom: 3, marginLeft: 4 },
  bubble: { maxWidth: '75%', borderRadius: 18, padding: 12, elevation: 2 },
  bubbleMe: { backgroundColor: '#00c853', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: 'rgba(255,255,255,0.09)', borderBottomLeftRadius: 4 },
  msgText: { color: '#fff', fontSize: 15, lineHeight: 22 },
  time: { fontSize: 10, color: '#ffffff44', marginTop: 3, marginHorizontal: 4 },
  empty: { textAlign: 'center', color: '#555', marginTop: 40, fontSize: 15 },
  bar: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', gap: 8,
  },
  input: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    color: '#fff', fontSize: 15, maxHeight: 100,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#00c853', alignItems: 'center', justifyContent: 'center',
  },
  sendDisabled: { backgroundColor: '#333' },
  sendIcon: { color: '#000', fontWeight: 'bold', fontSize: 18 },
});
