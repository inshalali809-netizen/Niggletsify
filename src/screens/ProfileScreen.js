import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView, Linking } from "react-native";
import { authService } from "../services/authService";
import { dbSet } from "../services/db";

export default function ProfileScreen({ navigation, onLogout }) {
  const user = authService.getUser();
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);
  const initial = (user?.displayName || "?")[0].toUpperCase();

  const saveName = async () => {
    if (!newName.trim()) { Alert.alert("Error", "Name cannot be empty"); return; }
    setSaving(true);
    await dbSet(`users/${user.uid}/displayName`, newName.trim());
    authService.updateDisplayName(newName.trim());
    setEditing(false);
    setSaving(false);
    Alert.alert("Updated", "Display name changed successfully.");
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => { await authService.logout(); onLogout(); } },
    ]);
  };

  const Row = ({ label, value, onPress, danger }) => (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={s.rowLeft}>
        <Text style={s.rowLabel}>{label}</Text>
        {value ? <Text style={[s.rowValue, danger && { color: "#FC8181" }]}>{value}</Text> : null}
      </View>
      {onPress ? <Text style={s.chevron}>{'›'}</Text> : null}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <View style={s.avatarSection}>
        <View style={s.avatar}><Text style={s.avatarTxt}>{initial}</Text></View>
        {editing ? (
          <View style={s.editRow}>
            <TextInput style={s.editInput} value={newName} onChangeText={setNewName} autoFocus selectTextOnFocus />
            <TouchableOpacity style={s.saveBtn} onPress={saveName} disabled={saving}>
              <Text style={s.saveBtnTxt}>{saving ? "..." : "Save"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => { setEditing(false); setNewName(user?.displayName || ""); }}>
              <Text style={s.cancelBtnTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Text style={s.displayName}>{user?.displayName} <Text style={s.editHint}>(tap to edit)</Text></Text>
          </TouchableOpacity>
        )}
        <Text style={s.email}>{user?.email}</Text>
      </View>

      <Text style={s.sectionLabel}>ACCOUNT</Text>
      <View style={s.card}>
        <Row label="Display Name" value={user?.displayName} onPress={() => setEditing(true)} />
        <View style={s.divider} />
        <Row label="Email" value={user?.email} />
        <View style={s.divider} />
        <Row label="Security" value="End-to-end encrypted" />
      </View>

      <Text style={s.sectionLabel}>PRIVACY</Text>
      <View style={s.card}>
        <Row label="Blocked Users" onPress={() => navigation.navigate("BlockedUsers")} />
      </View>

      <Text style={s.sectionLabel}>LEGAL</Text>
      <View style={s.card}>
        <Row label="Terms of Service" onPress={() => navigation.navigate("Terms")} />
        <View style={s.divider} />
        <Row label="Privacy Policy" onPress={() => navigation.navigate("PrivacyPolicy")} />
        <View style={s.divider} />
        <Row label="Contact Us" onPress={() => Linking.openURL("mailto:inshalali809@gmail.com")} />
      </View>

      <Text style={s.sectionLabel}>SUPPORT</Text>
      <View style={s.card}>
        <Row label="Buy Me a Coffee" onPress={() => Linking.openURL("https://buymeacoffee.com/inshalali809")} />
        <View style={s.divider} />
        <Row label="Version" value="1.0.0" />
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Text style={s.logoutTxt}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={s.copyright}>© 2026 Niggletsify. All rights reserved.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D1A" },
  avatarSection: { alignItems: "center", paddingVertical: 32, borderBottomWidth: 1, borderBottomColor: "#1A1A2E" },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: "#00C853", alignItems: "center", justifyContent: "center", marginBottom: 16, elevation: 6 },
  avatarTxt: { fontSize: 38, fontWeight: "700", color: "#000" },
  displayName: { fontSize: 20, fontWeight: "700", color: "#FFFFFF", textAlign: "center" },
  editHint: { fontSize: 13, fontWeight: "400", color: "#4A5568" },
  email: { fontSize: 14, color: "#718096", marginTop: 4 },
  editRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  editInput: { backgroundColor: "#161622", borderRadius: 10, padding: 10, color: "#fff", fontSize: 16, minWidth: 160, borderWidth: 1, borderColor: "#2D3748" },
  saveBtn: { backgroundColor: "#00C853", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  saveBtnTxt: { color: "#000", fontWeight: "700", fontSize: 13 },
  cancelBtn: { paddingHorizontal: 10, paddingVertical: 10 },
  cancelBtnTxt: { color: "#718096", fontSize: 13 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#4A5568", marginTop: 24, marginBottom: 8, marginHorizontal: 16, letterSpacing: 1 },
  card: { backgroundColor: "#161622", marginHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: "#1A1A2E", overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  rowLeft: { flex: 1 },
  rowLabel: { fontSize: 15, color: "#E2E8F0", fontWeight: "500" },
  rowValue: { fontSize: 13, color: "#4A5568", marginTop: 2 },
  chevron: { fontSize: 20, color: "#4A5568", marginLeft: 8 },
  divider: { height: 1, backgroundColor: "#1A1A2E", marginLeft: 16 },
  logoutBtn: { margin: 16, marginTop: 24, backgroundColor: "#161622", borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#2D2D3E" },
  logoutTxt: { color: "#FC8181", fontWeight: "600", fontSize: 15 },
  copyright: { textAlign: "center", color: "#2D3748", fontSize: 12, marginBottom: 32 },
});
