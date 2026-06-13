import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Image,
  ActivityIndicator, Alert, PermissionsAndroid, Clipboard,
  Animated, Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { authService } from '../services/authService';
import { chatService } from '../services/chatService';
import { friendService } from '../services/friendService';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import moment from 'moment';

const audioRecorderPlayer = new AudioRecorderPlayer();
audioRecorderPlayer.setSubscriptionDuration(0.05);

const getWaveform = (seed) => {
  const n = seed % 1000;
  return Array.from({ length: 32 }, (_, i) => {
    const v = Math.abs(Math.sin((i + n * 0.01) * 0.8) * Math.cos(i * 0.5 + n * 0.003));
    return Math.round(3 + v * 13);
  });
};

function VoiceWaveform({ timestamp, progress }) {
  const bars = getWaveform(timestamp || 0);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2, height: 28 }}>
      {bars.map((h, i) => (
        <View key={i} style={{
          width: 3, height: h, borderRadius: 2,
          backgroundColor: i / bars.length <= progress ? "#fff" : "rgba(255,255,255,0.3)",
        }} />
      ))}
    </View>
  );
}

export default function ChatScreen({ route, navigation }) {
  const { chatId, chatName, isGroup, otherUserId } = route.params;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [playingId, setPlayingId] = useState(null);
  const [sending, setSending] = useState(false);
  const uid = authService.getUser()?.uid || "";
  const listRef = useRef();
  const progressAnims = useRef({});

  // Recording state refs (avoid React state lag)
  const recStateRef = useRef('idle'); // idle | starting | recording | stopping
  const recPosMsRef = useRef(0);
  const pendingStopRef = useRef(false);

  const getAnim = (id) => {
    if (!progressAnims.current[id]) progressAnims.current[id] = new Animated.Value(0);
    return progressAnims.current[id];
  };

  const showOptions = () => {
    if (isGroup) {
      navigation.navigate("GroupInfo", { chatId, chatName });
      return;
    }
    Alert.alert(chatName, undefined, [
      {
        text: "Block User", style: "destructive",
        onPress: () => {
          Alert.alert("Block " + chatName + "?", "They won't be able to message you, and you won't see their messages. You can unblock them later from your profile.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Block", style: "destructive",
              onPress: async () => {
                await friendService.blockUser(otherUserId, chatName);
                navigation.navigate("Chats");
              }
            }
          ]);
        }
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  useEffect(() => {
    navigation.setOptions({
      title: chatName,
      headerRight: () => (
        <TouchableOpacity onPress={showOptions} style={{ marginRight: 16 }}>
          <Icon name={isGroup ? "info-outline" : "more-vert"} size={24} color="#A0AEC0" />
        </TouchableOpacity>
      ),
    });
  }, []);

  useEffect(() => {
    const unsub = chatService.listenToMessages(chatId, msgs => {
      setMessages(msgs);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => { unsub(); audioRecorderPlayer.stopPlayer().catch(() => {}); };
  }, [chatId]);

  const requestPerm = async (perm, title, message) => {
    const already = await PermissionsAndroid.check(perm);
    if (already) return true;
    const result = await PermissionsAndroid.request(perm, { title, message, buttonPositive: "Allow", buttonNegative: "Deny" });
    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Alert.alert(title, "Permission denied. Enable in Settings?", [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ]);
      return false;
    }
    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const sendText = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await chatService.sendMessage(chatId, text);
  };

  const pickGallery = () => {
    launchImageLibrary({ mediaType: "photo", quality: 0.3, maxWidth: 800, maxHeight: 800, includeBase64: true },
      async (res) => {
        if (res.didCancel || !res.assets?.[0]?.base64) return;
        setSending(true);
        await chatService.sendImageMessage(chatId, "data:image/jpeg;base64," + res.assets[0].base64);
        setSending(false);
      });
  };

  const takePhoto = async () => {
    const ok = await requestPerm(PermissionsAndroid.PERMISSIONS.CAMERA, "Camera Access", "Niggletsify needs camera access to take photos");
    if (!ok) return;
    launchCamera({ mediaType: "photo", quality: 0.3, maxWidth: 800, maxHeight: 800, includeBase64: true, saveToPhotos: false },
      async (res) => {
        if (res.errorCode) { Alert.alert("Camera Error", res.errorMessage); return; }
        if (res.didCancel || !res.assets?.[0]?.base64) return;
        setSending(true);
        await chatService.sendImageMessage(chatId, "data:image/jpeg;base64," + res.assets[0].base64);
        setSending(false);
      });
  };

  // ---------- SNAPPY VOICE RECORDING (WhatsApp style) ----------
  const startRecording = async () => {
    if (recStateRef.current !== 'idle') return;

    const ok = await requestPerm(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, "Microphone Access", "Niggletsify needs microphone for voice messages");
    if (!ok) return;

    recStateRef.current = 'starting';
    recPosMsRef.current = 0;
    pendingStopRef.current = false;
    setRecording(true);
    setRecordSecs(0);

    try {
      await audioRecorderPlayer.startRecorder();
      audioRecorderPlayer.addRecordBackListener(e => {
        recPosMsRef.current = e.currentPosition;
        setRecordSecs(Math.floor(e.currentPosition / 1000));
      });
      recStateRef.current = 'recording';

      // If user already released before recorder finished starting, stop now
      if (pendingStopRef.current) {
        finishRecording();
      }
    } catch (e) {
      recStateRef.current = 'idle';
      setRecording(false);
    }
  };

  const finishRecording = async () => {
    if (recStateRef.current !== 'recording') return;
    recStateRef.current = 'stopping';

    let durationMs = recPosMsRef.current;
    let path;
    try {
      path = await audioRecorderPlayer.stopRecorder();
    } catch (e) {
      recStateRef.current = 'idle';
      setRecording(false);
      return;
    }
    audioRecorderPlayer.removeRecordBackListener();
    setRecording(false);
    recStateRef.current = 'idle';

    // Discard very short taps (under 400ms) - likely accidental
    if (durationMs < 400) return;

    setSending(true);
    try {
      const RNFS = require("react-native-fs");
      const base64 = await RNFS.readFile(path, "base64");
      const durationSecs = Math.max(1, Math.round(durationMs / 1000));
      await chatService.sendVoiceMessage(chatId, "data:audio/mp4;base64," + base64, durationSecs);
    } catch (e) {
      Alert.alert("Error", "Could not send voice message");
    }
    setSending(false);
  };

  const stopRecording = () => {
    if (recStateRef.current === 'starting') {
      // Recorder still initializing - mark to stop as soon as it's ready
      pendingStopRef.current = true;
      return;
    }
    finishRecording();
  };

  const cancelRecording = async () => {
    if (recStateRef.current === 'starting') {
      pendingStopRef.current = true;
      return;
    }
    if (recStateRef.current !== 'recording') return;
    recStateRef.current = 'stopping';
    try { await audioRecorderPlayer.stopRecorder(); } catch (e) {}
    audioRecorderPlayer.removeRecordBackListener();
    setRecording(false);
    recStateRef.current = 'idle';
  };
  // ---------------------------------------------------------------

  const playVoice = async (msgId, uri) => {
    const anim = getAnim(msgId);
    if (playingId === msgId) {
      await audioRecorderPlayer.stopPlayer();
      audioRecorderPlayer.removePlayBackListener();
      setPlayingId(null);
      anim.setValue(0);
      return;
    }
    if (playingId) { await audioRecorderPlayer.stopPlayer(); if (progressAnims.current[playingId]) progressAnims.current[playingId].setValue(0); }
    setPlayingId(msgId);
    anim.setValue(0);
    await audioRecorderPlayer.startPlayer(uri);
    audioRecorderPlayer.addPlayBackListener(e => {
      if (e.duration <= 0) return;
      Animated.timing(anim, { toValue: e.currentPosition / e.duration, duration: 150, useNativeDriver: false }).start();
      if (e.currentPosition >= e.duration - 100) { setPlayingId(null); anim.setValue(0); audioRecorderPlayer.stopPlayer().catch(() => {}); }
    });
  };

  const handleLongPress = (item) => {
    const isMe = item.senderId === uid;
    const opts = [];
    if (item.type === "text") opts.push({ text: "Copy", onPress: () => Clipboard.setString(item.text) });
    if (isMe) opts.push({ text: "Delete for Everyone", style: "destructive", onPress: () =>
      Alert.alert("Delete?", "Remove for everyone?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => chatService.deleteMessage(chatId, item.firebaseKey) },
      ])
    });
    opts.push({ text: "Cancel", style: "cancel" });
    Alert.alert("", "", opts);
  };

  const renderMsg = ({ item, index }) => {
    const isMe = item.senderId === uid;
    const msgId = item.firebaseKey || String(index);
    const anim = getAnim(msgId);
    return (
      <TouchableOpacity activeOpacity={0.85} onLongPress={() => handleLongPress(item)} delayLongPress={400}>
        <View style={[s.msgWrap, isMe ? s.right : s.left]}>
          {!isMe && <Text style={s.senderName}>{item.senderName}</Text>}
          <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
            {item.type === "text" && <Text style={s.msgText}>{item.text}</Text>}
            {item.type === "image" && <Image source={{ uri: item.imageData }} style={s.msgImage} resizeMode="cover" />}
            {item.type === "voice" && (
              <TouchableOpacity style={s.voiceRow} onPress={() => playVoice(msgId, item.voiceData)}>
                <View style={[s.playCircle, playingId === msgId && s.playCircleActive]}>
                  <Icon name={playingId === msgId ? "pause" : "play-arrow"} size={18} color="#fff" />
                </View>
                <View style={s.waveContainer}>
                  <VoiceWaveform timestamp={item.timestamp || 0} progress={0} />
                  <Animated.View style={[StyleSheet.absoluteFill, { width: anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }), overflow: "hidden" }]}>
                    <View style={s.waveOverlay}><VoiceWaveform timestamp={item.timestamp || 0} progress={1} /></View>
                  </Animated.View>
                </View>
                <Text style={s.voiceDur}>0:{String(item.duration || 0).padStart(2, "0")}</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={[s.time, isMe && { textAlign: "right" }]}>
            {moment(item.timestamp).format("h:mm A")}{isMe ? "  ✓✓" : ""}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={90}>
      <FlatList ref={listRef} data={messages} keyExtractor={(_, i) => String(i)} renderItem={renderMsg}
        contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={<Text style={s.empty}>No messages yet. Say hi!</Text>}
      />
      {sending && (
        <View style={s.sendingBar}>
          <ActivityIndicator color="#00C853" size="small" />
          <Text style={s.sendingTxt}>Sending...</Text>
        </View>
      )}
      {recording && (
        <View style={s.recordingBar}>
          <View style={s.recDot} />
          <Text style={s.recTxt}>Recording  {recordSecs}s — Release to send</Text>
          <TouchableOpacity onPress={cancelRecording} style={s.cancelRecBtn}>
            <Icon name="close" size={18} color="#FC8181" />
          </TouchableOpacity>
        </View>
      )}
      <View style={s.bar}>
        <TouchableOpacity style={s.iconBtn} onPress={takePhoto}>
          <Icon name="camera-alt" size={22} color="#A0AEC0" />
        </TouchableOpacity>
        <TouchableOpacity style={s.iconBtn} onPress={pickGallery}>
          <Icon name="photo-library" size={22} color="#A0AEC0" />
        </TouchableOpacity>
        <TextInput style={s.input} value={input} onChangeText={setInput}
          placeholder="Message..." placeholderTextColor="#4A5568" multiline blurOnSubmit={false} />
        {input.trim() ? (
          <TouchableOpacity style={s.sendBtn} onPress={sendText}>
            <Icon name="send" size={20} color="#000" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[s.iconBtn, recording && s.recBtn]}
            onPressIn={startRecording}
            onPressOut={stopRecording}
            delayPressIn={0}
            activeOpacity={0.6}
          >
            <Icon name="mic" size={22} color={recording ? "#FC8181" : "#A0AEC0"} />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D1A" },
  msgWrap: { marginBottom: 12 },
  left: { alignItems: "flex-start" },
  right: { alignItems: "flex-end" },
  senderName: { fontSize: 11, color: "#00C853", fontWeight: "700", marginBottom: 3, marginLeft: 4 },
  bubble: { maxWidth: "78%", borderRadius: 18, padding: 10, elevation: 2 },
  bubbleMe: { backgroundColor: "#00C853", borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: "#1C1C2E", borderBottomLeftRadius: 4 },
  msgText: { color: "#fff", fontSize: 15, lineHeight: 22 },
  msgImage: { width: 200, height: 200, borderRadius: 12 },
  voiceRow: { flexDirection: "row", alignItems: "center", gap: 8, minWidth: 190, paddingVertical: 2 },
  playCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(0,0,0,0.2)", alignItems: "center", justifyContent: "center" },
  playCircleActive: { backgroundColor: "rgba(0,0,0,0.4)" },
  waveContainer: { flex: 1, height: 28, position: "relative" },
  waveOverlay: { position: "absolute", left: 0, top: 0, width: 300 },
  voiceDur: { fontSize: 11, color: "rgba(255,255,255,0.85)", minWidth: 26 },
  time: { fontSize: 10, color: "#4A5568", marginTop: 3, marginHorizontal: 4 },
  empty: { textAlign: "center", color: "#4A5568", marginTop: 40, fontSize: 15 },
  sendingBar: { flexDirection: "row", alignItems: "center", gap: 8, padding: 8, backgroundColor: "rgba(0,200,83,0.08)", justifyContent: "center" },
  sendingTxt: { color: "#00C853", fontSize: 13 },
  recordingBar: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, backgroundColor: "rgba(252,129,129,0.08)" },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FC8181" },
  recTxt: { color: "#FC8181", fontWeight: "600", fontSize: 13, flex: 1 },
  cancelRecBtn: { padding: 4 },
  bar: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#1A1A2E", gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#161622", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#2D3748" },
  recBtn: { backgroundColor: "rgba(252,129,129,0.15)", borderColor: "#FC8181" },
  input: { flex: 1, backgroundColor: "#161622", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: "#fff", fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: "#2D3748" },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#00C853", alignItems: "center", justifyContent: "center" },
});
