import { FIREBASE_CONFIG } from './firebaseConfig';

const API_KEY = FIREBASE_CONFIG.apiKey;
const DB = FIREBASE_CONFIG.databaseURL;

let _user = null;

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
    _user = { uid: data.localId, email, displayName, idToken: data.idToken, refreshToken: data.refreshToken };
    await fetch(`${DB}/users/${data.localId}.json?auth=${data.idToken}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: data.localId, displayName, email, createdAt: Date.now() }),
    });
    return _user;
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
    _user = {
      uid: data.localId,
      email,
      displayName: data.displayName || email.split('@')[0],
      idToken: data.idToken,
      refreshToken: data.refreshToken,
    };
    return _user;
  },

  getUser() {
    return _user;
  },

  updateDisplayName(newName) {
    if (_user) _user.displayName = newName;
  },

  logout() {
    _user = null;
  },
};
