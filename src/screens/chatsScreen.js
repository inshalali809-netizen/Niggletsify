python3 << 'PYEOF'
files = {
'/mnt/user-data/outputs/ChatsScreen.js': '''import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { authService } from '../services/authService';
import { chatService } from '../services/chatService';
import { friendService } from '../services/friendService';
import moment from 'moment';

export default function ChatsScreen({ navigation, onLogout }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState('');
  const [requestCount, setRequestCount] = useState(0);
  const lastReadRef = useRef({});

  useEffect(() => {
    const user = authService.getUser();
    if (user) setUid(user.uid);
  }, []);

  useEffect(() => {
    const unsub = chatService.listenToChats(data => { setChats(data); setLoading(false); });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = friendService.listenToRequests(reqs => setRequestCount(reqs.length));
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
        <View style={s.headerRight}>
          <TouchableOpacity style={s.requestsBtn} onPress={() => navigation.navigate('FriendRequests')}>
            <Text style={s.requestsIcon}>👥</Text>
            {requestCount > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeTxt}>{requestCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('NewChat')}>
            <Text style={{ fontSize: 18 }}>✏️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#00c853" style={{ marginTop: 40 }} />
      ) : chats.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No chats yet!</Text>
          <Text style={s.emptySub}>Tap ✏️ to find friends and start chatting</Text>
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
  headerRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  requestsBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  requestsIcon: { fontSize: 18 },
  badge: { position: 'absolute', top: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#ff4444', alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  fab: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,200,83,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,200,83,0.3)' },
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
  emptySub: { fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center', padding: 20 },
});
''',

'/mnt/user-data/outputs/App.js': '''import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, ActivityIndicator, View } from 'react-native';
import { authService } from './src/services/authService';
import LoginScreen from './src/screens/LoginScreen';
import ChatsScreen from './src/screens/ChatsScreen';
import ChatScreen from './src/screens/ChatScreen';
import NewChatScreen from './src/screens/NewChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import GroupInfoScreen from './src/screens/GroupInfoScreen';
import FriendRequestsScreen from './src/screens/FriendRequestsScreen';

const Stack = createStackNavigator();

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    authService.loadUser().then(u => setUser(u || null));
  }, []);

  if (user === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d0d1a', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#00c853" size="large" />
      </View>
    );
  }

  const handleLogout = () => setUser(null);

  return (
    <NavigationContainer theme={{
      dark: true,
      colors: { primary: '#00c853', background: '#0d0d1a', card: '#0d0d1a', text: '#fff', border: 'rgba(255,255,255,0.07)', notification: '#00c853' },
    }}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d1a" />
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#0d0d1a', elevation: 0 }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: 'bold' } }}>
        {user ? (
          <>
            <Stack.Screen name="Chats" options={{ headerShown: false }}>
              {props => <ChatsScreen {...props} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="NewChat" component={NewChatScreen} options={{ title: 'Find Friends' }} />
            <Stack.Screen name="Profile" options={{ title: 'Profile' }}>
              {props => <ProfileScreen {...props} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen name="GroupInfo" component={GroupInfoScreen} />
            <Stack.Screen name="FriendRequests" component={FriendRequestsScreen} options={{ title: 'Friend Requests' }} />
          </>
        ) : (
          <Stack.Screen name="Login" options={{ headerShown: false }}>
            {props => <LoginScreen {...props} onLogin={setUser} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
''',
}

for path, content in files.items():
    with open(path, 'w') as f:
        f.write(content)
    print(f"Written: {path}")

print("All done!")
PYEOF
