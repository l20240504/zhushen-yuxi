const crypto = require('crypto');
const database = require('./database');
const security = require('./security');
const { readBody, sendJSON, sendCookie, clearCookie } = require('./httpUtils');

async function handleRegister(req, res) {
  const body = await readBody(req);
  const { username, password, confirmPassword } = body;

  if (!username || !password) {
    return sendJSON(res, 400, { error: '用户名和密码不能为空' });
  }
  if (username.length < 1 || username.length > 20) {
    return sendJSON(res, 400, { error: '用户名长度需为1-20个字符' });
  }
  if (password !== confirmPassword) {
    return sendJSON(res, 400, { error: '两次输入的密码不一致' });
  }

  const data = database.loadData();
  if (data.users.some(u => u.username === username)) {
    return sendJSON(res, 409, { error: '该用户名已被注册' });
  }

  const user = {
    id: crypto.randomUUID(),
    username,
    passwordHash: security.hashPassword(password),
    role: 'viewer',
    status: 'pending',
    scorePath: 0,
    scoreLadder: 0,
    createdAt: new Date().toISOString(),
    approvedAt: null,
  };
  data.users.push(user);
  database.saveData(data);

  sendJSON(res, 200, { success: true, message: '注册成功，请等待管理员审核通过后登录。' });
}

async function handleLogin(req, res) {
  const body = await readBody(req);
  const { username, password, remember } = body;

  if (!username || !password) {
    return sendJSON(res, 400, { error: '用户名和密码不能为空' });
  }

  const data = database.loadData();
  const user = data.users.find(u => u.username === username);

  if (!user || !security.verifyPassword(password, user.passwordHash)) {
    return sendJSON(res, 401, { error: '用户名或密码错误' });
  }

  if (user.status === 'pending') {
    return sendJSON(res, 403, { error: '您的注册申请正在审核中，请耐心等待管理员审批。' });
  }
  if (user.status === 'rejected') {
    return sendJSON(res, 403, { error: '您的注册申请已被拒绝，请联系管理员。' });
  }

  const ttl = remember ? 7 * 24 * 60 * 60 : 2 * 60 * 60;
  const token = security.createSession(user.id, remember);
  sendCookie(res, 'session', token, ttl);
  sendJSON(res, 200, {
    success: true,
    user: {
      username: user.username,
      role: user.role,
      scorePath: user.scorePath,
      scoreLadder: user.scoreLadder,
    },
  });
}

async function handleLogout(req, res) {
  const cookie = security.parseCookies(req.headers.cookie);
  security.destroySession(cookie.session);
  clearCookie(res, 'session');
  sendJSON(res, 200, { success: true });
}

async function handleSession(req, res) {
  const { user } = security.getUserFromRequest(req);
  if (!user) {
    return sendJSON(res, 200, { authenticated: false });
  }
  sendJSON(res, 200, {
    authenticated: true,
    user: {
      username: user.username,
      role: user.role,
      scorePath: user.scorePath,
      scoreLadder: user.scoreLadder,
    },
  });
}

async function handleChangePassword(req, res) {
  const body = await readBody(req);
  const { user } = security.getUserFromRequest(req);
  if (!user) {
    return sendJSON(res, 401, { error: '请先登录' });
  }

  const { oldPassword, newPassword } = body;
  if (!security.verifyPassword(oldPassword, user.passwordHash)) {
    return sendJSON(res, 401, { error: '旧密码错误' });
  }
  if (!newPassword || newPassword.length < 1) {
    return sendJSON(res, 400, { error: '新密码不能为空' });
  }

  const data = database.loadData();
  const target = data.users.find(u => u.id === user.id);
  target.passwordHash = security.hashPassword(newPassword);
  database.saveData(data);
  sendJSON(res, 200, { success: true, message: '密码修改成功' });
}

module.exports = {
  handleRegister,
  handleLogin,
  handleLogout,
  handleSession,
  handleChangePassword,
};
