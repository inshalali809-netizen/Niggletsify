import { authService } from './authService';
import { dbGet, dbSet, dbDelete } from './db';

export const friendService = {
  async sendRequest(targetId, targetName) {
    const me = authService.getUser();
    await dbSet(`friendRequests/${targetId}/${me.uid}`, {
      senderId: me.uid, senderName: me.displayName, timestamp: Date.now()
    });
  },

  async acceptRequest(senderId, senderName) {
    const me = authService.getUser();
    await dbDelete(`friendRequests/${me.uid}/${senderId}`);
    await dbSet(`friends/${me.uid}/${senderId}`, { displayName: senderName });
    await dbSet(`friends/${senderId}/${me.uid}`, { displayName: me.displayName });
  },

  async rejectRequest(senderId) {
    const me = authService.getUser();
    await dbDelete(`friendRequests/${me.uid}/${senderId}`);
  },

  async getIncomingRequests() {
    const me = authService.getUser();
    const data = await dbGet(`friendRequests/${me.uid}`);
    if (!data || typeof data !== 'object') return [];
    const blocked = await friendService.getBlockedIds();
    return Object.entries(data)
      .map(([senderId, info]) => ({ senderId, ...info }))
      .filter(r => !blocked.includes(r.senderId));
  },

  async getUsersWithStatus(searchTerm) {
    const me = authService.getUser();
    if (!searchTerm || searchTerm.length < 2) return [];
    const term = searchTerm.toLowerCase().trim();

    const [usersData, friendsData, myChatsData, blockedData] = await Promise.all([
      dbGet('users'),
      dbGet(`friends/${me.uid}`),
      dbGet(`userChats/${me.uid}`),
      dbGet(`blocked/${me.uid}`),
    ]);

    if (!usersData) return [];

    const friendIds = friendsData ? Object.keys(friendsData) : [];
    const myChatIds = myChatsData ? Object.keys(myChatsData) : [];
    const blockedIds = blockedData ? Object.keys(blockedData) : [];

    const hasExistingChat = (otherUid) => {
      const directChatId = [me.uid, otherUid].sort().join('_');
      return myChatIds.includes(directChatId);
    };

    const allMatchingUsers = Object.values(usersData).filter(u => {
      if (u.uid === me.uid) return false;
      if (blockedIds.includes(u.uid)) return false;
      const name = (u.displayName || '').toLowerCase();
      return name.includes(term);
    });

    const sentChecks = await Promise.all(
      allMatchingUsers.map(u => dbGet(`friendRequests/${u.uid}/${me.uid}`))
    );

    return allMatchingUsers.map((u, i) => ({
      ...u,
      isFriend: friendIds.includes(u.uid) || hasExistingChat(u.uid),
      requestSent: sentChecks[i] !== null,
    }));
  },

  // ---- BLOCKING ----
  async blockUser(targetId, targetName) {
    const me = authService.getUser();
    await dbSet(`blocked/${me.uid}/${targetId}`, { displayName: targetName, blockedAt: Date.now() });
    // Remove from friends both ways
    await dbDelete(`friends/${me.uid}/${targetId}`);
    await dbDelete(`friends/${targetId}/${me.uid}`);
    // Remove any pending requests
    await dbDelete(`friendRequests/${me.uid}/${targetId}`);
    await dbDelete(`friendRequests/${targetId}/${me.uid}`);
    // Remove chat from my list (other person keeps theirs but can't message - handled by isBlocked checks)
    const chatId = [me.uid, targetId].sort().join('_');
    await dbDelete(`userChats/${me.uid}/${chatId}`);
  },

  async unblockUser(targetId) {
    const me = authService.getUser();
    await dbDelete(`blocked/${me.uid}/${targetId}`);
  },

  async getBlockedIds() {
    const me = authService.getUser();
    const data = await dbGet(`blocked/${me.uid}`);
    return data ? Object.keys(data) : [];
  },

  async getBlockedUsers() {
    const me = authService.getUser();
    const data = await dbGet(`blocked/${me.uid}`);
    if (!data || typeof data !== 'object') return [];
    return Object.entries(data).map(([uid, info]) => ({ uid, ...info }));
  },

  // Check if either user has blocked the other (for a direct chat)
  async isBlockedEitherWay(otherUid) {
    const me = authService.getUser();
    const [iBlocked, theyBlocked] = await Promise.all([
      dbGet(`blocked/${me.uid}/${otherUid}`),
      dbGet(`blocked/${otherUid}/${me.uid}`),
    ]);
    return !!iBlocked || !!theyBlocked;
  },

  listenToRequests(callback) {
    let active = true;
    const poll = async () => {
      if (!active) return;
      const reqs = await friendService.getIncomingRequests();
      if (active) callback(reqs || []);
    };
    poll();
    const iv = setInterval(poll, 8000);
    return () => { active = false; clearInterval(iv); };
  },
};
