const BASE = '';

function getToken() {
  return localStorage.getItem('token') || '';
}

async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const resp = await fetch(BASE + url, { ...options, headers });
    const text = await resp.text();
    const data = text ? JSON.parse(text) : null;
    if (!resp.ok) throw new Error(data?.error || data?.message || '请求失败');
    return data;
  } catch (e) {
    if (e.message === 'Failed to fetch') throw new Error('网络连接失败');
    throw e;
  }
}

export function uploadFile(file) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    const token = getToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 400) reject(new Error(data.error || '上传失败'));
        else resolve(data);
      } catch { reject(new Error('上传失败')); }
    };
    xhr.onerror = () => reject(new Error('上传失败'));
    xhr.send(fd);
  });
}

export const api = {
  // Auth
  signup: (username, password) => request('/api/auth/signup', { method: 'POST', body: JSON.stringify({ username, password }) }),
  signin: (username, password) => request('/api/auth/signin', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getUser: () => request('/api/auth/user'),

  // Registration
  checkReg: () => request('/api/registration/check'),
  applyReg: () => request('/api/registration/apply', { method: 'POST' }),
  regStatus: () => request('/api/registration/status'),
  createChar: (path_id, profession_id) => request('/api/registration/create-character', { method: 'POST', body: JSON.stringify({ path_id, profession_id }) }),

  // Paths & Professions
  getPaths: () => request('/api/paths'),
  getProfessions: () => request('/api/professions'),

  // Talents
  getTalents: () => request('/api/talents'),
  createTalent: (data) => request('/api/talents', { method: 'POST', body: JSON.stringify(data) }),
  updateTalent: (id, data) => request(`/api/talents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTalent: (id) => request(`/api/talents/${id}`, { method: 'DELETE' }),
  batchTalents: (data) => request('/api/talents/batch', { method: 'POST', body: JSON.stringify(data) }),

  // Items
  getItems: () => request('/api/items'),
  getItemsByGrade: (grade) => request(`/api/items/grade/${grade}`),
  createItem: (data) => request('/api/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id, data) => request(`/api/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (id) => request(`/api/items/${id}`, { method: 'DELETE' }),
  batchItems: (data) => request('/api/items/batch', { method: 'POST', body: JSON.stringify(data) }),

  // Characters
  getMyChar: () => request('/api/characters/me'),
  getChar: (id) => request(`/api/characters/${id}`),
  getCharTalents: (id) => request(`/api/characters/${id}/talents`),
  addCharTalent: (id, talent_id) => request(`/api/characters/${id}/talents`, { method: 'POST', body: JSON.stringify({ talent_id }) }),
  delCharTalent: (id, talent_id) => request(`/api/characters/${id}/talents/${talent_id}`, { method: 'DELETE' }),
  getCharItems: (id) => request(`/api/characters/${id}/items`),
  updateCharPoints: (id, data) => request(`/api/characters/${id}/points`, { method: 'PUT', body: JSON.stringify(data) }),
  changePath: (id, new_path_id) => request(`/api/characters/${id}/change-path`, { method: 'POST', body: JSON.stringify({ new_path_id }) }),
  equip: (id, data) => request(`/api/characters/${id}/equip`, { method: 'PUT', body: JSON.stringify(data) }),
  unequip: (id) => request(`/api/characters/${id}/unequip`, { method: 'PUT' }),
  discardItems: (id, data) => request(`/api/characters/${id}/discard`, { method: 'POST', body: JSON.stringify(data) }),
  exchangeItems: (id, item_ids) => request(`/api/characters/${id}/exchange`, { method: 'POST', body: JSON.stringify({ item_ids }) }),
  getCharAchievements: (id) => request(`/api/characters/${id}/achievements`),
  getCurseTalents: (id) => request(`/api/characters/${id}/curse-talents`),
  getCharBans: (id) => request(`/api/characters/${id}/bans`),

  // Trials
  getTrials: (status) => request(`/api/trials${status ? `?status=${status}` : ''}`),
  getTrial: (id) => request(`/api/trials/${id}`),
  createTrial: (data) => request('/api/trials', { method: 'POST', body: JSON.stringify(data) }),
  updateTrialStatus: (id, status) => request(`/api/trials/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  deleteTrial: (id) => request(`/api/trials/${id}`, { method: 'DELETE' }),
  featureTrial: (id, featured) => request(`/api/trials/${id}/featured`, { method: 'PUT', body: JSON.stringify({ featured }) }),
  getParticipants: (id) => request(`/api/trials/${id}/participants`),
  joinTrial: (id) => request(`/api/trials/${id}/join`, { method: 'POST' }),
  leaveTrial: (id) => request(`/api/trials/${id}/leave`, { method: 'POST' }),
  forceQuit: (id) => request(`/api/trials/${id}/force-quit`, { method: 'POST' }),
  updateScore: (tid, pid, data) => request(`/api/trials/${tid}/participants/${pid}/score`, { method: 'PUT', body: JSON.stringify(data) }),
  setCoHost: (tid, charId) => request(`/api/trials/${tid}/co-host/${charId}`, { method: 'PUT' }),
  removeCoHost: (tid, charId) => request(`/api/trials/${tid}/co-host/${charId}`, { method: 'DELETE' }),
  addObserver: (tid, data) => request(`/api/trials/${tid}/observer`, { method: 'POST', body: JSON.stringify(data) }),
  removeObserver: (tid, charId) => request(`/api/trials/${tid}/observer/${charId}`, { method: 'DELETE' }),

  // Trial inventory & trades
  getTrialInv: (tid, charId) => request(`/api/trials/${tid}/inventory/${charId}`),
  addTrialInv: (tid, data) => request(`/api/trials/${tid}/inventory`, { method: 'POST', body: JSON.stringify(data) }),
  delTrialInv: (tid, itemId, data) => request(`/api/trials/${tid}/inventory/${itemId}`, { method: 'DELETE', body: JSON.stringify(data) }),
  syncTrialInv: (tid, data) => request(`/api/trials/${tid}/inventory`, { method: 'PUT', body: JSON.stringify(data) }),
  getTrialTrades: (tid, cid) => request(`/api/trials/${tid}/trades${cid ? `?character_id=${cid}` : ''}`),
  createTrade: (tid, data) => request(`/api/trials/${tid}/trades`, { method: 'POST', body: JSON.stringify(data) }),
  acceptTrade: (tid, tradeId) => request(`/api/trials/${tid}/trades/${tradeId}/accept`, { method: 'POST' }),
  rejectTrade: (tid, tradeId) => request(`/api/trials/${tid}/trades/${tradeId}/reject`, { method: 'POST' }),
  cancelTrade: (tid, tradeId) => request(`/api/trials/${tid}/trades/${tradeId}/cancel`, { method: 'POST' }),
  settleTrial: (tid) => request(`/api/trials/${tid}/settle`, { method: 'POST' }),

  // Market
  getMarket: () => request('/api/market'),
  createListing: (data) => request('/api/market', { method: 'POST', body: JSON.stringify(data) }),
  buyListing: (id) => request(`/api/market/${id}/buy`, { method: 'POST' }),
  cancelListing: (id) => request(`/api/market/${id}/cancel`, { method: 'POST' }),
  getBids: (id) => request(`/api/market/${id}/bids`),
  placeBid: (id, amount) => request(`/api/market/${id}/bid`, { method: 'POST', body: JSON.stringify({ bid_amount: amount }) }),

  // Lottery
  getLotteryPool: (type) => request(`/api/lottery/${type}`),
  drawLottery: (type) => request(`/api/lottery/${type}/draw`, { method: 'POST' }),

  // Ranking
  getGlobalRank: (limit) => request(`/api/ranking/global${limit ? `?limit=${limit}` : ''}`),
  getPathRank: (pathId, limit) => request(`/api/ranking/path/${pathId}${limit ? `?limit=${limit}` : ''}`),
  getOppositeRank: (pathName, limit) => request(`/api/ranking/opposite/${pathName}${limit ? `?limit=${limit}` : ''}`),

  // Announcements
  getAnnouncements: () => request('/api/announcements'),
  getAllAnnouncements: () => request('/api/announcements/all'),
  createAnnouncement: (data) => request('/api/announcements', { method: 'POST', body: JSON.stringify(data) }),
  updateAnnouncement: (id, data) => request(`/api/announcements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAnnouncement: (id) => request(`/api/announcements/${id}`, { method: 'DELETE' }),

  // Host applications
  getHostApps: (status) => request(`/api/host-applications${status ? `?status=${status}` : ''}`),
  applyHost: () => request('/api/host-applications', { method: 'POST' }),
  reviewHostApp: (id, data) => request(`/api/host-applications/${id}/review`, { method: 'PUT', body: JSON.stringify(data) }),

  // Reports
  getReports: () => request('/api/reports'),
  createReport: (data) => request('/api/reports', { method: 'POST', body: JSON.stringify(data) }),
  updateReport: (id, data) => request(`/api/reports/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),

  // Bans
  banChar: (id, data) => request(`/api/characters/${id}/ban`, { method: 'POST', body: JSON.stringify(data) }),
  unbanChar: (id) => request(`/api/characters/${id}/unban`, { method: 'POST' }),

  // Achievements
  getAchievements: () => request('/api/achievements'),
  createAchievement: (data) => request('/api/achievements', { method: 'POST', body: JSON.stringify(data) }),
  updateAchievement: (id, data) => request(`/api/achievements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAchievement: (id) => request(`/api/achievements/${id}`, { method: 'DELETE' }),
  awardAchievement: (charId, data) => request(`/api/characters/${charId}/achievements`, { method: 'POST', body: JSON.stringify(data) }),
  removeAchievement: (charId, achId) => request(`/api/characters/${charId}/achievements/${achId}`, { method: 'DELETE' }),

  // Game settings
  getSettings: () => request('/api/game-settings'),
  updateSetting: (key, value) => request(`/api/game-settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),

  // Registration applications
  getRegApps: (status) => request(`/api/registration/applications${status ? `?status=${status}` : ''}`),
  reviewRegApp: (id, data) => request(`/api/registration/applications/${id}/review`, { method: 'PUT', body: JSON.stringify(data) }),

  // Locations & chat
  getLocations: (tid) => request(`/api/trials/${tid}/locations`),
  createLocation: (tid, data) => request(`/api/trials/${tid}/locations`, { method: 'POST', body: JSON.stringify(data) }),
  getLocationMsgs: (locId, params) => request(`/api/locations/${locId}/messages${params ? `?${new URLSearchParams(params)}` : ''}`),
  sendLocationMsg: (locId, data) => request(`/api/locations/${locId}/messages`, { method: 'POST', body: JSON.stringify(data) }),
  joinLocation: (locId, data) => request(`/api/locations/${locId}/join`, { method: 'POST', body: JSON.stringify(data) }),
  leaveLocation: (locId, data) => request(`/api/locations/${locId}/leave`, { method: 'POST', body: JSON.stringify(data) }),

  // Private messages
  getPrivateMsgs: (tid, charId, otherId) => request(`/api/trials/${tid}/private-messages/${charId}/${otherId}`),
  sendPrivateMsg: (tid, data) => request(`/api/trials/${tid}/private-messages`, { method: 'POST', body: JSON.stringify(data) }),
  markRead: (ids) => request('/api/private-messages/read', { method: 'PUT', body: JSON.stringify({ message_ids: ids }) }),
  getUnread: (tid, charId) => request(`/api/trials/${tid}/unread/${charId}`),

  // Host ratings
  getRatings: (tid) => request(`/api/trials/${tid}/ratings`),
  createRating: (tid, data) => request(`/api/trials/${tid}/ratings`, { method: 'POST', body: JSON.stringify(data) }),
  checkRated: (tid) => request(`/api/trials/${tid}/ratings/check`),

  // Battle system
  getBattleStates: (tid) => request(`/api/trials/${tid}/battle-states`),
  initBattle: (tid, data) => request(`/api/trials/${tid}/battle-init`, { method: 'POST', body: JSON.stringify(data) }),
  updateBattle: (tid, charId, data) => request(`/api/trials/${tid}/battle-states/${charId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Talent notifications
  getTalentNotifs: (tid) => request(`/api/trials/${tid}/talent-notifications`),
  processNotif: (id) => request(`/api/talent-notifications/${id}/process`, { method: 'POST' }),
  processAllNotifs: (tid) => request(`/api/trials/${tid}/talent-notifications/process-all`, { method: 'POST' }),

  // Cooldowns
  getCooldowns: (tid, charId) => request(`/api/trials/${tid}/cooldowns/${charId}`),

  // Instant draw
  getDrawRecord: (tid, charId, isHost) => request(`/api/trials/${tid}/draw-records/${charId}${isHost ? '?is_host=true' : ''}`),
  createDrawRecord: (tid, data) => request(`/api/trials/${tid}/draw-records`, { method: 'POST', body: JSON.stringify(data) }),
  updateDrawRecord: (tid, charId, data) => request(`/api/trials/${tid}/draw-records/${charId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Trial completion
  checkComplete: (tid) => request(`/api/trials/${tid}/check-complete`, { method: 'POST' }),
  settleHost: (tid) => request(`/api/trials/${tid}/settle-host`, { method: 'POST' }),

  // Nickname
  setNickname: (tid, pid, nickname) => request(`/api/trials/${tid}/participants/${pid}/nickname`, { method: 'PUT', body: JSON.stringify({ nickname }) }),

  // Account deletion
  getDeletionRequests: () => request('/api/account-deletion/requests'),
  createDeletionRequest: (data) => request('/api/account-deletion/requests', { method: 'POST', body: JSON.stringify(data) }),
  approveDeletion: (id, data) => request(`/api/account-deletion/requests/${id}/approve`, { method: 'POST', body: JSON.stringify(data) }),
  executeDeletion: (id) => request(`/api/account-deletion/requests/${id}/execute`, { method: 'POST' }),

  // Trade alerts
  getTradeAlerts: () => request('/api/trade-alerts'),
  updateTradeAlert: (id, data) => request(`/api/trade-alerts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Characters list
  getCharacters: () => request('/api/characters'),
};
