const crypto = require('crypto');
const database = require('./database');

const SESSIONS = new Map();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  try {
    const [salt, hash] = stored.split(':');
    const hashBuf = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), hashBuf);
  } catch {
    return false;
  }
}

function createSession(userId, remember) {
  const token = crypto.randomBytes(32).toString('hex');
  const ttl = remember ? 7 * 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;
  SESSIONS.set(token, { userId, expiry: Date.now() + ttl });
  return token;
}

function getSession(token) {
  if (!token) return null;
  const session = SESSIONS.get(token);
  if (!session) return null;
  if (Date.now() > session.expiry) {
    SESSIONS.delete(token);
    return null;
  }
  return session;
}

function destroySession(token) {
  SESSIONS.delete(token);
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    cookies[k] = v.join('=');
  }
  return cookies;
}

function getUserFromRequest(req) {
  const cookie = parseCookies(req.headers.cookie);
  const token = cookie.session;
  const session = getSession(token);
  if (!session) return { user: null, token: null };
  const data = database.loadData();
  const user = data.users.find(u => u.id === session.userId);
  if (!user || user.status !== 'approved') return { user: null, token: null };
  return { user, token };
}

module.exports.hashPassword = hashPassword;
module.exports.verifyPassword = verifyPassword;
module.exports.createSession = createSession;
module.exports.getSession = getSession;
module.exports.destroySession = destroySession;
module.exports.parseCookies = parseCookies;
module.exports.getUserFromRequest = getUserFromRequest;
