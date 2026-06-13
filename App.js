import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { StatusBar, ActivityIndicator, View, PermissionsAndroid, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authService } from "./src/services/authService";
import LoginScreen from "./src/screens/LoginScreen";
import ChatsScreen from "./src/screens/ChatsScreen";
import ChatScreen from "./src/screens/ChatScreen";
import NewChatScreen from "./src/screens/NewChatScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import GroupInfoScreen from "./src/screens/GroupInfoScreen";
import FriendRequestsScreen from "./src/screens/FriendRequestsScreen";
import TermsScreen from "./src/screens/TermsScreen";
import PrivacyPolicyScreen from "./src/screens/PrivacyPolicyScreen";
import BlockedUsersScreen from "./src/screens/BlockedUsersScreen";

const Stack = createStackNavigator();

export default function App() {
  const [user, setUser] = useState(undefined);
  const [termsAccepted, setTermsAccepted] = useState(undefined);

  useEffect(() => {
    const init = async () => {
      if (Platform.OS === "android" && Platform.Version >= 33) {
        await PermissionsAndroid.request("android.permission.POST_NOTIFICATIONS");
      }
      const accepted = await AsyncStorage.getItem("terms_accepted");
      setTermsAccepted(!!accepted);
      const u = await authService.loadUser();
      setUser(u || null);
    };
    init();
  }, []);

  const handleAcceptTerms = async () => {
    await AsyncStorage.setItem("terms_accepted", "true");
    setTermsAccepted(true);
  };

  if (user === undefined || termsAccepted === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0D0D1A", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#00C853" size="large" />
      </View>
    );
  }

  if (!termsAccepted) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#0D0D1A" />
        <TermsScreen onAccept={handleAcceptTerms} />
      </>
    );
  }

  return (
    <NavigationContainer theme={{
      dark: true,
      colors: { primary: "#00C853", background: "#0D0D1A", card: "#0D0D1A", text: "#FFFFFF", border: "#1A1A2E", notification: "#00C853" },
    }}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D1A" />
      <Stack.Navigator screenOptions={{
        headerStyle: { backgroundColor: "#0D0D1A", elevation: 0, borderBottomWidth: 1, borderBottomColor: "#1A1A2E" },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "700", fontSize: 17 },
      }}>
        {user ? (
          <>
            <Stack.Screen name="Chats" options={{ headerShown: false }}>
              {props => <ChatsScreen {...props} onLogout={() => setUser(null)} />}
            </Stack.Screen>
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="NewChat" component={NewChatScreen} options={{ title: "Find People" }} />
            <Stack.Screen name="Profile" options={{ title: "Profile" }}>
              {props => <ProfileScreen {...props} onLogout={() => setUser(null)} />}
            </Stack.Screen>
            <Stack.Screen name="GroupInfo" component={GroupInfoScreen} />
            <Stack.Screen name="FriendRequests" component={FriendRequestsScreen} options={{ title: "Friend Requests" }} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ title: "Privacy Policy" }} />
            <Stack.Screen name="Terms" component={TermsScreen} options={{ title: "Terms of Service" }} />
            <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} options={{ title: "Blocked Users" }} />
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
