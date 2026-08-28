const database = require('./database');
const security = require('./security');
const { readBody, sendJSON } = require('./httpUtils');

function requireAdmin(req, res) {
  const { user } = security.getUserFromRequest(req);
  if (!user || user.role !== 'admin') {
    sendJSON(res, 403, { error: '无权限' });
    return null;
  }
  return user;
}

async function handlePending(req, res) {
  if (!requireAdmin(req, res)) return;

  const data = database.loadData();
  const pending = data.users
    .filter(u => u.status === 'pending')
    .map(u => ({ id: u.id, username: u.username, createdAt: u.createdAt }));

  sendJSON(res, 200, { pending });
}

async function handleApprove(req, res) {
  if (!requireAdmin(req, res)) return;
  const body = await readBody(req);
  const { userId } = body;

  const data = database.loadData();
  const target = data.users.find(u => u.id === userId);
  if (!target) return sendJSON(res, 404, { error: '用户不存在' });

  target.status = 'approved';
  target.approvedAt = new Date().toISOString();
  database.saveData(data);
  sendJSON(res, 200, { success: true, message: `已批准用户「${target.username}」的注册` });
}

async function handleReject(req, res) {
  if (!requireAdmin(req, res)) return;
  const body = await readBody(req);
  const { userId } = body;

  const data = database.loadData();
  const target = data.users.find(u => u.id === userId);
  if (!target) return sendJSON(res, 404, { error: '用户不存在' });

  target.status = 'rejected';
  database.saveData(data);
  sendJSON(res, 200, { success: true, message: `已拒绝用户「${target.username}」的注册` });
}

async function handleScore(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  const body = await readBody(req);
  const { userId, board, score } = body;

  if (!['path', 'ladder'].includes(board)) {
    return sendJSON(res, 400, { error: '无效的榜单类型' });
  }
  if (typeof score !== 'number' || isNaN(score)) {
    return sendJSON(res, 400, { error: '分数必须为数字' });
  }

  const data = database.loadData();
  const target = data.users.find(u => u.id === userId);
  if (!target) return sendJSON(res, 404, { error: '用户不存在' });

  if (board === 'path') target.scorePath = score;
  else target.scoreLadder = score;
  database.saveData(data);

  sendJSON(res, 200, {
    success: true,
    message: `已将「${target.username}」的${board === 'path' ? '登神之路' : '觐见之梯'}分数调整为 ${score}`,
  });
}

async function handleRole(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  const body = await readBody(req);
  const { userId, role } = body;

  if (!['admin', 'viewer'].includes(role)) {
    return sendJSON(res, 400, { error: '无效的角色类型' });
  }

  const data = database.loadData();
  const target = data.users.find(u => u.id === userId);
  if (!target) return sendJSON(res, 404, { error: '用户不存在' });
  if (target.id === admin.id) {
    return sendJSON(res, 400, { error: '不能修改自己的角色' });
  }

  target.role = role;
  database.saveData(data);
  sendJSON(res, 200, {
    success: true,
    message: `已将「${target.username}」的权限设置为${role === 'admin' ? '管理员' : '纯看榜'}`,
  });
}

async function handleUsers(req, res) {
  if (!requireAdmin(req, res)) return;

  const data = database.loadData();
  const users = data.users.map(u => ({
    id: u.id,
    username: u.username,
    role: u.role,
    status: u.status,
    scorePath: u.scorePath,
    scoreLadder: u.scoreLadder,
    createdAt: u.createdAt,
    approvedAt: u.approvedAt,
  }));

  sendJSON(res, 200, { users });
}

async function handleDelete(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  const body = await readBody(req);
  const { userId } = body;

  const data = database.loadData();
  const target = data.users.find(u => u.id === userId);
  if (!target) return sendJSON(res, 404, { error: '用户不存在' });
  if (target.id === admin.id) {
    return sendJSON(res, 400, { error: '不能删除自己' });
  }

  data.users = data.users.filter(u => u.id !== userId);
  database.saveData(data);
  sendJSON(res, 200, { success: true, message: `已删除用户「${target.username}」` });
}

module.exports = {
  handlePending,
  handleApprove,
  handleReject,
  handleScore,
  handleRole,
  handleUsers,
  handleDelete,
};
