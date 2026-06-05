import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Image,
  ActivityIndicator, Alert, PermissionsAndroid,
} from 'react-native';
import { authService } from '../services/authService';
import { chatService } from '../services/chatService';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import moment from 'moment';

const audioRecorderPlayer = new AudioRecorderPlayer();

export default function ChatScreen({ route, navigation }) {
  const { chatId, chatName, isGroup } = route.params;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [playingId, setPlayingId] = useState(null);
  const [sending, setSending] = useState(false);
  const uid = authService.getUser()?.uid || '';
  const listRef = useRef();

  useEffect(() => {
    navigation.setOptions({
      title: chatName,
      headerRight: isGroup ? () => (
        <TouchableOpacity onPress={() => navigation.navigate('GroupInfo', { chatId, chatName })} style={{ marginRight: 16 }}>
          <Text style={{ fontSize: 22 }}>ℹ️</Text>
        </TouchableOpacity>
      ) : undefined,
    });
  }, []);

  useEffect(() => {
    const unsub = chatService.listenToMessages(chatId, msgs => {
      setMessages(msgs);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return unsub;
  }, [chatId]);

  const requestPermission = async (permission) => {
    if (Platform.Version < 23) return true;
    const result = await PermissionsAndroid.request(permission);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const sendText = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    await chatService.sendMessage(chatId, text);
  };

  const pickFromGallery = () => {
    launchImageLibrary({
      mediaType: 'photo',
      quality: 0.3,
      maxWidth: 800,
      maxHeight: 800,
      includeBase64: true,
    }, async (res) => {
      if (res.didCancel || !res.assets?.[0]) return;
      const asset = res.assets[0];
      if (!asset.base64) { Alert.alert('Error', 'Could not read image'); return; }
      setSending(true);
      await chatService.sendImageMessage(chatId, `data:image/jpeg;base64,${asset.base64}`);
      setSending(false);
    });
  };

  const takePhoto = async () => {
    const ok = await requestPermission(PermissionsAndroid.PERMISSIONS.CAMERA);
    if (!ok) { Alert.alert('Permission needed', 'Camera permission required'); return; }
    launchCamera({
      mediaType: 'photo',
      quality: 0.3,
      maxWidth: 800,
      maxHeight: 800,
      includeBase64: true,
    }, async (res) => {
      if (res.didCancel || !res.assets?.[0]) return;
      const asset = res.assets[0];
      if (!asset.base64) { Alert.alert('Error', 'Could not read image'); return; }
      setSending(true);
      await chatService.sendImageMessage(chatId, `data:image/jpeg;base64,${asset.base64}`);
      setSending(false);
    });
  };

  const startRecording = async () => {
    const ok = await requestPermission(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    if (!ok) { Alert.alert('Permission needed', 'Microphone permission required'); return; }
    setRecording(true);
    setRecordSecs(0);
    await audioRecorderPlayer.startRecorder();
    audioRecorderPlayer.addRecordBackListener((e) => {
      setRecordSecs(Math.floor(e.currentPosition / 1000));
    });
  };

  const stopRecording = async () => {
    const path = await audioRecorderPlayer.stopRecorder();
    audioRecorderPlayer.removeRecordBackListener();
    setRecording(false);
    if (recordSecs < 1) return;
    setSending(true);
    try {
      const RNFS = require('react-native-fs');
      const base64 = await RNFS.readFile(path, 'base64');
      await chatService.sendVoiceMessage(chatId, `data:audio/mp4;base64,${base64}`, recordSecs);
    } catch (e) {
      Alert.alert('Error', 'Could not send voice message');
    }
    setSending(false);
  };

  const playVoice = async (msgId, base64Uri) => {
    if (playingId === msgId) {
      await audioRecorderPlayer.stopPlayer();
      setPlayingId(null);
      return;
    }
    if (playingId) {
      await audioRecorderPlayer.stopPlayer();
    }
    setPlayingId(msgId);
    await audioRecorderPlayer.startPlayer(base64Uri);
    audioRecorderPlayer.addPlayBackListener((e) => {
      if (e.currentPosition >= e.duration) {
        setPlayingId(null);
        audioRecorderPlayer.stopPlayer();
      }
    });
  };

  const renderMsg = ({ item, index }) => {
    const isMe = item.senderId === uid;
    return (
      <View style={[s.msgWrap, isMe ? s.right : s.left]}>
        {!isMe && <Text style={s.senderName}>{item.senderName}</Text>}
        <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
          {item.type === 'text' && <Text style={s.msgText}>{item.text}</Text>}
          {item.type === 'image' && (
            <Image
              source={{ uri: item.imageData }}
              style={s.msgImage}
              resizeMode="cover"
            />
          )}
          {item.type === 'voice' && (
            <TouchableOpacity style={s.voiceRow} onPress={() => playVoice(item.id || index, item.voiceData)}>
              <Text style={s.playBtn}>{playingId === (item.id || index) ? '⏸' : '▶'}</Text>
              <View style={s.voiceBar}>
                <View style={[s.voiceProgress, playingId === (item.id || index) && s.voiceProgressActive]} />
              </View>
              <Text style={s.voiceDur}>0:{String(item.duration || 0).padStart(2, '0')}</Text>
            </TouchableOpacity>
          )}
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
        ListEmptyComponent={<Text style={s.empty}>No messages yet. Say hi! 👋</Text>}
      />

      {sending && (
        <View style={s.sendingBar}>
          <ActivityIndicator color="#00c853" size="small" />
          <Text style={s.sendingTxt}>Sending...</Text>
        </View>
      )}

      {recording && (
        <View style={s.recordingBar}>
          <View style={s.recDot} />
          <Text style={s.recTxt}>Recording... {recordSecs}s</Text>
          <Text style={s.recHint}>Release to send</Text>
        </View>
      )}

      <View style={s.bar}>
        <TouchableOpacity style={s.iconBtn} onPress={takePhoto}>
          <Text style={s.iconBtnTxt}>📷</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.iconBtn} onPress={pickFromGallery}>
          <Text style={s.iconBtnTxt}>🖼️</Text>
        </TouchableOpacity>

        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          placeholderTextColor="#555"
          multiline
          blurOnSubmit={false}
        />

        {input.trim() ? (
          <TouchableOpacity style={s.sendBtn} onPress={sendText}>
            <Text style={s.sendIcon}>➤</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[s.iconBtn, recording && s.recording]}
            onPressIn={startRecording}
            onPressOut={stopRecording}>
            <Text style={s.iconBtnTxt}>🎤</Text>
          </TouchableOpacity>
        )}
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
  bubble: { maxWidth: '75%', borderRadius: 18, padding: 10, elevation: 2 },
  bubbleMe: { backgroundColor: '#00c853', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: 'rgba(255,255,255,0.09)', borderBottomLeftRadius: 4 },
  msgText: { color: '#fff', fontSize: 15, lineHeight: 22 },
  msgImage: { width: 200, height: 200, borderRadius: 12 },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 160, padding: 4 },
  playBtn: { fontSize: 22, color: '#fff' },
  voiceBar: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 },
  voiceProgress: { width: '30%', height: '100%', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 2 },
  voiceProgressActive: { backgroundColor: '#fff', width: '60%' },
  voiceDur: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  time: { fontSize: 10, color: '#ffffff44', marginTop: 3, marginHorizontal: 4 },
  empty: { textAlign: 'center', color: '#555', marginTop: 40, fontSize: 15 },
  sendingBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, backgroundColor: 'rgba(0,200,83,0.1)', justifyContent: 'center' },
  sendingTxt: { color: '#00c853', fontSize: 13 },
  recordingBar: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: 'rgba(255,68,68,0.1)' },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff4444' },
  recTxt: { color: '#ff4444', fontWeight: 'bold', fontSize: 14, flex: 1 },
  recHint: { color: '#ffffff44', fontSize: 12 },
  bar: { flexDirection: 'row', alignItems: 'flex-end', padding: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', gap: 6 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  iconBtnTxt: { fontSize: 18 },
  recording: { backgroundColor: 'rgba(255,68,68,0.3)' },
  input: { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, color: '#fff', fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00c853', alignItems: 'center', justifyContent: 'center' },
  sendIcon: { color: '#000', fontWeight: 'bold', fontSize: 18 },
});
