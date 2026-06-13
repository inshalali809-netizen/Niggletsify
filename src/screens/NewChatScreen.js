import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert } from "react-native";
import { authService } from "../services/authService";
import { chatService } from "../services/chatService";
import { friendService } from "../services/friendService";

export default function NewChatScreen({ navigation }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [mode, setMode] = useState("dm");
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  const searchUsers = async (text) => {
    setSearch(text);
    if (text.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const users = await friendService.getUsersWithStatus(text);
      setResults(users);
    } catch (e) { setResults([]); }
    setSearching(false);
  };

  const startChat = async (user) => {
    if (!user.isFriend) {
      Alert.alert("Not Friends", "Send a friend request to " + user.displayName + "?", [
        { text: "Cancel", style: "cancel" },
        { text: "Send Request", onPress: async () => {
          await friendService.sendRequest(user.uid, user.displayName);
          setResults(r => r.map(u => u.uid === user.uid ? { ...u, requestSent: true } : u));
          Alert.alert("Sent", "Friend request sent to " + user.displayName);
        }},
      ]);
      return;
    }
    const chatId = await chatService.createDirectChat(user.uid, user.displayName);
    navigation.replace("Chat", { chatId, chatName: user.displayName, isGroup: false, otherUserId: user.uid });
  };

  const toggleSelect = (user) => {
    if (!user.isFriend) {
      Alert.alert("Not Friends", "You need to be friends with " + user.displayName + " first.");
      return;
    }
    setSelected(prev =>
      prev.find(u => u.uid === user.uid) ? prev.filter(u => u.uid !== user.uid) : [...prev, user]
    );
  };

  const createGroup = async () => {
    if (!groupName.trim()) { Alert.alert("Error", "Enter a group name"); return; }
    if (selected.length < 1) { Alert.alert("Error", "Select at least 1 person"); return; }
    setCreatingGroup(true);
    try {
      const chatId = await chatService.createGroupChat(groupName.trim(), selected.map(u => u.uid), selected);
      navigation.replace("Chat", { chatId, chatName: groupName.trim(), isGroup: true });
    } catch (e) { Alert.alert("Error", e.message); }
    setCreatingGroup(false);
  };

  const getStatusLabel = (user) => {
    if (user.isFriend) return { label: mode === "dm" ? "Message" : null, color: "#00C853" };
    if (user.requestSent) return { label: "Requested", color: "#ED8936" };
    return { label: "Add Friend", color: "#4299E1" };
  };

  return (
    <View style={s.container}>
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, mode === "dm" && s.tabActive]} onPress={() => { setMode("dm"); setSelected([]); }}>
          <Text style={[s.tabTxt, mode === "dm" && s.tabTxtActive]}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, mode === "group" && s.tabActive]} onPress={() => setMode("group")}>
          <Text style={[s.tabTxt, mode === "group" && s.tabTxtActive]}>New Group</Text>
        </TouchableOpacity>
      </View>

      {mode === "group" && (
        <TextInput style={s.groupInput} placeholder="Group name..." placeholderTextColor="#4A5568"
          value={groupName} onChangeText={setGroupName} />
      )}

      <TextInput style={s.search} placeholder="Search by name..." placeholderTextColor="#4A5568"
        value={search} onChangeText={searchUsers} autoFocus />

      {mode === "group" && selected.length > 0 && (
        <View style={s.chips}>
          {selected.map(u => (
            <TouchableOpacity key={u.uid} style={s.chip} onPress={() => toggleSelect(u)}>
              <Text style={s.chipTxt}>{u.displayName} ×</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {search.length === 0 && (
        <View style={s.empty}>
          <Text style={s.emptyTxt}>Search by name</Text>
          <Text style={s.emptySub}>Type someone's display name to find them</Text>
        </View>
      )}
      {search.length > 0 && search.length < 2 && (
        <View style={s.empty}><Text style={s.emptySub}>Keep typing...</Text></View>
      )}

      {searching && <ActivityIndicator color="#00C853" style={{ marginTop: 20 }} />}

      {!searching && search.length >= 2 && (
        <FlatList
          data={results}
          keyExtractor={item => item.uid}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyTxt}>No one found named "{search}"</Text>
            </View>
          }
          renderItem={({ item }) => {
            const status = getStatusLabel(item);
            const isSelected = selected.find(u => u.uid === item.uid);
            return (
              <TouchableOpacity style={[s.row, isSelected && s.rowSelected]}
                onPress={() => mode === "dm" ? startChat(item) : toggleSelect(item)}>
                <View style={[s.avatar, { backgroundColor: item.isFriend ? "#00C853" : "#2D3748" }]}>
                  <Text style={s.avatarTxt}>{(item.displayName || "?")[0].toUpperCase()}</Text>
                </View>
                <View style={s.info}>
                  <Text style={s.name}>{item.displayName}</Text>
                  <Text style={s.statusTxt}>{item.isFriend ? "Friend" : "Not connected"}</Text>
                </View>
                {mode === "group" ? (
                  <View style={[s.check, isSelected && s.checkSelected]}>
                    {isSelected && <Text style={s.checkTxt}>✓</Text>}
                  </View>
                ) : status.label ? (
                  <View style={[s.statusBtn, { borderColor: status.color }]}>
                    <Text style={[s.statusBtnTxt, { color: status.color }]}>{status.label}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {mode === "group" && selected.length > 0 && (
        <TouchableOpacity style={s.createBtn} onPress={createGroup} disabled={creatingGroup}>
          <Text style={s.createBtnTxt}>{creatingGroup ? "Creating..." : `Create Group (${selected.length})`}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D1A" },
  tabs: { flexDirection: "row", padding: 12, gap: 8 },
  tab: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: "#161622", alignItems: "center", borderWidth: 1, borderColor: "#2D3748" },
  tabActive: { backgroundColor: "rgba(0,200,83,0.12)", borderColor: "#00C853" },
  tabTxt: { color: "#718096", fontWeight: "600", fontSize: 13 },
  tabTxtActive: { color: "#00C853" },
  groupInput: { marginHorizontal: 12, marginBottom: 8, backgroundColor: "#161622", borderRadius: 14, padding: 14, color: "#fff", fontSize: 15, borderWidth: 1, borderColor: "#00C853" },
  search: { margin: 12, marginTop: 0, backgroundColor: "#161622", borderRadius: 14, padding: 14, color: "#fff", fontSize: 15, borderWidth: 1, borderColor: "#2D3748" },
  chips: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  chip: { backgroundColor: "rgba(0,200,83,0.15)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#00C853" },
  chipTxt: { color: "#00C853", fontSize: 13, fontWeight: "600" },
  empty: { alignItems: "center", marginTop: 40, padding: 20 },
  emptyTxt: { fontSize: 16, color: "#FFFFFF", fontWeight: "600", textAlign: "center" },
  emptySub: { fontSize: 13, color: "#4A5568", marginTop: 6, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#1A1A2E" },
  rowSelected: { backgroundColor: "rgba(0,200,83,0.06)" },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginRight: 14 },
  avatarTxt: { color: "#fff", fontWeight: "700", fontSize: 20 },
  info: { flex: 1 },
  name: { fontSize: 16, color: "#FFFFFF", fontWeight: "600" },
  statusTxt: { fontSize: 12, color: "#4A5568", marginTop: 2 },
  statusBtn: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  statusBtnTxt: { fontSize: 12, fontWeight: "700" },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: "#2D3748", alignItems: "center", justifyContent: "center" },
  checkSelected: { backgroundColor: "#00C853", borderColor: "#00C853" },
  checkTxt: { color: "#000", fontWeight: "bold", fontSize: 14 },
  createBtn: { margin: 16, backgroundColor: "#00C853", borderRadius: 16, padding: 18, alignItems: "center" },
  createBtnTxt: { color: "#000", fontWeight: "700", fontSize: 16 },
});
