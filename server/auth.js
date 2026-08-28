import db from './db.js';
import crypto from 'crypto';

const JWT_SECRET = 'zhushen-yuxi-secret-key-2089595154';

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(pw, stored) {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const verify = crypto.scryptSync(pw, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verify, 'hex'));
}

export function makeToken(userId) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + 100 * 365 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyToken(token) {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
    if (sig !== expected) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (decoded.exp && Date.now() > decoded.exp) return null;
    return decoded;
  } catch { return null; }
}

// Seed data
export async function seedData() {
  const paths = ['诞生','污堕','繁荣','腐朽','死亡','湮灭','真理','痴愚','秩序','混乱','战争','沉默','记忆','欺诈','时间','命运'];
  const insertPath = db.prepare('INSERT OR IGNORE INTO paths(name,description) VALUES(?,?)');
  const pathDescs = {
    '诞生':'生命初始的力量','污堕':'堕入黑暗的深渊','繁荣':'万物生长的荣光','腐朽':'消亡与衰败的法则',
    '死亡':'终结的使者','湮灭':'归于虚无的力量','真理':'永恒不变的法则','痴愚':'混沌中的清醒',
    '秩序':'万物运行的规律','混乱':'打破一切的颠覆','战争':'冲突与征服','沉默':'寂静中的力量',
    '记忆':'过往的回响','欺诈':'虚妄与真实的交织','时间':'流转的维度','命运':'不可改变的轨迹'
  };
  for (const p of paths) await insertPath.run(p, pathDescs[p]||'');

  const professions = ['战士','猎人','法师','歌者','牧师','刺客'];
  const insertProf = db.prepare('INSERT OR IGNORE INTO professions(name,description) VALUES(?,?)');
  const profDescs = {
    '战士':'近战物理输出，高生命值','猎人':'远程物理输出，善于追踪','法师':'魔法伤害输出，高法力值',
    '歌者':'辅助与控制，音波攻击','牧师':'治疗与增益，守护同伴','刺客':'高爆发输出，敏捷为主'
  };
  for (const p of professions) await insertProf.run(p, profDescs[p]||'');

  const settings = [
    ['max_talents','6'],['max_items','50'],['initial_points','1000'],
    ['talent_draw_cost','200'],['item_draw_cost','100'],['max_trial_participants','10'],
  ];
  const insertSetting = db.prepare('INSERT OR IGNORE INTO game_settings(setting_key,setting_value) VALUES(?,?)');
  for (const s of settings) await insertSetting.run(...s);

  const adminId = 'admin-0000-0000-0000';
  await db.prepare('INSERT OR IGNORE INTO profiles(id,username,role,password_hash) VALUES(?,?,?,?)').run(adminId,'admin','admin',hashPassword('admin123'));
  console.log('Seed data inserted');
}

export async function signUp(username, password) {
  const existing = await db.prepare('SELECT id FROM profiles WHERE username=?').get(username);
  if (existing) throw new Error('用户名已存在');
  const id = crypto.randomUUID();
  const hash = hashPassword(password);
  await db.prepare('INSERT INTO profiles(id,username,role,password_hash) VALUES(?,?,?,?)').run(id,username,'player',hash);
  return { id, username, token: makeToken(id) };
}

export async function signIn(username, password) {
  const user = await db.prepare('SELECT * FROM profiles WHERE username=?').get(username);
  if (!user || !verifyPassword(password, user.password_hash)) throw new Error('用户名或密码错误');
  return { id: user.id, username: user.username, role: user.role, token: makeToken(user.id) };
}
