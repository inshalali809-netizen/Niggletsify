import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { authService } from "../services/authService";
import { chatService } from "../services/chatService";
import { friendService } from "../services/friendService";
import moment from "moment";

export default function ChatsScreen({ navigation, onLogout }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState("");
  const [requestCount, setRequestCount] = useState(0);
  const lastReadRef = useRef({});

  useEffect(() => { const u = authService.getUser(); if (u) setUid(u.uid); }, []);
  useEffect(() => { const unsub = chatService.listenToChats(data => { setChats(data); setLoading(false); }); return unsub; }, []);
  useEffect(() => { const unsub = friendService.listenToRequests(reqs => setRequestCount(reqs.length)); return unsub; }, []);

  const getName = useCallback((chat) => chatService.getChatName(chat, uid), [uid]);
  const getOtherUid = (chat) => {
    if (chat.type === "group") return null;
    return Object.keys(chat.members || {}).find(id => id !== uid);
  };
  const getUnread = (chat) => {
    if (!chat.lastMessage?.timestamp) return false;
    const lr = lastReadRef.current[chat.id] || 0;
    return chat.lastMessage.senderId !== uid && chat.lastMessage.timestamp > lr;
  };

  const renderItem = ({ item }) => {
    const unread = getUnread(item);
    const initial = (getName(item) || "?")[0].toUpperCase();
    return (
      <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={() => {
        lastReadRef.current[item.id] = Date.now();
        navigation.navigate("Chat", {
          chatId: item.id, chatName: getName(item), isGroup: item.type === "group",
          otherUserId: getOtherUid(item),
        });
      }}>
        <View style={[s.avatar, { backgroundColor: item.type === "group" ? "#5B21B6" : "#00C853" }]}>
          <Text style={s.avatarTxt}>{item.type === "group" ? "#" : initial}</Text>
        </View>
        <View style={s.info}>
          <View style={s.rowTop}>
            <Text style={[s.name, unread && s.nameUnread]} numberOfLines={1}>{getName(item)}</Text>
            <Text style={[s.time, unread && s.timeUnread]}>
              {item.lastMessage?.timestamp ? moment(item.lastMessage.timestamp).fromNow() : ""}
            </Text>
          </View>
          <View style={s.rowBottom}>
            <Text style={[s.last, unread && s.lastUnread]} numberOfLines={1}>
              {item.lastMessage?.senderId === uid ? "You: " : ""}{item.lastMessage?.text || "No messages yet"}
            </Text>
            {unread && <View style={s.unreadDot} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const user = authService.getUser();
  const initial = (user?.displayName || "?")[0].toUpperCase();

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
          <View style={s.profileAvatar}><Text style={s.profileAvatarTxt}>{initial}</Text></View>
        </TouchableOpacity>
        <Text style={s.title}>Messages</Text>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate("FriendRequests")}>
            <Icon name="person-add" size={20} color="#A0AEC0" />
            {requestCount > 0 && <View style={s.badge}><Text style={s.badgeTxt}>{requestCount}</Text></View>}
          </TouchableOpacity>
          <TouchableOpacity style={[s.iconBtn, s.composeBtn]} onPress={() => navigation.navigate("NewChat")}>
            <Icon name="edit" size={18} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#00C853" size="large" /></View>
      ) : chats.length === 0 ? (
        <View style={s.center}>
          <Icon name="chat-bubble-outline" size={56} color="#2D3748" />
          <Text style={s.emptyTitle}>No conversations yet</Text>
          <Text style={s.emptySub}>Find friends and start chatting</Text>
          <TouchableOpacity style={s.startBtn} onPress={() => navigation.navigate("NewChat")}>
            <Text style={s.startBtnTxt}>Find Friends</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList data={chats} keyExtractor={item => item.id} renderItem={renderItem} showsVerticalScrollIndicator={false} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D1A" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1A1A2E" },
  profileAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#00C853", alignItems: "center", justifyContent: "center" },
  profileAvatarTxt: { color: "#000", fontWeight: "700", fontSize: 15 },
  title: { flex: 1, fontSize: 20, fontWeight: "700", color: "#FFFFFF", marginLeft: 12 },
  headerRight: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#161622", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#2D3748" },
  composeBtn: { backgroundColor: "#00C853", borderColor: "#00C853" },
  badge: { position: "absolute", top: -3, right: -3, width: 16, height: 16, borderRadius: 8, backgroundColor: "#E53E3E", alignItems: "center", justifyContent: "center" },
  badgeTxt: { color: "#fff", fontSize: 9, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#0F0F1A" },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarTxt: { fontSize: 20, color: "#fff", fontWeight: "700" },
  info: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4, alignItems: "center" },
  rowBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { fontSize: 15, color: "#CBD5E0", fontWeight: "500", flex: 1, marginRight: 8 },
  nameUnread: { color: "#FFFFFF", fontWeight: "700" },
  time: { fontSize: 11, color: "#4A5568" },
  timeUnread: { color: "#00C853" },
  last: { fontSize: 13, color: "#4A5568", flex: 1 },
  lastUnread: { color: "#A0AEC0" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#00C853", marginLeft: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyTitle: { fontSize: 18, color: "#FFFFFF", fontWeight: "600" },
  emptySub: { fontSize: 14, color: "#4A5568" },
  startBtn: { backgroundColor: "#00C853", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  startBtnTxt: { color: "#000", fontWeight: "700", fontSize: 15 },
});
