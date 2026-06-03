import AsyncStorage from '@react-native-async-storage/async-storage';
import { FIREBASE_CONFIG } from './firebaseConfig';

const API_KEY = FIREBASE_CONFIG.apiKey;
const DB = FIREBASE_CONFIG.databaseURL;

export const authService = {
  async register(email, password, displayName) {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message.replace(/_/g, ' '));
    const user = {
      uid: data.localId,
      email,
      displayName,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
    };
    await AsyncStorage.setItem('user', JSON.stringify(user));
    await fetch(`${DB}/users/${data.localId}.json?auth=${data.idToken}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: data.localId, displayName, email, createdAt: Date.now() }),
    });
    return user;
  },

  async login(email, password) {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message.replace(/_/g, ' '));
    const user = {
      uid: data.localId,
      email,
      displayName: data.displayName || email.split('@')[0],
      idToken: data.idToken,
      refreshToken: data.refreshToken,
    };
    await AsyncStorage.setItem('user', JSON.stringify(user));
    return user;
  },

  async refreshToken() {
    const raw = await AsyncStorage.getItem('user');
    if (!raw) return null;
    const user = JSON.parse(raw);
    const res = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: user.refreshToken }),
      }
    );
    const data = await res.json();
    if (data.error) return null;
    const updated = { ...user, idToken: data.id_token, refreshToken: data.refresh_token };
    await AsyncStorage.setItem('user', JSON.stringify(updated));
    return updated;
  },

  async currentUser() {
    const raw = await AsyncStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  },

  async logout() {
    await AsyncStorage.removeItem('user');
  },
};
