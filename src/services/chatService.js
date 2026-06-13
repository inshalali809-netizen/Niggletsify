import { AppState, NativeModules } from 'react-native';
import { authService } from './authService';
import { dbGet, dbSet, dbPush, dbDelete } from './db';

const { NotificationModule } = NativeModules;

const showNotif = (title, body) => {
  try {
    if (AppState.currentState !== 'active' && NotificationModule) {
      NotificationModule.show(title, body);
    }
  } catch (e) {}
};

export const chatService = {
  async sendMessage(chatId, text) {
    const user = authService.getUser();
    await dbPush(`messages/${chatId}`, { text, type: 'text', senderId: user.uid, senderName: user.displayName, timestamp: Date.now() });
    await dbSet(`chats/${chatId}/lastMessage`, { text, timestamp: Date.now(), senderId: user.uid });
  },

  async sendImageMessage(chatId, base64Data) {
    const user = authService.getUser();
    await dbPush(`messages/${chatId}`, { imageData: base64Data, type: 'image', senderId: user.uid, senderName: user.displayName, timestamp: Date.now() });
    await dbSet(`chats/${chatId}/lastMessage`, { text: '📷 Photo', timestamp: Date.now(), senderId: user.uid });
  },

  async sendVoiceMessage(chatId, base64Data, duration) {
    const user = authService.getUser();
    await dbPush(`messages/${chatId}`, { voiceData: base64Data, duration, type: 'voice', senderId: user.uid, senderName: user.displayName, timestamp: Date.now() });
    await dbSet(`chats/${chatId}/lastMessage`, { text: '🎤 Voice message', timestamp: Date.now(), senderId: user.uid });
  },

  async deleteMessage(chatId, firebaseKey) {
    if (!firebaseKey) return;
    await dbDelete(`messages/${chatId}/${firebaseKey}`);
  },

  listenToMessages(chatId, callback) {
    let active = true;
    let last = 0;
    const uid = authService.getUser()?.uid;
    const poll = async () => {
      if (!active) return;
      const data = await dbGet(`messages/${chatId}`);
      if (!active) return;
      if (data && typeof data === 'object') {
        const msgs = Object.entries(data)
          .map(([key, val]) => ({ ...val, firebaseKey: key }))
          .sort((a, b) => a.timestamp - b.timestamp);
        if (msgs.length > 0 && msgs[msgs.length - 1].timestamp !== last) {
          const latestMsg = msgs[msgs.length - 1];
          last = latestMsg.timestamp;
          // Show notification if message is from someone else
          if (latestMsg.senderId !== uid && last !== 0) {
            const body = latestMsg.type === 'image' ? '📷 Sent a photo'
              : latestMsg.type === 'voice' ? '🎤 Sent a voice message'
              : latestMsg.text;
            showNotif(latestMsg.senderName, body);
          }
          callback(msgs);
        }
      } else { callback([]); }
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
    return chats.filter(Boolean).sort((a, b) =>
      (b.lastMessage?.timestamp || b.createdAt) - (a.lastMessage?.timestamp || a.createdAt));
  },

  listenToChats(callback) {
    let active = true;
    const uid = authService.getUser()?.uid;
    let lastTimestamps = {};
    const poll = async () => {
      if (!active) return;
      const chats = await chatService.getChats();
      if (!active) return;
      // Check for new messages in any chat and notify
      if (chats) {
        chats.forEach(chat => {
          const ts = chat.lastMessage?.timestamp;
          const senderId = chat.lastMessage?.senderId;
          if (ts && senderId !== uid && lastTimestamps[chat.id] && ts > lastTimestamps[chat.id]) {
            const name = chatService.getChatName(chat, uid);
            const body = chat.lastMessage?.text || 'New message';
            showNotif(name, body);
          }
          if (ts) lastTimestamps[chat.id] = ts;
        });
        callback(chats);
      }
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

  async createGroupChat(name, memberIds, memberObjects) {
    const user = authService.getUser();
    const chatId = 'group_' + Date.now();
    const members = { [user.uid]: true };
    const memberNames = { [user.uid]: user.displayName };
    memberIds.forEach((id, i) => { members[id] = true; memberNames[id] = memberObjects[i].displayName; });
    await dbSet(`chats/${chatId}`, { id: chatId, name, type: 'group', members, memberNames, createdAt: Date.now() });
    for (const id of [...memberIds, user.uid]) await dbSet(`userChats/${id}/${chatId}`, true);
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
