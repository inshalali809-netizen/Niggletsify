import React, { useState, useEffect } from 'react';
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
            <Stack.Screen name="NewChat" component={NewChatScreen} options={{ title: 'New Chat' }} />
            <Stack.Screen name="Profile" options={{ title: 'Profile' }}>
              {props => <ProfileScreen {...props} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen name="GroupInfo" component={GroupInfoScreen} />
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
