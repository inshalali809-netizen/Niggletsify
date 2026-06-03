import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, ActivityIndicator, View } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import ChatsScreen from './src/screens/ChatsScreen';
import ChatScreen from './src/screens/ChatScreen';
import NewChatScreen from './src/screens/NewChatScreen';

const Stack = createStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);

  if (user === undefined) {
    return <View style={{ flex: 1, backgroundColor: '#0d0d1a' }} />;
  }

  return (
    <NavigationContainer theme={{
      dark: true,
      colors: { primary: '#00c853', background: '#0d0d1a', card: '#0d0d1a', text: '#fff', border: 'rgba(255,255,255,0.07)', notification: '#00c853' },
    }}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d1a" />
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#0d0d1a', elevation: 0 }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: 'bold' } }}>
        {user ? (
          <>
            <Stack.Screen name="Chats" component={ChatsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="NewChat" component={NewChatScreen} options={{ title: 'New Chat' }} />
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
