import { authService } from './authService';
import { FIREBASE_CONFIG } from './firebaseConfig';

const DB = FIREBASE_CONFIG.databaseURL;

const getToken = async () => {
  let user = await authService.currentUser();
  if (!user) return null;
  return user.idToken;
};

const dbGet = async (path) => {
  const token = await getToken();
  const res = await fetch(`${DB}/${path}.json?auth=${token}`);
  if (res.status === 401) {
    const user = await authService.refreshToken();
    if (!user) return null;
    const res2 = await fetch(`${DB}/${path}.json?auth=${user.idToken}`);
    return res2.json();
  }
  return res.json();
};

const dbSet = async (path, data) => {
  const token = await getToken();
  await fetch(`${DB}/${path}.json?auth=${token}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

const dbPush = async (path, data) => {
  const token = await getToken();
  const res = await fetch(`${DB}/${path}.json?auth=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const chatService = {
  async sendMessage(chatId, text) {
    const user = await authService.currentUser();
    const msg = {
      text,
      type: 'text',
      senderId: user.uid,
      senderName: user.displayName,
      timestamp: Date.now(),
    };
    await dbPush(`messages/${chatId}`, msg);
    await dbSet(`chats/${chatId}/lastMessage`, {
      text,
      timestamp: Date.now(),
      senderId: user.uid,
    });
  },

  listenToMessages(chatId, callback) {
    let lastTimestamp = 0;
    const poll = async () => {
      try {
        const data = await dbGet(`messages/${chatId}`);
        if (data && typeof data === 'object') {
          const msgs = Object.values(data)
            .sort((a, b) => a.timestamp - b.timestamp);
          if (msgs.length > 0 && msgs[msgs.length - 1].timestamp !== lastTimestamp) {
            lastTimestamp = msgs[msgs.length - 1].timestamp;
            callback(msgs);
          }
        }
      } catch (e) {}
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  },

  async getChats() {
    const user = await authService.currentUser();
    const chatIds = await dbGet(`userChats/${user.uid}`);
    if (!chatIds) return [];
    const ids = Object.keys(chatIds);
    const chats = await Promise.all(
      ids.map(id => dbGet(`chats/${id}`))
    );
    return chats
      .filter(Boolean)
      .sort((a, b) => (b.lastMessage?.timestamp || b.createdAt) - (a.lastMessage?.timestamp || a.createdAt));
  },

  listenToChats(callback) {
    const poll = async () => {
      try {
        const chats = await chatService.getChats();
        callback(chats);
      } catch (e) {}
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  },

  async createDirectChat(otherUserId, otherUserName) {
    const user = await authService.currentUser();
    const chatId = [user.uid, otherUserId].sort().join('_');
    const existing = await dbGet(`chats/${chatId}`);
    if (!existing) {
      await dbSet(`chats/${chatId}`, {
        id: chatId,
        type: 'direct',
        members: { [user.uid]: true, [otherUserId]: true },
        memberNames: { [user.uid]: user.displayName, [otherUserId]: otherUserName },
        createdAt: Date.now(),
      });
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
    const user = await authService.currentUser();
    const data = await dbGet('users');
    if (!data) return [];
    return Object.values(data).filter(u => u.uid !== user.uid);
  },
};
