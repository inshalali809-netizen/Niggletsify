import { authService } from './authService';
import { FIREBASE_CONFIG } from './firebaseConfig';

const DB = FIREBASE_CONFIG.databaseURL;

const getToken = () => authService.getUser()?.idToken || '';

const fetchWithAuth = async (url, options = {}) => {
  let token = getToken();
  let res = await fetch(`${url}?auth=${token}`, options);
  if (res.status === 401) {
    await authService.ensureFreshToken();
    token = getToken();
    res = await fetch(`${url}?auth=${token}`, options);
  }
  return res;
};

export const dbGet = async (path) => {
  try {
    const res = await fetchWithAuth(`${DB}/${path}.json`);
    if (!res.ok) return null;
    return res.json();
  } catch (e) { return null; }
};

export const dbSet = async (path, data) => {
  try {
    await fetchWithAuth(`${DB}/${path}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (e) {}
};

export const dbPush = async (path, data) => {
  try {
    const res = await fetchWithAuth(`${DB}/${path}.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  } catch (e) { return null; }
};

export const dbDelete = async (path) => {
  try {
    await fetchWithAuth(`${DB}/${path}.json`, { method: 'DELETE' });
  } catch (e) {}
};
