import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { friendService } from '../services/friendService';

export default function BlockedUsersScreen() {
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const list = await friendService.getBlockedUsers();
    setBlocked(list);
    setLoading(false);
  };

  const unblock = (user) => {
    Alert.alert('Unblock', `Unblock ${user.displayName}? They will be able to message you again.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unblock', onPress: async () => {
        await friendService.unblockUser(user.uid);
        setBlocked(b => b.filter(u => u.uid !== user.uid));
      }},
    ]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator color="#00C853" size="large" /></View>;

  return (
    <View style={s.container}>
      {blocked.length === 0 ? (
        <View style={s.center}>
          <Icon name="block" size={48} color="#2D3748" />
          <Text style={s.emptyTxt}>No blocked users</Text>
        </View>
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={item => item.uid}
          renderItem={({ item }) => (
            <View style={s.row}>
              <View style={s.avatar}><Text style={s.avatarTxt}>{(item.displayName || '?')[0].toUpperCase()}</Text></View>
              <Text style={s.name}>{item.displayName}</Text>
              <TouchableOpacity style={s.unblockBtn} onPress={() => unblock(item)}>
                <Text style={s.unblockTxt}>Unblock</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D1A' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTxt: { color: '#4A5568', fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1A1A2E' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2D3748', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarTxt: { color: '#fff', fontWeight: '700', fontSize: 18 },
  name: { flex: 1, color: '#E2E8F0', fontSize: 15, fontWeight: '500' },
  unblockBtn: { borderWidth: 1, borderColor: '#00C853', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  unblockTxt: { color: '#00C853', fontWeight: '700', fontSize: 12 },
});
