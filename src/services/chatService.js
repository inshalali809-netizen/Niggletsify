import { authService } from './authService';
import { FIREBASE_CONFIG } from './firebaseConfig';

const DB = FIREBASE_CONFIG.databaseURL;

const getToken = () => authService.getUser()?.idToken || '';

const dbGet = async (path) => {
  const token = getToken();
  const res = await fetch(`${DB}/${path}.json?auth=${token}`);
  if (!res.ok) return null;
  return res.json();
};

const dbSet = async (path, data) => {
  const token = getToken();
  await fetch(`${DB}/${path}.json?auth=${token}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

const dbPush = async (path, data) => {
  const token = getToken();
  const res = await fetch(`${DB}/${path}.json?auth=${token}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const chatService = {
  async sendMessage(chatId, text) {
    const user = authService.getUser();
    await dbPush(`messages/${chatId}`, { text, type: 'text', senderId: user.uid, senderName: user.displayName, timestamp: Date.now() });
    await dbSet(`chats/${chatId}/lastMessage`, { text, timestamp: Date.now(), senderId: user.uid });
  },

  listenToMessages(chatId, callback) {
    let active = true;
    let last = 0;
    const poll = async () => {
      if (!active) return;
      try {
        const data = await dbGet(`messages/${chatId}`);
        if (!active) return;
        if (data && typeof data === 'object') {
          const msgs = Object.values(data).sort((a, b) => a.timestamp - b.timestamp);
          if (msgs.length > 0 && msgs[msgs.length-1].timestamp !== last) {
            last = msgs[msgs.length-1].timestamp;
            callback(msgs);
          }
        } else {
          callback([]);
        }
      } catch (e) { if (active) callback([]); }
    };
    poll();
    const iv = setInterval(poll, 3000);
    return () => { active = false; clearInterval(iv); };
  },

  async getChats() {
    const user = authService.getUser();
    if (!user) return [];
    const chatIds = await dbGet(`userChats/${user.uid}`);
    if (!chatIds || typeof chatIds !== 'object') return [];
    const ids = Object.keys(chatIds);
    const chats = await Promise.all(ids.map(id => dbGet(`chats/${id}`)));
    return chats.filter(Boolean).sort((a, b) => (b.lastMessage?.timestamp || b.createdAt) - (a.lastMessage?.timestamp || a.createdAt));
  },

  listenToChats(callback) {
    let active = true;
    const poll = async () => {
      if (!active) return;
      try {
        const chats = await chatService.getChats();
        if (active) callback(chats);
      } catch (e) { if (active) callback([]); }
    };
    poll();
    const iv = setInterval(poll, 5000);
    return () => { active = false; clearInterval(iv); };
  },

  async createDirectChat(otherUserId, otherUserName) {
    const user = authService.getUser();
    const chatId = [user.uid, otherUserId].sort().join('_');
    const existing = await dbGet(`chats/${chatId}`);
    if (!existing) {
      await dbSet(`chats/${chatId}`, { id: chatId, type: 'direct', members: { [user.uid]: true, [otherUserId]: true }, memberNames: { [user.uid]: user.displayName, [otherUserId]: otherUserName }, createdAt: Date.now() });
      await dbSet(`userChats/${user.uid}/${chatId}`, true);
      await dbSet(`userChats/${otherUserId}/${chatId}`, true);
    }
    return chatId;
  },

  getChatName(chat, currentUid) {
    if (chat.type === 'group') return chat.name;
    const otherId = Object.keys(chat.members || {}).find(id => id !== currentUid);
    return chat.memberNames?.[otherId] || 'Chat';
  },

  async getUsers() {
    const user = authService.getUser();
    const data = await dbGet('users');
    if (!data) return [];
    return Object.values(data).filter(u => u.uid !== user?.uid);
  },
};
