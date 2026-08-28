const database = require('./database');
const security = require('./security');
const { sendJSON } = require('./httpUtils');

async function handleRankings(req, res) {
  const { user } = security.getUserFromRequest(req);
  if (!user) {
    return sendJSON(res, 401, { error: '请先登录' });
  }

  const data = database.loadData();
  const approved = data.users.filter(u => u.status === 'approved');

  const pathRanking = [...approved]
    .sort((a, b) => b.scorePath - a.scorePath)
    .map((u, i) => ({ rank: i + 1, username: u.username, score: u.scorePath }));

  const ladderRanking = [...approved]
    .sort((a, b) => b.scoreLadder - a.scoreLadder)
    .map((u, i) => ({ rank: i + 1, username: u.username, score: u.scoreLadder }));

  sendJSON(res, 200, {
    pathRanking,
    ladderRanking,
    currentUser: user.username,
  });
}

module.exports = { handleRankings };
