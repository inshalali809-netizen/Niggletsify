import AsyncStorage from '@react-native-async-storage/async-storage';
import { FIREBASE_CONFIG } from './firebaseConfig';

const API_KEY = FIREBASE_CONFIG.apiKey;
const KEY = 'niggletsify_user';
let _user = null;

export const authService = {
  async loadUser() {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        _user = JSON.parse(raw);
        await authService.ensureFreshToken();
        return _user;
      }
    } catch (e) {}
    return null;
  },

  async ensureFreshToken() {
    try {
      if (!_user?.refreshToken) return false;
      const res = await fetch(
        `https://securetoken.googleapis.com/v1/token?key=${API_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: _user.refreshToken }) }
      );
      const data = await res.json();
      if (data.id_token) {
        _user = { ..._user, idToken: data.id_token, refreshToken: data.refresh_token };
        await AsyncStorage.setItem(KEY, JSON.stringify(_user));
        return true;
      }
    } catch (e) {}
    return false;
  },

  async register(email, password, displayName) {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }) }
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message.replace(/_/g, ' '));
    _user = { uid: data.localId, email, displayName, idToken: data.idToken, refreshToken: data.refreshToken };
    await AsyncStorage.setItem(KEY, JSON.stringify(_user));
    const { dbSet } = require('./db');
    await dbSet(`users/${data.localId}`, { uid: data.localId, displayName, email, createdAt: Date.now() });
    return _user;
  },

  async login(email, password) {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }) }
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message.replace(/_/g, ' '));
    _user = { uid: data.localId, email, displayName: data.displayName || email.split('@')[0], idToken: data.idToken, refreshToken: data.refreshToken };
    await AsyncStorage.setItem(KEY, JSON.stringify(_user));
    return _user;
  },

  getUser() { return _user; },

  updateDisplayName(newName) {
    if (_user) { _user.displayName = newName; AsyncStorage.setItem(KEY, JSON.stringify(_user)); }
  },

  async logout() {
    _user = null;
    await AsyncStorage.removeItem(KEY);
  },
};
