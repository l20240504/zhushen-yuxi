const BASE = ''

function getToken() {
  return localStorage.getItem('token') || ''
}

async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(BASE + url, { ...options, headers })
  const text = await res.text()
  let data
  try { data = text ? JSON.parse(text) : {} } catch { data = text }
  if (!res.ok) throw new Error(data?.error || data?.message || '请求失败')
  return data
}

export const api = {
  // Auth
  signup: (username, password) => request('/api/auth/signup', { method: 'POST', body: JSON.stringify({ username, password }) }),
  signin: (username, password) => request('/api/auth/signin', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getUser: () => request('/api/auth/user'),

  // Paths & Professions
  getPaths: () => request('/api/paths'),
  getProfessions: () => request('/api/professions'),

  // Talents
  getTalents: () => request('/api/talents'),
  addTalent: (data) => request('/api/talents', { method: 'POST', body: JSON.stringify(data) }),
  updateTalent: (id, data) => request(`/api/talents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTalent: (id) => request(`/api/talents/${id}`, { method: 'DELETE' }),

  // Items
  getItems: () => request('/api/items'),
  getItemsByGrade: (grade) => request(`/api/items/grade/${grade}`),
  addItem: (data) => request('/api/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id, data) => request(`/api/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (id) => request(`/api/items/${id}`, { method: 'DELETE' }),

  // Characters
  getMyCharacter: () => request('/api/characters/me'),
  getCharacter: (id) => request(`/api/characters/${id}`),
  getCharacters: () => request('/api/characters'),
  createCharacter: (path_id, profession_id) => request('/api/characters', { method: 'POST', body: JSON.stringify({ path_id, profession_id }) }),
  updatePoints: (id, data) => request(`/api/characters/${id}/points`, { method: 'PUT', body: JSON.stringify(data) }),
  changePath: (id, new_path_id) => request(`/api/characters/${id}/change-path`, { method: 'POST', body: JSON.stringify({ new_path_id }) }),
  equipItem: (id, data) => request(`/api/characters/${id}/equip`, { method: 'PUT', body: JSON.stringify(data) }),
  unequipItem: (id) => request(`/api/characters/${id}/unequip`, { method: 'PUT' }),

  // Character talents
  getCharacterTalents: (id) => request(`/api/characters/${id}/talents`),
  addCharacterTalent: (id, talent_id) => request(`/api/characters/${id}/talents`, { method: 'POST', body: JSON.stringify({ talent_id }) }),
  deleteCharacterTalent: (id, talentId) => request(`/api/characters/${id}/talents/${talentId}`, { method: 'DELETE' }),

  // Character items
  getCharacterItems: (id) => request(`/api/characters/${id}/items`),
  discardItems: (id, data) => request(`/api/characters/${id}/discard`, { method: 'POST', body: JSON.stringify(data) }),
  exchangeItems: (id, item_ids) => request(`/api/characters/${id}/exchange`, { method: 'POST', body: JSON.stringify({ item_ids }) }),

  // Trials
  getTrials: (status) => request(`/api/trials${status ? `?status=${status}` : ''}`),
  getTrial: (id) => request(`/api/trials/${id}`),
  createTrial: (data) => request('/api/trials', { method: 'POST', body: JSON.stringify(data) }),
  updateTrialStatus: (id, status) => request(`/api/trials/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  deleteTrial: (id) => request(`/api/trials/${id}`, { method: 'DELETE' }),
  setTrialFeatured: (id, featured) => request(`/api/trials/${id}/featured`, { method: 'PUT', body: JSON.stringify({ featured }) }),
  getTrialParticipants: (id) => request(`/api/trials/${id}/participants`),
  joinTrial: (id) => request(`/api/trials/${id}/join`, { method: 'POST' }),
  leaveTrial: (id) => request(`/api/trials/${id}/leave`, { method: 'POST' }),
  forceQuitTrial: (id) => request(`/api/trials/${id}/force-quit`, { method: 'POST' }),
  updateParticipantScore: (trialId, pid, data) => request(`/api/trials/${trialId}/participants/${pid}/score`, { method: 'PUT', body: JSON.stringify(data) }),
  setCoHost: (trialId, charId) => request(`/api/trials/${trialId}/co-host/${charId}`, { method: 'PUT' }),
  removeCoHost: (trialId, charId) => request(`/api/trials/${trialId}/co-host/${charId}`, { method: 'DELETE' }),
  joinAsObserver: (trialId, data) => request(`/api/trials/${trialId}/observer`, { method: 'POST', body: JSON.stringify(data) }),
  settleTrial: (trialId) => request(`/api/trials/${trialId}/settle`, { method: 'POST' }),

  // Trial inventory & trades
  getTrialInventory: (trialId, charId) => request(`/api/trials/${trialId}/inventory/${charId}`),
  addTrialInventory: (trialId, data) => request(`/api/trials/${trialId}/inventory`, { method: 'POST', body: JSON.stringify(data) }),
  updateTrialInventory: (trialId, data) => request(`/api/trials/${trialId}/inventory`, { method: 'PUT', body: JSON.stringify(data) }),
  getTrialTrades: (trialId, charId) => request(`/api/trials/${trialId}/trades${charId ? `?character_id=${charId}` : ''}`),
  createTrade: (trialId, data) => request(`/api/trials/${trialId}/trades`, { method: 'POST', body: JSON.stringify(data) }),
  acceptTrade: (trialId, tradeId) => request(`/api/trials/${trialId}/trades/${tradeId}/accept`, { method: 'POST' }),
  rejectTrade: (trialId, tradeId) => request(`/api/trials/${trialId}/trades/${tradeId}/reject`, { method: 'POST' }),
  cancelTrade: (trialId, tradeId) => request(`/api/trials/${trialId}/trades/${tradeId}/cancel`, { method: 'POST' }),

  // Market
  getMarketListings: () => request('/api/market'),
  createMarketListing: (data) => request('/api/market', { method: 'POST', body: JSON.stringify(data) }),
  buyMarketListing: (id) => request(`/api/market/${id}/buy`, { method: 'POST' }),
  cancelMarketListing: (id) => request(`/api/market/${id}/cancel`, { method: 'POST' }),
  getBids: (id) => request(`/api/market/${id}/bids`),
  placeBid: (id, bid_amount) => request(`/api/market/${id}/bid`, { method: 'POST', body: JSON.stringify({ bid_amount }) }),

  // Lottery
  getLotteryPool: (type) => request(`/api/lottery/${type}`),
  drawLottery: (type) => request(`/api/lottery/${type}/draw`, { method: 'POST' }),

  // Ranking
  getGlobalRanking: (limit) => request(`/api/ranking/global${limit ? `?limit=${limit}` : ''}`),
  getPathRanking: (pathId, limit) => request(`/api/ranking/path/${pathId}${limit ? `?limit=${limit}` : ''}`),
  getOppositeRanking: (pathName, limit) => request(`/api/ranking/opposite/${pathName}${limit ? `?limit=${limit}` : ''}`),

  // Announcements
  getAnnouncements: () => request('/api/announcements'),
  getAllAnnouncements: () => request('/api/announcements/all'),
  addAnnouncement: (data) => request('/api/announcements', { method: 'POST', body: JSON.stringify(data) }),
  updateAnnouncement: (id, data) => request(`/api/announcements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAnnouncement: (id) => request(`/api/announcements/${id}`, { method: 'DELETE' }),

  // Host applications
  getHostApplications: (status) => request(`/api/host-applications${status ? `?status=${status}` : ''}`),
  applyHost: () => request('/api/host-applications', { method: 'POST' }),
  reviewHostApplication: (id, data) => request(`/api/host-applications/${id}/review`, { method: 'PUT', body: JSON.stringify(data) }),

  // Reports
  getReports: () => request('/api/reports'),
  createReport: (data) => request('/api/reports', { method: 'POST', body: JSON.stringify(data) }),
  updateReportStatus: (id, data) => request(`/api/reports/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),

  // Bans
  banCharacter: (id, data) => request(`/api/characters/${id}/ban`, { method: 'POST', body: JSON.stringify(data) }),
  unbanCharacter: (id) => request(`/api/characters/${id}/unban`, { method: 'POST' }),
  getCharacterBans: (id) => request(`/api/characters/${id}/bans`),

  // Achievements
  getAchievements: () => request('/api/achievements'),
  addAchievement: (data) => request('/api/achievements', { method: 'POST', body: JSON.stringify(data) }),
  updateAchievement: (id, data) => request(`/api/achievements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAchievement: (id) => request(`/api/achievements/${id}`, { method: 'DELETE' }),
  getCharacterAchievements: (id) => request(`/api/characters/${id}/achievements`),
  awardAchievement: (id, data) => request(`/api/characters/${id}/achievements`, { method: 'POST', body: JSON.stringify(data) }),
  removeAchievement: (charId, achId) => request(`/api/characters/${charId}/achievements/${achId}`, { method: 'DELETE' }),

  // Curse talents
  getCurseTalents: (id) => request(`/api/characters/${id}/curse-talents`),

  // Game settings
  getGameSettings: () => request('/api/game-settings'),
  updateGameSetting: (key, value) => request(`/api/game-settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),

  // Registration
  applyRegistration: () => request('/api/registration/apply', { method: 'POST' }),
  getRegistrationStatus: () => request('/api/registration/status'),
  checkRegistration: () => request('/api/registration/check'),
  createCharacterViaReg: (path_id, profession_id) => request('/api/registration/create-character', { method: 'POST', body: JSON.stringify({ path_id, profession_id }) }),
  getRegistrationApplications: (status) => request(`/api/registration/applications${status ? `?status=${status}` : ''}`),
  reviewRegistration: (id, data) => request(`/api/registration/applications/${id}/review`, { method: 'PUT', body: JSON.stringify(data) }),

  // Host ratings
  getTrialRatings: (trialId) => request(`/api/trials/${trialId}/ratings`),
  createRating: (trialId, data) => request(`/api/trials/${trialId}/ratings`, { method: 'POST', body: JSON.stringify(data) }),
  checkRating: (trialId) => request(`/api/trials/${trialId}/ratings/check`),

  // Chat / Locations
  getTrialLocations: (trialId) => request(`/api/trials/${trialId}/locations`),
  createLocation: (trialId, data) => request(`/api/trials/${trialId}/locations`, { method: 'POST', body: JSON.stringify(data) }),
  getLocationMessages: (locId, params) => request(`/api/locations/${locId}/messages${params ? `?${new URLSearchParams(params)}` : ''}`),
  postLocationMessage: (locId, data) => request(`/api/locations/${locId}/messages`, { method: 'POST', body: JSON.stringify(data) }),
  joinLocation: (locId, data) => request(`/api/locations/${locId}/join`, { method: 'POST', body: JSON.stringify(data) }),
  leaveLocation: (locId, data) => request(`/api/locations/${locId}/leave`, { method: 'POST', body: JSON.stringify(data) }),

  // Private messages
  getPrivateMessages: (trialId, charId, otherId) => request(`/api/trials/${trialId}/private-messages/${charId}/${otherId}`),
  sendPrivateMessage: (trialId, data) => request(`/api/trials/${trialId}/private-messages`, { method: 'POST', body: JSON.stringify(data) }),
  markMessagesRead: (message_ids) => request('/api/private-messages/read', { method: 'PUT', body: JSON.stringify({ message_ids }) }),
  getUnreadCount: (trialId, charId) => request(`/api/trials/${trialId}/unread/${charId}`),

  // Upload
  uploadFile: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return fetch('/api/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: formData
    }).then(res => res.json())
  },

  // Battle system
  getBattleStates: (trialId) => request(`/api/trials/${trialId}/battle-states`),
  initBattle: (trialId, character_ids) => request(`/api/trials/${trialId}/battle-init`, { method: 'POST', body: JSON.stringify({ character_ids }) }),
  updateBattleState: (trialId, charId, data) => request(`/api/trials/${trialId}/battle-states/${charId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Talent notifications
  getTalentNotifications: (trialId) => request(`/api/trials/${trialId}/talent-notifications`),
  processNotification: (id) => request(`/api/talent-notifications/${id}/process`, { method: 'POST' }),
  processAllNotifications: (trialId) => request(`/api/trials/${trialId}/talent-notifications/process-all`, { method: 'POST' }),
  getCooldowns: (trialId, charId) => request(`/api/trials/${trialId}/cooldowns/${charId}`),

  // Trade alerts
  getTradeAlerts: () => request('/api/trade-alerts'),
  updateTradeAlert: (id, data) => request(`/api/trade-alerts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Account deletion
  getDeletionRequests: () => request('/api/account-deletion/requests'),
  createDeletionRequest: (data) => request('/api/account-deletion/requests', { method: 'POST', body: JSON.stringify(data) }),
  approveDeletion: (id, data) => request(`/api/account-deletion/requests/${id}/approve`, { method: 'POST', body: JSON.stringify(data) }),
  executeDeletion: (id) => request(`/api/account-deletion/requests/${id}/execute`, { method: 'POST' }),

  // Instant draw records
  getDrawRecord: (trialId, charId, is_host) => request(`/api/trials/${trialId}/draw-records/${charId}${is_host ? '?is_host=true' : ''}`),
  createDrawRecord: (trialId, data) => request(`/api/trials/${trialId}/draw-records`, { method: 'POST', body: JSON.stringify(data) }),
  updateDrawRecord: (trialId, charId, data) => request(`/api/trials/${trialId}/draw-records/${charId}`, { method: 'PUT', body: JSON.stringify(data) }),
  checkTrialComplete: (trialId) => request(`/api/trials/${trialId}/check-complete`, { method: 'POST' }),
  settleHost: (trialId) => request(`/api/trials/${trialId}/settle-host`, { method: 'POST' }),

  // Character skills
  setCharacterSkill: (charId, data) => request(`/api/characters/${charId}/skills`, { method: 'PUT', body: JSON.stringify(data) }),

  // Admin logs
  addAdminLog: (data) => request('/api/admin-logs', { method: 'POST', body: JSON.stringify(data) }),
}

export default api
