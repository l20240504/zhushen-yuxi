import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import db, { initSchema } from './db.js';
import { seedData, signUp, signIn, verifyToken } from './auth.js';

const app = express();
const PORT = process.env.PORT || 3456;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const upload = multer({ storage: multer.memoryStorage() });

// Auth middleware (async)
async function authMid(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未登录' });
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'token无效' });
  req.userId = decoded.uid;
  req.user = await db.prepare('SELECT * FROM profiles WHERE id=?').get(decoded.uid);
  next();
}

function adminMid(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: '需要管理员权限' });
  next();
}

// ============ AUTH ============
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
    const result = await signUp(username, password);
    res.json(result);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await signIn(username, password);
    res.json(result);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/auth/user', authMid, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
});

app.post('/api/auth/signout', (req, res) => { res.json({ success: true }); });

// ============ PROFILES ============
app.get('/api/profiles/:id', async (req, res) => {
  const profile = await db.prepare('SELECT id,username,role,created_at FROM profiles WHERE id=?').get(req.params.id);
  res.json(profile || null);
});

app.put('/api/profiles/:id', authMid, async (req, res) => {
  const { username, role } = req.body;
  const updates = {};
  if (username !== undefined) updates.username = username;
  if (role !== undefined) updates.role = role;
  const sets = Object.keys(updates).map(k => `${k}=?`).join(',');
  if (sets) await db.prepare(`UPDATE profiles SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  res.json({ success: true });
});

// ============ PATHS & PROFESSIONS ============
app.get('/api/paths', async (_, res) => {
  res.json(await db.prepare('SELECT * FROM paths ORDER BY name').all());
});
app.get('/api/professions', async (_, res) => {
  res.json(await db.prepare('SELECT * FROM professions ORDER BY name').all());
});

// ============ TALENTS ============
app.get('/api/talents', async (_, res) => {
  const rows = await db.prepare(`SELECT t.*, p.name as prof_name, pa.name as path_name FROM talents t
    LEFT JOIN professions p ON t.profession_id=p.id LEFT JOIN paths pa ON t.faith_id=pa.id ORDER BY t.name`).all();
  res.json(rows.map(r => ({ ...r, profession: r.prof_name ? { id: r.profession_id, name: r.prof_name } : null, path: r.path_name ? { id: r.faith_id, name: r.path_name } : null })));
});

app.post('/api/talents', authMid, adminMid, async (req, res) => {
  const { name, description, type, faith_id, profession_id, grade } = req.body;
  const info = await db.prepare('INSERT INTO talents(name,description,type,faith_id,profession_id,grade) VALUES(?,?,?,?,?,?)').run(name,description,type,faith_id||null,profession_id||null,grade);
  res.json(await db.prepare('SELECT * FROM talents WHERE id=?').get(info.lastInsertRowid));
});

app.put('/api/talents/:id', authMid, adminMid, async (req, res) => {
  const fields = ['name','description','type','faith_id','profession_id','grade'];
  const sets = []; const vals = [];
  fields.forEach(f => { if (req.body[f] !== undefined) { sets.push(`${f}=?`); vals.push(req.body[f]); } });
  if (sets.length) { vals.push(req.params.id); await db.prepare(`UPDATE talents SET ${sets.join(',')} WHERE id=?`).run(...vals); }
  res.json({ success: true });
});

app.delete('/api/talents/:id', authMid, adminMid, async (req, res) => {
  await db.prepare('DELETE FROM talents WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/talents/batch', authMid, adminMid, async (req, res) => {
  const { add = [], update = [], del = [] } = req.body;
  let success = 0, failed = 0;
  for (const t of add) { try { await db.prepare('INSERT INTO talents(name,description,type,faith_id,profession_id,grade) VALUES(?,?,?,?,?,?)').run(t.name,t.description,t.type,t.faith_id||null,t.profession_id||null,t.grade); success++; } catch { failed++; } }
  for (const t of update) { try { await db.prepare('UPDATE talents SET name=?,description=?,type=?,faith_id=?,profession_id=?,grade=? WHERE id=?').run(t.name,t.description,t.type,t.faith_id||null,t.profession_id||null,t.grade,t.id); success++; } catch { failed++; } }
  for (const id of del) { try { await db.prepare('DELETE FROM talents WHERE id=?').run(id); success++; } catch { failed++; } }
  res.json({ success, failed });
});

// ============ ITEMS ============
app.get('/api/items', async (_, res) => {
  res.json(await db.prepare('SELECT * FROM items ORDER BY name').all());
});

app.get('/api/items/grade/:grade', async (req, res) => {
  res.json(await db.prepare('SELECT * FROM items WHERE grade=?').all(req.params.grade));
});

app.post('/api/items', authMid, adminMid, async (req, res) => {
  const { name, description, type, tradeable, drawable, grade } = req.body;
  const info = await db.prepare('INSERT INTO items(name,description,type,is_tradable,is_drawable,grade) VALUES(?,?,?,?,?,?)').run(name,description,type,tradeable?1:0,drawable?1:0,grade);
  res.json(await db.prepare('SELECT * FROM items WHERE id=?').get(info.lastInsertRowid));
});

app.put('/api/items/:id', authMid, adminMid, async (req, res) => {
  const fields = { name:'name', description:'description', type:'type', tradeable:'is_tradable', drawable:'is_drawable', grade:'grade' };
  const sets = []; const vals = [];
  Object.entries(fields).forEach(([k, col]) => { if (req.body[k] !== undefined) { sets.push(`${col}=?`); vals.push(req.body[k]); } });
  if (sets.length) { vals.push(req.params.id); await db.prepare(`UPDATE items SET ${sets.join(',')} WHERE id=?`).run(...vals); }
  res.json({ success: true });
});

app.delete('/api/items/:id', authMid, adminMid, async (req, res) => {
  await db.prepare('DELETE FROM items WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/items/batch', authMid, adminMid, async (req, res) => {
  const items = req.body;
  let success = 0, failed = 0;
  for (const i of items) { try { await db.prepare('INSERT INTO items(name,description,type,is_tradable,is_drawable,grade) VALUES(?,?,?,?,?,?)').run(i.name,i.description,i.type,i.tradeable?1:0,i.drawable?1:0,i.grade); success++; } catch { failed++; } }
  res.json({ success, failed });
});

// ============ CHARACTERS ============
async function getCharacterById(id) {
  const c = await db.prepare(`SELECT ch.*, p.name as path_name, pf.name as prof_name, pr.username FROM characters ch
    LEFT JOIN paths p ON ch.path_id=p.id LEFT JOIN professions pf ON ch.profession_id=pf.id
    LEFT JOIN profiles pr ON ch.user_id=pr.id WHERE ch.id=?`).get(id);
  if (!c) return null;
  return {
    ...c, abandoned_path_ids: JSON.parse(c.abandoned_path_ids||'[]'), player_status: undefined,
    path: c.path_name ? { id: c.path_id, name: c.path_name } : null,
    profession: c.prof_name ? { id: c.profession_id, name: c.prof_name } : null,
    profile: c.username ? { id: c.user_id, username: c.username } : null
  };
}

async function getCharacterByUserId(userId) {
  const ch = await db.prepare('SELECT id FROM characters WHERE user_id=?').get(userId);
  return ch ? await getCharacterById(ch.id) : null;
}

app.get('/api/characters/me', authMid, async (req, res) => {
  res.json(await getCharacterByUserId(req.userId));
});

app.get('/api/characters/:id', async (req, res) => {
  res.json(await getCharacterById(req.params.id));
});

app.get('/api/characters', async (_, res) => {
  const rows = await db.prepare(`SELECT ch.* FROM characters ch ORDER BY ch.created_at DESC`).all();
  const result = [];
  for (const r of rows) result.push(await getCharacterById(r.id));
  res.json(result);
});

app.post('/api/characters', authMid, async (req, res) => {
  const { path_id, profession_id } = req.body;
  const existing = await db.prepare('SELECT id FROM characters WHERE user_id=?').get(req.userId);
  if (existing) return res.status(400).json({ error: '您已经有角色了' });
  const path = await db.prepare('SELECT name FROM paths WHERE id=?').get(path_id);
  const prof = await db.prepare('SELECT name FROM professions WHERE id=?').get(profession_id);
  if (!path || !prof) return res.status(400).json({ error: '选择的命途或职业无效' });
  const charId = `${path.name.charAt(0)}${prof.name.charAt(0)}${Math.floor(10000*Math.random()).toString().padStart(4,'0')}`;
  const info = await db.prepare('INSERT INTO characters(user_id,character_id,path_id,profession_id,points,faith_points,curse_count,abandoned_path_ids) VALUES(?,?,?,?,?,?,?,?)').run(req.userId,charId,path_id,profession_id,1000,0,0,'[]');
  res.json(await getCharacterById(info.lastInsertRowid));
});

// Character talents
app.get('/api/characters/:id/talents', async (req, res) => {
  const rows = await db.prepare(`SELECT ct.*, t.name, t.description, t.type, t.grade, t.faith_id, t.profession_id,
    p.name as prof_name, pa.name as path_name FROM character_talents ct
    JOIN talents t ON ct.talent_id=t.id LEFT JOIN professions p ON t.profession_id=p.id
    LEFT JOIN paths pa ON t.faith_id=pa.id WHERE ct.character_id=? ORDER BY ct.acquired_at DESC`).all(req.params.id);
  res.json(rows.map(r => ({
    ...r, is_locked: !!r.is_locked,
    talent: { id: r.talent_id, name: r.name, description: r.description, type: r.type, grade: r.grade,
      profession: r.prof_name ? { id: r.profession_id, name: r.prof_name } : null,
      path: r.path_name ? { id: r.faith_id, name: r.path_name } : null }
  })));
});

app.post('/api/characters/:id/talents', authMid, async (req, res) => {
  const { talent_id } = req.body;
  const charId = parseInt(req.params.id);
  const existing = await db.prepare('SELECT id FROM character_talents WHERE character_id=? AND talent_id=?').get(charId, talent_id);
  if (existing) return res.json({ success: true });
  const count = (await db.prepare('SELECT COUNT(*) as c FROM character_talents WHERE character_id=?').get(charId)).c;
  const char = await getCharacterById(charId);
  const maxSlots = char.points < 1000 ? 0 : char.points < 1200 ? 2 : char.points < 1600 ? 3 : char.points < 2000 ? 4 : char.points < 2400 ? 5 : 6;
  if (count >= maxSlots) return res.status(400).json({ error: '天赋槽已满' });
  await db.prepare('INSERT INTO character_talents(character_id,talent_id) VALUES(?,?)').run(charId, talent_id);
  res.json({ success: true });
});

app.delete('/api/characters/:id/talents/:talentId', authMid, async (req, res) => {
  await db.prepare('DELETE FROM character_talents WHERE character_id=? AND talent_id=?').run(req.params.id, req.params.talentId);
  res.json({ success: true });
});

// Character items / backpack
app.get('/api/characters/:id/items', async (req, res) => {
  const rows = await db.prepare(`SELECT ci.*, i.name, i.description, i.type, i.grade, i.is_tradable, i.is_drawable
    FROM character_items ci JOIN items i ON ci.item_id=i.id WHERE ci.character_id=? ORDER BY ci.acquired_at DESC`).all(req.params.id);
  res.json(rows.map(r => ({ ...r, item: { id: r.item_id, name: r.name, description: r.description, type: r.type, grade: r.grade, is_tradable: !!r.is_tradable, is_drawable: !!r.is_drawable } })));
});

app.post('/api/characters/:id/items', authMid, async (req, res) => {
  const { item_id, quantity = 1 } = req.body;
  const charId = parseInt(req.params.id);
  const existing = await db.prepare('SELECT * FROM character_items WHERE character_id=? AND item_id=?').get(charId, item_id);
  if (existing) await db.prepare('UPDATE character_items SET quantity=quantity+? WHERE id=?').run(quantity, existing.id);
  else await db.prepare('INSERT INTO character_items(character_id,item_id,quantity) VALUES(?,?,?)').run(charId, item_id, quantity);
  res.json({ success: true });
});

app.put('/api/characters/:id/items/:itemId', authMid, async (req, res) => {
  const { quantity } = req.body;
  const charId = parseInt(req.params.id); const itemId = parseInt(req.params.itemId);
  if (quantity <= 0) await db.prepare('DELETE FROM character_items WHERE character_id=? AND item_id=?').run(charId, itemId);
  else { const ex = await db.prepare('SELECT id FROM character_items WHERE character_id=? AND item_id=?').get(charId, itemId);
    if (ex) await db.prepare('UPDATE character_items SET quantity=? WHERE id=?').run(quantity, ex.id);
    else await db.prepare('INSERT INTO character_items(character_id,item_id,quantity) VALUES(?,?,?)').run(charId, itemId, quantity); }
  res.json({ success: true });
});

app.delete('/api/characters/:id/items/:itemId', authMid, async (req, res) => {
  const { quantity = 1 } = req.body;
  const charId = parseInt(req.params.id); const itemId = parseInt(req.params.itemId);
  const ex = await db.prepare('SELECT * FROM character_items WHERE character_id=? AND item_id=?').get(charId, itemId);
  if (!ex) return res.json({ success: false });
  if (ex.quantity <= quantity) await db.prepare('DELETE FROM character_items WHERE id=?').run(ex.id);
  else await db.prepare('UPDATE character_items SET quantity=quantity-? WHERE id=?').run(quantity, ex.id);
  res.json({ success: true });
});

// Update character points
app.put('/api/characters/:id/points', authMid, async (req, res) => {
  const { points, faith_points, max_points } = req.body;
  const charId = parseInt(req.params.id);
  const char = await getCharacterById(charId);
  if (!char) return res.status(404).json({ error: '角色不存在' });
  const updates = {};
  if (points !== undefined) updates.points = Math.max(0, points);
  if (faith_points !== undefined) updates.faith_points = Math.max(0, faith_points);
  if (max_points !== undefined) updates.max_points = Math.max(char.max_points, max_points);
  const sets = Object.keys(updates).map(k => `${k}=?`).join(',');
  if (sets) await db.prepare(`UPDATE characters SET ${sets} WHERE id=?`).run(...Object.values(updates), charId);
  res.json(await getCharacterById(charId));
});

// Change path (弃誓)
app.post('/api/characters/:id/change-path', authMid, async (req, res) => {
  const { new_path_id } = req.body;
  const charId = parseInt(req.params.id);
  const char = await getCharacterById(charId);
  if (!char) return res.status(404).json({ error: '角色不存在' });
  await db.prepare('DELETE FROM character_talents WHERE character_id=?').run(charId);
  await db.prepare('UPDATE characters SET path_id=?, curse_count=curse_count+1 WHERE id=?').run(new_path_id, charId);
  await db.prepare(`INSERT INTO curse_talents(character_id,name,description) VALUES(?,?,?)`).run(charId,
    `弃誓诅咒 ${char.curse_count+1}`, `第${char.curse_count+1}次弃誓的诅咒标记。你背弃了${char.path?.name}的信仰，神明的愤怒将永远伴随着你。`);
  res.json(await getCharacterById(charId));
});

// Equipment
app.put('/api/characters/:id/equip', authMid, async (req, res) => {
  const { item_id, appearance } = req.body;
  await db.prepare('UPDATE characters SET equipped_item_id=?, equipment_appearance=? WHERE id=?').run(item_id, appearance, req.params.id);
  res.json({ success: true });
});

app.put('/api/characters/:id/unequip', authMid, async (req, res) => {
  await db.prepare('UPDATE characters SET equipped_item_id=NULL, equipment_appearance=NULL WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ============ TRIALS ============
app.get('/api/trials', async (req, res) => {
  const { status } = req.query;
  let sql = `SELECT t.*, ch.character_id as host_char_id, pr.username as host_name, ch.path_id as host_path_id,
    (SELECT COUNT(*) FROM trial_participants tp WHERE tp.trial_id=t.id) as participants_count
    FROM trials t LEFT JOIN characters ch ON t.host_id=ch.id LEFT JOIN profiles pr ON ch.user_id=pr.id`;
  const params = [];
  if (status) { sql += ' WHERE t.status=?'; params.push(status); }
  sql += ' ORDER BY t.created_at DESC';
  const rows = await db.prepare(sql).all(...params);
  res.json(rows.map(r => ({
    ...r, participants_count: r.participants_count,
    host: { id: r.host_id, character_id: r.host_char_id, profile: { username: r.host_name } }
  })));
});

app.get('/api/trials/:id', async (req, res) => {
  const t = await db.prepare(`SELECT t.*, ch.character_id as host_char_id, pr.username as host_name
    FROM trials t LEFT JOIN characters ch ON t.host_id=ch.id LEFT JOIN profiles pr ON ch.user_id=pr.id WHERE t.id=?`).get(req.params.id);
  if (!t) return res.json(null);
  res.json({ ...t, host: { id: t.host_id, character_id: t.host_char_id, profile: { username: t.host_name } } });
});

app.post('/api/trials', authMid, async (req, res) => {
  const { name, mode, max_participants, expected_start_time, location_name } = req.body;
  const char = await getCharacterByUserId(req.userId);
  if (!char) return res.status(400).json({ error: '请先创建角色' });
  const info = await db.prepare('INSERT INTO trials(host_id,name,mode,max_participants,expected_start_time,location_name) VALUES(?,?,?,?,?,?)').run(char.id,name,mode||'normal',max_participants||10,expected_start_time||null,location_name||null);
  const trialId = info.lastInsertRowid;
  await db.prepare('INSERT INTO trial_participants(trial_id,character_id,role,ascension_score,faith_score) VALUES(?,?,?,?,?)').run(trialId,char.id,'host',0,0);
  res.json(await db.prepare('SELECT * FROM trials WHERE id=?').get(trialId));
});

app.put('/api/trials/:id/status', authMid, async (req, res) => {
  const { status } = req.body;
  const trialId = parseInt(req.params.id);
  const updates = { status };
  if (status === 'ongoing') updates.started_at = new Date().toISOString();
  if (status === 'finished') updates.finished_at = new Date().toISOString();
  const sets = Object.keys(updates).map(k => `${k}=?`).join(',');
  await db.prepare(`UPDATE trials SET ${sets} WHERE id=?`).run(...Object.values(updates), trialId);
  res.json({ success: true });
});

app.delete('/api/trials/:id', authMid, async (req, res) => {
  await db.prepare('DELETE FROM trials WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

app.put('/api/trials/:id/featured', authMid, async (req, res) => {
  await db.prepare('UPDATE trials SET is_featured=? WHERE id=?').run(req.body.featured?1:0, req.params.id);
  res.json({ success: true });
});

// Trial participants
app.get('/api/trials/:id/participants', async (req, res) => {
  const rows = await db.prepare(`SELECT tp.*, ch.character_id as ch_cid, ch.points, ch.faith_points, ch.curse_count,
    ch.path_id, ch.profession_id, pr.username, pa.name as path_name, pf.name as prof_name
    FROM trial_participants tp LEFT JOIN characters ch ON tp.character_id=ch.id
    LEFT JOIN profiles pr ON ch.user_id=pr.id LEFT JOIN paths pa ON ch.path_id=pa.id
    LEFT JOIN professions pf ON ch.profession_id=pf.id WHERE tp.trial_id=? ORDER BY tp.joined_at`).all(req.params.id);
  res.json(rows.map(r => ({
    ...r, player_status: JSON.parse(r.player_status||'{}'), force_quit: !!r.force_quit, reward_granted: !!r.reward_granted,
    character: r.ch_cid ? { id: r.character_id, character_id: r.ch_cid, points: r.points, faith_points: r.faith_points,
      curse_count: r.curse_count, path: r.path_name ? { id: r.path_id, name: r.path_name } : null,
      profession: r.prof_name ? { id: r.profession_id, name: r.prof_name } : null,
      profile: r.username ? { username: r.username } : null } : null
  })));
});

app.post('/api/trials/:id/join', authMid, async (req, res) => {
  const trialId = parseInt(req.params.id);
  const char = await getCharacterByUserId(req.userId);
  if (!char) return res.status(400).json({ error: '请先创建角色' });
  const existing = await db.prepare('SELECT tp.id, t.name, t.status FROM trial_participants tp JOIN trials t ON tp.trial_id=t.id WHERE tp.character_id=? AND t.status IN (?,?)').get(char.id,'recruiting','ongoing');
  if (existing) return res.status(400).json({ error: `你已经在试炼「${existing.name}」中` });
  await db.prepare('INSERT INTO trial_participants(trial_id,character_id,role,ascension_score,faith_score) VALUES(?,?,?,?,?)').run(trialId,char.id,'participant',0,0);
  res.json({ success: true });
});

app.post('/api/trials/:id/leave', authMid, async (req, res) => {
  const char = await getCharacterByUserId(req.userId);
  await db.prepare('DELETE FROM trial_participants WHERE trial_id=? AND character_id=?').run(req.params.id, char?.id);
  res.json({ success: true });
});

app.post('/api/trials/:id/force-quit', authMid, async (req, res) => {
  const char = await getCharacterByUserId(req.userId);
  await db.prepare('DELETE FROM trial_participants WHERE trial_id=? AND character_id=?').run(req.params.id, char?.id);
  res.json({ success: true });
});

// Update participant score
app.put('/api/trials/:trialId/participants/:pid/score', authMid, async (req, res) => {
  const { ascension_score, faith_score, notes } = req.body;
  await db.prepare('UPDATE trial_participants SET ascension_score=?,faith_score=?,score_change=?,notes=? WHERE id=?').run(ascension_score,faith_score,ascension_score,notes||null,req.params.pid);
  res.json({ success: true });
});

// Update participant status
app.put('/api/trials/:trialId/participants/:pid/status', authMid, async (req, res) => {
  await db.prepare('UPDATE trial_participants SET player_status=? WHERE id=?').run(JSON.stringify(req.body.status), req.params.pid);
  res.json({ success: true });
});

// Set co-host
app.put('/api/trials/:trialId/co-host/:charId', authMid, async (req, res) => {
  await db.prepare('UPDATE trial_participants SET role=? WHERE trial_id=? AND character_id=?').run('co_host', req.params.trialId, req.params.charId);
  res.json({ success: true });
});

app.delete('/api/trials/:trialId/co-host/:charId', authMid, async (req, res) => {
  await db.prepare('UPDATE trial_participants SET role=? WHERE trial_id=? AND character_id=? AND role=?').run('participant', req.params.trialId, req.params.charId, 'co_host');
  res.json({ success: true });
});

// Observer
app.post('/api/trials/:trialId/observer', authMid, async (req, res) => {
  const { trial_nickname } = req.body;
  const char = await getCharacterByUserId(req.userId);
  const existing = await db.prepare('SELECT id FROM trial_participants WHERE trial_id=? AND character_id=?').get(req.params.trialId, char?.id);
  if (existing) await db.prepare('UPDATE trial_participants SET participant_role=? WHERE id=?').run('observer', existing.id);
  else await db.prepare('INSERT INTO trial_participants(trial_id,character_id,trial_nickname,participant_role,role,ascension_score,faith_score) VALUES(?,?,?,?,?,?,?)').run(req.params.trialId,char?.id,trial_nickname,'observer','participant',0,0);
  res.json({ success: true });
});

app.delete('/api/trials/:trialId/observer/:charId', authMid, async (req, res) => {
  await db.prepare('DELETE FROM trial_participants WHERE trial_id=? AND character_id=? AND participant_role=?').run(req.params.trialId, req.params.charId, 'observer');
  res.json({ success: true });
});

// Trial inventory
app.get('/api/trials/:trialId/inventory/:charId', async (req, res) => {
  const rows = await db.prepare(`SELECT ti.*, i.name, i.description, i.type, i.grade FROM trial_inventories ti
    JOIN items i ON ti.item_id=i.id WHERE ti.character_id=? AND ti.trial_id=?`).all(req.params.charId, req.params.trialId);
  res.json(rows.map(r => ({ ...r, item: { id: r.item_id, name: r.name, description: r.description, type: r.type, grade: r.grade } })));
});

app.post('/api/trials/:trialId/inventory', authMid, async (req, res) => {
  const { character_id, item_id } = req.body;
  await db.prepare('INSERT OR IGNORE INTO trial_inventories(character_id,trial_id,item_id) VALUES(?,?,?)').run(character_id, req.params.trialId, item_id);
  res.json({ success: true });
});

app.delete('/api/trials/:trialId/inventory/:itemId', authMid, async (req, res) => {
  const { character_id } = req.body;
  await db.prepare('DELETE FROM trial_inventories WHERE character_id=? AND trial_id=? AND item_id=?').run(character_id, req.params.trialId, req.params.itemId);
  res.json({ success: true });
});

app.put('/api/trials/:trialId/inventory', authMid, async (req, res) => {
  const { character_id, item_ids } = req.body;
  await db.prepare('DELETE FROM trial_inventories WHERE character_id=? AND trial_id=?').run(character_id, req.params.trialId);
  for (const id of item_ids) await db.prepare('INSERT INTO trial_inventories(character_id,trial_id,item_id) VALUES(?,?,?)').run(character_id, req.params.trialId, id);
  res.json({ success: true });
});

// Trial trades
app.get('/api/trials/:trialId/trades', async (req, res) => {
  const { character_id } = req.query;
  let sql = `SELECT tt.*, fc.character_id as from_cid, tc.character_id as to_cid,
    fi.name as from_item_name, ti.name as to_item_name, fpr.username as from_name, tpr.username as to_name
    FROM trial_trades tt LEFT JOIN characters fc ON tt.from_character_id=fc.id
    LEFT JOIN characters tc ON tt.to_character_id=tc.id LEFT JOIN items fi ON tt.from_item_id=fi.id
    LEFT JOIN items ti ON tt.to_item_id=ti.id LEFT JOIN profiles fpr ON fc.user_id=fpr.id
    LEFT JOIN profiles tpr ON tc.user_id=tpr.id WHERE tt.trial_id=?`;
  const params = [req.params.trialId];
  if (character_id) { sql += ' AND (tt.from_character_id=? OR tt.to_character_id=?)'; params.push(character_id, character_id); }
  sql += ' ORDER BY tt.created_at DESC';
  const rows = await db.prepare(sql).all(...params);
  res.json(rows.map(r => ({
    ...r,
    from_character: { id: r.from_character_id, character_id: r.from_cid, profile: { username: r.from_name } },
    to_character: { id: r.to_character_id, character_id: r.to_cid, profile: { username: r.to_name } },
    from_item: { id: r.from_item_id, name: r.from_item_name },
    to_item: r.to_item_id ? { id: r.to_item_id, name: r.to_item_name } : null
  })));
});

app.post('/api/trials/:trialId/trades', authMid, async (req, res) => {
  const { from_character_id, to_character_id, from_item_id, from_quantity, to_item_id, to_quantity } = req.body;
  const info = await db.prepare('INSERT INTO trial_trades(trial_id,from_character_id,to_character_id,from_item_id,from_quantity,to_item_id,to_quantity,status) VALUES(?,?,?,?,?,?,?,?)').run(req.params.trialId,from_character_id,to_character_id,from_item_id,from_quantity,to_item_id||null,to_quantity||null,'pending');
  res.json(await db.prepare('SELECT * FROM trial_trades WHERE id=?').get(info.lastInsertRowid));
});

app.post('/api/trials/:trialId/trades/:tradeId/accept', authMid, async (req, res) => {
  const trade = await db.prepare('SELECT * FROM trial_trades WHERE id=?').get(req.params.tradeId);
  if (!trade) return res.status(404).json({ error: '交易不存在' });
  const fromItem = await db.prepare('SELECT * FROM character_items WHERE character_id=? AND item_id=?').get(trade.from_character_id, trade.from_item_id);
  if (!fromItem || fromItem.quantity < trade.from_quantity) return res.status(400).json({ error: '发起方道具不足' });
  if (trade.to_item_id && trade.to_quantity) {
    const toItem = await db.prepare('SELECT * FROM character_items WHERE character_id=? AND item_id=?').get(trade.to_character_id, trade.to_item_id);
    if (!toItem || toItem.quantity < trade.to_quantity) return res.status(400).json({ error: '接收方道具不足' });
    if (toItem.quantity <= trade.to_quantity) await db.prepare('DELETE FROM character_items WHERE id=?').run(toItem.id);
    else await db.prepare('UPDATE character_items SET quantity=quantity-? WHERE id=?').run(trade.to_quantity, toItem.id);
    const senderItem = await db.prepare('SELECT id FROM character_items WHERE character_id=? AND item_id=?').get(trade.from_character_id, trade.to_item_id);
    if (senderItem) await db.prepare('UPDATE character_items SET quantity=quantity+? WHERE id=?').run(trade.to_quantity, senderItem.id);
    else await db.prepare('INSERT INTO character_items(character_id,item_id,quantity) VALUES(?,?,?)').run(trade.from_character_id, trade.to_item_id, trade.to_quantity);
  }
  if (fromItem.quantity <= trade.from_quantity) await db.prepare('DELETE FROM character_items WHERE id=?').run(fromItem.id);
  else await db.prepare('UPDATE character_items SET quantity=quantity-? WHERE id=?').run(trade.from_quantity, fromItem.id);
  const recvItem = await db.prepare('SELECT id FROM character_items WHERE character_id=? AND item_id=?').get(trade.to_character_id, trade.from_item_id);
  if (recvItem) await db.prepare('UPDATE character_items SET quantity=quantity+? WHERE id=?').run(trade.from_quantity, recvItem.id);
  else await db.prepare('INSERT INTO character_items(character_id,item_id,quantity) VALUES(?,?,?)').run(trade.to_character_id, trade.from_item_id, trade.from_quantity);
  await db.prepare('UPDATE trial_trades SET status=?,updated_at=? WHERE id=?').run('accepted', new Date().toISOString(), req.params.tradeId);
  res.json({ success: true });
});

app.post('/api/trials/:trialId/trades/:tradeId/reject', authMid, async (req, res) => {
  await db.prepare('UPDATE trial_trades SET status=?,updated_at=? WHERE id=?').run('rejected', new Date().toISOString(), req.params.tradeId);
  res.json({ success: true });
});

app.post('/api/trials/:trialId/trades/:tradeId/cancel', authMid, async (req, res) => {
  await db.prepare('UPDATE trial_trades SET status=?,updated_at=? WHERE id=?').run('cancelled', new Date().toISOString(), req.params.tradeId);
  res.json({ success: true });
});

// Trial settle
app.post('/api/trials/:trialId/settle', authMid, async (req, res) => {
  const trialId = parseInt(req.params.trialId);
  const participants = await db.prepare('SELECT * FROM trial_participants WHERE trial_id=?').all(trialId);
  for (const p of participants) {
    const char = await getCharacterById(p.character_id);
    if (!char) continue;
    if (p.ascension_score !== 0) {
      const newPoints = Math.max(0, char.points + p.ascension_score);
      const newMax = Math.max(char.max_points, newPoints);
      await db.prepare('UPDATE characters SET points=?,max_points=? WHERE id=?').run(newPoints, newMax, char.id);
    }
    if (p.faith_score !== 0) {
      const newFaith = Math.max(0, char.faith_points + p.faith_score);
      await db.prepare('UPDATE characters SET faith_points=? WHERE id=?').run(newFaith, char.id);
    }
  }
  await db.prepare('UPDATE trials SET status=?,finished_at=? WHERE id=?').run('finished', new Date().toISOString(), trialId);
  res.json({ success: true });
});

// ============ MARKET ============
app.get('/api/market', async (_, res) => {
  const rows = await db.prepare(`SELECT ml.*, i.name as item_name, i.grade as item_grade,
    wi.name as wanted_name, s.character_id as seller_cid, spr.username as seller_name,
    tb.character_id as buyer_cid, tpr.username as buyer_name
    FROM market_listings ml LEFT JOIN items i ON ml.item_id=i.id
    LEFT JOIN items wi ON ml.wanted_item_id=wi.id LEFT JOIN characters s ON ml.seller_id=s.id
    LEFT JOIN profiles spr ON s.user_id=spr.id LEFT JOIN characters tb ON ml.target_buyer_id=tb.id
    LEFT JOIN profiles tpr ON tb.user_id=tpr.id WHERE ml.status=? ORDER BY ml.created_at DESC`).all('active');
  res.json(rows.map(r => ({
    ...r, is_anonymous: !!r.is_anonymous,
    item: { id: r.item_id, name: r.item_name, grade: r.item_grade },
    wanted_item: r.wanted_item_id ? { id: r.wanted_item_id, name: r.wanted_name } : null,
    seller: { id: r.seller_id, character_id: r.seller_cid, profile: { username: r.seller_name } },
    target_buyer: r.target_buyer_id ? { id: r.target_buyer_id, character_id: r.buyer_cid, profile: { username: r.buyer_name } } : null
  })));
});

app.post('/api/market', authMid, async (req, res) => {
  const { item_id, wanted_item_id, trade_type, target_buyer_id, starting_price, auction_hours, is_anonymous } = req.body;
  const char = await getCharacterByUserId(req.userId);
  if (!char) return res.status(400).json({ error: '请先创建角色' });
  const listing = { seller_id: char.id, item_id, wanted_item_id: wanted_item_id||null, price: null, trade_type: trade_type||'public', is_anonymous: is_anonymous?1:0 };
  if (trade_type === 'private' && target_buyer_id) listing.target_buyer_id = target_buyer_id;
  if (trade_type === 'auction' && starting_price !== undefined) { listing.starting_price = starting_price; listing.current_price = starting_price; if (auction_hours) { const d = new Date(); d.setHours(d.getHours()+auction_hours); listing.auction_end_time = d.toISOString(); } }
  const cols = Object.keys(listing).join(','); const ph = Object.keys(listing).map(()=>'?').join(',');
  const info = await db.prepare(`INSERT INTO market_listings(${cols}) VALUES(${ph})`).run(...Object.values(listing));
  res.json(await db.prepare('SELECT * FROM market_listings WHERE id=?').get(info.lastInsertRowid));
});

app.post('/api/market/:id/buy', authMid, async (req, res) => {
  const listing = await db.prepare('SELECT * FROM market_listings WHERE id=?').get(req.params.id);
  if (!listing || listing.status !== 'active') return res.status(400).json({ error: '挂单不存在或已关闭' });
  const buyer = await getCharacterByUserId(req.userId);
  if (!buyer) return res.status(400).json({ error: '请先创建角色' });
  const sellerItem = await db.prepare('SELECT * FROM character_items WHERE character_id=? AND item_id=?').get(listing.seller_id, listing.item_id);
  if (!sellerItem || sellerItem.quantity < 1) return res.status(400).json({ error: '卖家道具不足' });
  if (sellerItem.quantity <= 1) await db.prepare('DELETE FROM character_items WHERE id=?').run(sellerItem.id);
  else await db.prepare('UPDATE character_items SET quantity=quantity-1 WHERE id=?').run(sellerItem.id);
  const buyerItem = await db.prepare('SELECT id FROM character_items WHERE character_id=? AND item_id=?').get(buyer.id, listing.item_id);
  if (buyerItem) await db.prepare('UPDATE character_items SET quantity=quantity+1 WHERE id=?').run(buyerItem.id);
  else await db.prepare('INSERT INTO character_items(character_id,item_id,quantity) VALUES(?,?,?)').run(buyer.id, listing.item_id, 1);
  if (listing.wanted_item_id) {
    const buyerWanted = await db.prepare('SELECT * FROM character_items WHERE character_id=? AND item_id=?').get(buyer.id, listing.wanted_item_id);
    if (buyerWanted) {
      if (buyerWanted.quantity <= 1) await db.prepare('DELETE FROM character_items WHERE id=?').run(buyerWanted.id);
      else await db.prepare('UPDATE character_items SET quantity=quantity-1 WHERE id=?').run(buyerWanted.id);
      const sellerWanted = await db.prepare('SELECT id FROM character_items WHERE character_id=? AND item_id=?').get(listing.seller_id, listing.wanted_item_id);
      if (sellerWanted) await db.prepare('UPDATE character_items SET quantity=quantity+1 WHERE id=?').run(sellerWanted.id);
      else await db.prepare('INSERT INTO character_items(character_id,item_id,quantity) VALUES(?,?,?)').run(listing.seller_id, listing.wanted_item_id, 1);
    }
  }
  await db.prepare('UPDATE market_listings SET status=?,buyer_id=?,sold_at=? WHERE id=?').run('sold', buyer.id, new Date().toISOString(), req.params.id);
  res.json({ success: true });
});

app.post('/api/market/:id/cancel', authMid, async (req, res) => {
  await db.prepare('UPDATE market_listings SET status=? WHERE id=?').run('cancelled', req.params.id);
  res.json({ success: true });
});

// Auction bids
app.get('/api/market/:id/bids', async (req, res) => {
  const rows = await db.prepare(`SELECT ab.*, ch.character_id, pr.username FROM auction_bids ab
    LEFT JOIN characters ch ON ab.bidder_id=ch.id LEFT JOIN profiles pr ON ch.user_id=pr.id
    WHERE ab.listing_id=? ORDER BY ab.bid_amount DESC`).all(req.params.id);
  res.json(rows.map(r => ({ ...r, bidder: { id: r.bidder_id, character_id: r.character_id, profile: { username: r.username } } })));
});

app.post('/api/market/:id/bid', authMid, async (req, res) => {
  const { bid_amount } = req.body;
  const listing = await db.prepare('SELECT * FROM market_listings WHERE id=?').get(req.params.id);
  if (!listing || listing.trade_type !== 'auction' || listing.status !== 'active') return res.status(400).json({ error: '无效的拍卖' });
  if (listing.auction_end_time && new Date(listing.auction_end_time) < new Date()) return res.status(400).json({ error: '拍卖已结束' });
  if (bid_amount <= (listing.current_price || listing.starting_price || 0)) return res.status(400).json({ error: '出价必须高于当前价格' });
  const buyer = await getCharacterByUserId(req.userId);
  await db.prepare('INSERT INTO auction_bids(listing_id,bidder_id,bid_amount) VALUES(?,?,?)').run(req.params.id, buyer.id, bid_amount);
  await db.prepare('UPDATE market_listings SET current_price=? WHERE id=?').run(bid_amount, req.params.id);
  res.json({ success: true });
});

// ============ LOTTERY ============
app.get('/api/lottery/:type', async (req, res) => {
  const rows = await db.prepare(`SELECT lp.*, t.name as talent_name, t.description as talent_desc, t.grade as talent_grade,
    i.name as item_name, i.description as item_desc, i.grade as item_grade
    FROM lottery_pools lp LEFT JOIN talents t ON lp.talent_id=t.id LEFT JOIN items i ON lp.item_id=i.id
    WHERE lp.type=?`).all(req.params.type);
  res.json(rows.map(r => ({ ...r, talent: r.talent_id ? { id: r.talent_id, name: r.talent_name, description: r.talent_desc, grade: r.talent_grade } : null,
    item: r.item_id ? { id: r.item_id, name: r.item_name, description: r.item_desc, grade: r.item_grade } : null })));
});

app.post('/api/lottery/:type/draw', authMid, async (req, res) => {
  const char = await getCharacterByUserId(req.userId);
  if (!char) return res.status(400).json({ error: '请先创建角色' });
  const pools = await db.prepare('SELECT * FROM lottery_pools WHERE type=?').all(req.params.type);
  if (pools.length === 0) return res.status(400).json({ error: '奖池为空' });
  const cost = pools[0].cost;
  if (char.points < cost) return res.status(400).json({ error: '积分不足' });
  await db.prepare('UPDATE characters SET points=points-? WHERE id=?').run(cost, char.id);
  let rand = Math.random(), cumulative = 0, winner = null;
  for (const p of pools) { cumulative += p.probability; if (rand <= cumulative) { winner = p; break; } }
  if (!winner) winner = pools[pools.length - 1];
  if (winner.talent_id) {
    const existing = await db.prepare('SELECT id FROM character_talents WHERE character_id=? AND talent_id=?').get(char.id, winner.talent_id);
    if (!existing) await db.prepare('INSERT INTO character_talents(character_id,talent_id) VALUES(?,?)').run(char.id, winner.talent_id);
    const t = await db.prepare('SELECT * FROM talents WHERE id=?').get(winner.talent_id);
    res.json({ success: true, reward: { type: 'talent', id: winner.talent_id, name: t.name } });
  } else if (winner.item_id) {
    const ex = await db.prepare('SELECT id FROM character_items WHERE character_id=? AND item_id=?').get(char.id, winner.item_id);
    if (ex) await db.prepare('UPDATE character_items SET quantity=quantity+1 WHERE id=?').run(ex.id);
    else await db.prepare('INSERT INTO character_items(character_id,item_id,quantity) VALUES(?,?,?)').run(char.id, winner.item_id, 1);
    const i = await db.prepare('SELECT * FROM items WHERE id=?').get(winner.item_id);
    res.json({ success: true, reward: { type: 'item', id: winner.item_id, name: i.name } });
  } else res.status(400).json({ error: '抽奖失败' });
});

// ============ RANKING ============
app.get('/api/ranking/global', async (req, res) => {
  const limit = parseInt(req.query.limit||100);
  const rows = await db.prepare(`SELECT ch.*, p.name as path_name, pr.name as prof_name, pr_f.username FROM characters ch
    LEFT JOIN paths p ON ch.path_id=p.id LEFT JOIN professions pr ON ch.profession_id=pr.id
    LEFT JOIN profiles pr_f ON ch.user_id=pr_f.id WHERE pr_f.role != 'admin' ORDER BY ch.points DESC LIMIT ?`).all(limit);
  res.json(rows.map((r, i) => ({ rank: i+1, points: r.points, character: { ...r, path: r.path_name ? { id: r.path_id, name: r.path_name } : null, profession: r.prof_name ? { id: r.profession_id, name: r.prof_name } : null, profile: { username: r.username } } })));
});

app.get('/api/ranking/path/:pathId', async (req, res) => {
  const limit = parseInt(req.query.limit||100);
  const rows = await db.prepare(`SELECT ch.*, p.name as path_name, pr.name as prof_name, pr_f.username FROM characters ch
    LEFT JOIN paths p ON ch.path_id=p.id LEFT JOIN professions pr ON ch.profession_id=pr.id
    LEFT JOIN profiles pr_f ON ch.user_id=pr_f.id WHERE ch.path_id=? AND pr_f.role != 'admin' ORDER BY ch.faith_points DESC LIMIT ?`).all(req.params.pathId, limit);
  res.json(rows.map((r, i) => ({ rank: i+1, points: r.faith_points, character: { ...r, path: r.path_name ? { id: r.path_id, name: r.path_name } : null, profession: r.prof_name ? { id: r.profession_id, name: r.prof_name } : null, profile: { username: r.username } } })));
});

const oppositePaths = {'诞生':'污堕','污堕':'诞生','繁荣':'腐朽','腐朽':'繁荣','死亡':'湮灭','湮灭':'死亡','真理':'痴愚','痴愚':'真理','秩序':'混乱','混乱':'秩序','战争':'沉默','沉默':'战争','记忆':'欺诈','欺诈':'记忆','时间':'命运','命运':'时间'};

app.get('/api/ranking/opposite/:pathName', async (req, res) => {
  const limit = parseInt(req.query.limit||100);
  const oppName = oppositePaths[req.params.pathName];
  if (!oppName) return res.json({ myPath: [], oppositePath: [], merged: [] });
  const paths = await db.prepare('SELECT id, name FROM paths WHERE name IN (?,?)').all(req.params.pathName, oppName);
  const myPath = paths.find(p => p.name === req.params.pathName);
  const oppPath = paths.find(p => p.name === oppName);
  if (!myPath || !oppPath) return res.json({ myPath: [], oppositePath: [], merged: [] });
  const rows = await db.prepare(`SELECT ch.*, p.name as path_name, pr.name as prof_name, pr_f.username FROM characters ch
    LEFT JOIN paths p ON ch.path_id=p.id LEFT JOIN professions pr ON ch.profession_id=pr.id
    LEFT JOIN profiles pr_f ON ch.user_id=pr_f.id WHERE ch.path_id IN (?,?) AND pr_f.role != 'admin' ORDER BY ch.faith_points DESC LIMIT ?`).all(myPath.id, oppPath.id, limit*2);
  const myRows = rows.filter(r => r.path_id === myPath.id).slice(0, limit).map((r, i) => ({ rank: i+1, points: r.faith_points, character: { ...r, path: { id: r.path_id, name: r.path_name }, profession: r.prof_name ? { id: r.profession_id, name: r.prof_name } : null, profile: { username: r.username } } }));
  const oppRows = rows.filter(r => r.path_id === oppPath.id).slice(0, limit).map((r, i) => ({ rank: i+1, points: r.faith_points, character: { ...r, path: { id: r.path_id, name: r.path_name }, profession: r.prof_name ? { id: r.profession_id, name: r.prof_name } : null, profile: { username: r.username } } }));
  const merged = rows.slice(0, limit).map((r, i) => ({ rank: i+1, points: r.faith_points, character: { ...r, path: { id: r.path_id, name: r.path_name }, profession: r.prof_name ? { id: r.profession_id, name: r.prof_name } : null, profile: { username: r.username } } }));
  res.json({ myPath: myRows, oppositePath: oppRows, merged });
});

// ============ ANNOUNCEMENTS ============
app.get('/api/announcements', async (_, res) => {
  res.json(await db.prepare('SELECT * FROM announcements WHERE is_active=1 ORDER BY priority DESC, created_at DESC').all());
});

app.get('/api/announcements/all', async (_, res) => {
  res.json(await db.prepare('SELECT * FROM announcements ORDER BY priority DESC, created_at DESC').all());
});

app.post('/api/announcements', authMid, adminMid, async (req, res) => {
  const { content, priority = 0 } = req.body;
  const info = await db.prepare('INSERT INTO announcements(content,priority,created_by,is_active) VALUES(?,?,?,1)').run(content, priority, req.userId);
  res.json(await db.prepare('SELECT * FROM announcements WHERE id=?').get(info.lastInsertRowid));
});

app.put('/api/announcements/:id', authMid, adminMid, async (req, res) => {
  const { content, priority, is_active } = req.body;
  const sets = []; const vals = [];
  if (content !== undefined) { sets.push('content=?'); vals.push(content); }
  if (priority !== undefined) { sets.push('priority=?'); vals.push(priority); }
  if (is_active !== undefined) { sets.push('is_active=?'); vals.push(is_active?1:0); }
  if (sets.length) { sets.push('updated_at=?'); vals.push(new Date().toISOString()); vals.push(req.params.id); await db.prepare(`UPDATE announcements SET ${sets.join(',')} WHERE id=?`).run(...vals); }
  res.json({ success: true });
});

app.delete('/api/announcements/:id', authMid, adminMid, async (req, res) => {
  await db.prepare('DELETE FROM announcements WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ============ HOST APPLICATIONS ============
app.get('/api/host-applications', async (req, res) => {
  const { status } = req.query;
  let sql = `SELECT ha.*, pr.username FROM host_applications ha LEFT JOIN profiles pr ON ha.user_id=pr.id`;
  const params = [];
  if (status) { sql += ' WHERE ha.status=?'; params.push(status); }
  sql += ' ORDER BY ha.created_at DESC';
  const rows = await db.prepare(sql).all(...params);
  res.json(rows.map(r => ({ ...r, profile: { username: r.username } })));
});

app.post('/api/host-applications', authMid, async (req, res) => {
  await db.prepare('INSERT INTO host_applications(user_id) VALUES(?)').run(req.userId);
  res.json({ success: true });
});

app.put('/api/host-applications/:id/review', authMid, adminMid, async (req, res) => {
  const { status, reason } = req.body;
  const app = await db.prepare('SELECT * FROM host_applications WHERE id=?').get(req.params.id);
  if (!app) return res.status(404).json({ error: '申请不存在' });
  await db.prepare('UPDATE host_applications SET status=?,reason=?,reviewed_by=?,reviewed_at=? WHERE id=?').run(status, reason||null, req.userId, new Date().toISOString(), req.params.id);
  if (status === 'approved') await db.prepare('UPDATE profiles SET role=? WHERE id=?').run('host', app.user_id);
  res.json({ success: true });
});

// ============ REPORTS ============
app.get('/api/reports', async (_, res) => {
  const rows = await db.prepare(`SELECT r.*, rc.character_id as reporter_cid, rcp.username as reporter_name,
    dc.character_id as reported_cid, dcp.username as reported_name FROM reports r
    LEFT JOIN characters rc ON r.reporter_id=rc.id LEFT JOIN profiles rcp ON rc.user_id=rcp.id
    LEFT JOIN characters dc ON r.reported_id=dc.id LEFT JOIN profiles dcp ON dc.user_id=dcp.id
    ORDER BY r.created_at DESC`).all();
  res.json(rows.map(r => ({
    ...r,
    reporter: r.reporter_id ? { id: r.reporter_id, character_id: r.reporter_cid, profile: { username: r.reporter_name } } : null,
    reported: r.reported_id ? { id: r.reported_id, character_id: r.reported_cid, profile: { username: r.reported_name } } : null
  })));
});

app.post('/api/reports', authMid, async (req, res) => {
  const { reported_id, reason } = req.body;
  const char = await getCharacterByUserId(req.userId);
  await db.prepare('INSERT INTO reports(reporter_id,reported_id,reason) VALUES(?,?,?)').run(char?.id, reported_id, reason);
  res.json({ success: true });
});

app.put('/api/reports/:id/status', authMid, adminMid, async (req, res) => {
  const { status, action_taken } = req.body;
  await db.prepare('UPDATE reports SET status=?,reviewed_by=?,reviewed_at=?,action_taken=? WHERE id=?').run(status, req.userId, new Date().toISOString(), action_taken||null, req.params.id);
  res.json({ success: true });
});

// ============ BANS ============
app.post('/api/characters/:id/ban', authMid, adminMid, async (req, res) => {
  const { reason, days } = req.body;
  const until = new Date(); until.setDate(until.getDate() + (days||7));
  await db.prepare('INSERT INTO bans(character_id,banned_by,reason,banned_until) VALUES(?,?,?,?)').run(req.params.id, req.userId, reason, until.toISOString());
  await db.prepare('UPDATE characters SET banned_until=? WHERE id=?').run(until.toISOString(), req.params.id);
  res.json({ success: true });
});

app.post('/api/characters/:id/unban', authMid, adminMid, async (req, res) => {
  await db.prepare('UPDATE characters SET banned_until=NULL WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/characters/:id/bans', async (req, res) => {
  res.json(await db.prepare('SELECT * FROM bans WHERE character_id=? ORDER BY created_at DESC').all(req.params.id));
});

// ============ ACHIEVEMENTS ============
app.get('/api/achievements', async (_, res) => {
  res.json(await db.prepare('SELECT * FROM achievements ORDER BY created_at DESC').all());
});

app.post('/api/achievements', authMid, adminMid, async (req, res) => {
  const info = await db.prepare('INSERT INTO achievements(name,description,type) VALUES(?,?,?)').run(req.body.name, req.body.description, req.body.type||'manual');
  res.json(await db.prepare('SELECT * FROM achievements WHERE id=?').get(info.lastInsertRowid));
});

app.put('/api/achievements/:id', authMid, adminMid, async (req, res) => {
  const { name, description, type } = req.body;
  await db.prepare('UPDATE achievements SET name=?,description=?,type=? WHERE id=?').run(name, description, type, req.params.id);
  res.json({ success: true });
});

app.delete('/api/achievements/:id', authMid, adminMid, async (req, res) => {
  await db.prepare('DELETE FROM achievements WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/characters/:id/achievements', async (req, res) => {
  const rows = await db.prepare(`SELECT ca.*, a.name, a.description, a.type FROM character_achievements ca
    JOIN achievements a ON ca.achievement_id=a.id WHERE ca.character_id=? ORDER BY ca.awarded_at DESC`).all(req.params.id);
  res.json(rows.map(r => ({ ...r, achievement: { id: r.achievement_id, name: r.name, description: r.description, type: r.type } })));
});

app.post('/api/characters/:id/achievements', authMid, adminMid, async (req, res) => {
  const { achievement_id, awarded_by } = req.body;
  await db.prepare('INSERT INTO character_achievements(character_id,achievement_id,awarded_by) VALUES(?,?,?)').run(req.params.id, achievement_id, awarded_by);
  res.json({ success: true });
});

app.delete('/api/characters/:id/achievements/:achId', authMid, adminMid, async (req, res) => {
  await db.prepare('DELETE FROM character_achievements WHERE character_id=? AND achievement_id=?').run(req.params.id, req.params.achId);
  res.json({ success: true });
});

// ============ CURSE TALENTS ============
app.get('/api/characters/:id/curse-talents', async (req, res) => {
  res.json(await db.prepare('SELECT * FROM curse_talents WHERE character_id=? ORDER BY created_at DESC').all(req.params.id));
});

// ============ GAME SETTINGS ============
app.get('/api/game-settings', async (_, res) => {
  const rows = await db.prepare('SELECT setting_key, setting_value FROM game_settings').all();
  const obj = {}; rows.forEach(r => obj[r.setting_key] = r.setting_value);
  res.json(obj);
});

app.put('/api/game-settings/:key', authMid, adminMid, async (req, res) => {
  await db.prepare('UPDATE game_settings SET setting_value=?,updated_at=? WHERE setting_key=?').run(req.body.value, new Date().toISOString(), req.params.key);
  res.json({ success: true });
});

// ============ REGISTRATION ============
app.post('/api/registration/apply', authMid, async (req, res) => {
  const existing = await db.prepare('SELECT * FROM registration_applications WHERE user_id=?').get(req.userId);
  if (existing) {
    if (existing.status === 'pending') return res.json({ success: false, message: '您已提交过注册申请，请等待审核' });
    if (existing.status === 'approved') return res.json({ success: false, message: '您的注册已通过审核，请选择命途和职业' });
    await db.prepare('DELETE FROM registration_applications WHERE id=?').run(existing.id);
  }
  const char = await db.prepare('SELECT id FROM characters WHERE user_id=?').get(req.userId);
  if (char) return res.json({ success: false, message: '您已经有角色了' });
  await db.prepare('INSERT INTO registration_applications(user_id,status) VALUES(?,?)').run(req.userId, 'pending');
  res.json({ success: true, message: '注册申请已提交，请等待管理员审核' });
});

app.get('/api/registration/status', authMid, async (req, res) => {
  const app = await db.prepare('SELECT * FROM registration_applications WHERE user_id=?').get(req.userId);
  if (!app) return res.json({ hasApplication: false });
  res.json({ hasApplication: true, status: app.status, rejectReason: app.reject_reason||undefined, applicationId: app.id });
});

app.get('/api/registration/check', authMid, async (req, res) => {
  const char = await db.prepare('SELECT id FROM characters WHERE user_id=?').get(req.userId);
  if (char) return res.json({ canLogin: true });
  const app = await db.prepare('SELECT * FROM registration_applications WHERE user_id=?').get(req.userId);
  if (!app) return res.json({ canLogin: false, reason: '请先注册账号', status: 'no_application' });
  if (app.status === 'pending') return res.json({ canLogin: false, reason: '您的注册申请正在审核中，请耐心等待', status: 'pending' });
  if (app.status === 'rejected') return res.json({ canLogin: false, reason: `您的注册申请已被拒绝：${app.reject_reason||'未提供原因'}`, status: 'rejected' });
  res.json({ canLogin: true });
});

app.post('/api/registration/create-character', authMid, async (req, res) => {
  const { path_id, profession_id } = req.body;
  const app = await db.prepare('SELECT * FROM registration_applications WHERE user_id=?').get(req.userId);
  if (!app || app.status !== 'approved') return res.json({ success: false, message: '注册申请尚未通过审核' });
  const char = await db.prepare('SELECT id FROM characters WHERE user_id=?').get(req.userId);
  if (char) return res.json({ success: false, message: '您已经有角色了' });
  const path = await db.prepare('SELECT name FROM paths WHERE id=?').get(path_id);
  const prof = await db.prepare('SELECT name FROM professions WHERE id=?').get(profession_id);
  if (!path || !prof) return res.json({ success: false, message: '选择的命途或职业无效' });
  const charId = `${path.name.charAt(0)}${prof.name.charAt(0)}${Math.floor(10000*Math.random()).toString().padStart(4,'0')}`;
  await db.prepare('INSERT INTO characters(user_id,character_id,path_id,profession_id,points,faith_points,curse_count,abandoned_path_ids) VALUES(?,?,?,?,?,?,?,?)').run(req.userId,charId,path_id,profession_id,1000,0,0,'[]');
  res.json({ success: true, message: '角色创建成功', characterId: charId });
});

app.get('/api/registration/applications', authMid, adminMid, async (req, res) => {
  const { status } = req.query;
  let sql = `SELECT ra.* FROM registration_applications ra`;
  const params = [];
  if (status) { sql += ' WHERE ra.status=?'; params.push(status); }
  sql += ' ORDER BY ra.created_at DESC';
  const rows = await db.prepare(sql).all(...params);
  const userIds = rows.map(r => r.user_id);
  const profiles = userIds.length ? await db.prepare(`SELECT id, username FROM profiles WHERE id IN (${userIds.map(()=>'?').join(',')})`).all(...userIds) : [];
  const profMap = new Map(profiles.map(p => [p.id, p.username]));
  res.json(rows.map(r => ({ ...r, username: profMap.get(r.user_id)||null })));
});

app.put('/api/registration/applications/:id/review', authMid, adminMid, async (req, res) => {
  const { approved, reject_reason } = req.body;
  const app = await db.prepare('SELECT * FROM registration_applications WHERE id=?').get(req.params.id);
  if (!app) return res.json({ success: false, message: '申请不存在' });
  if (app.status !== 'pending') return res.json({ success: false, message: '该申请已被处理' });
  if (approved) {
    await db.prepare('UPDATE registration_applications SET status=?,reviewed_by=?,reviewed_at=? WHERE id=?').run('approved', req.userId, new Date().toISOString(), req.params.id);
    res.json({ success: true, message: '申请已通过，用户可以选择命途和职业' });
  } else {
    await db.prepare('UPDATE registration_applications SET status=?,reviewed_by=?,reviewed_at=?,reject_reason=? WHERE id=?').run('rejected', req.userId, new Date().toISOString(), reject_reason||'未提供原因', req.params.id);
    res.json({ success: true, message: '申请已拒绝' });
  }
});

// ============ HOST RATINGS ============
app.get('/api/trials/:trialId/ratings', async (req, res) => {
  const rows = await db.prepare(`SELECT hr.*, ch.character_id as host_cid, hpr.username as host_name,
    rc.character_id as rater_cid, rpr.username as rater_name FROM host_ratings hr
    LEFT JOIN characters ch ON hr.host_id=ch.id LEFT JOIN profiles hpr ON ch.user_id=hpr.id
    LEFT JOIN characters rc ON hr.rater_id=rc.id LEFT JOIN profiles rpr ON rc.user_id=rpr.id
    WHERE hr.trial_id=? ORDER BY hr.created_at DESC`).all(req.params.trialId);
  res.json(rows.map(r => ({
    ...r,
    host: { id: r.host_id, character_id: r.host_cid, profile: { username: r.host_name } },
    rater: { id: r.rater_id, character_id: r.rater_cid, profile: { username: r.rater_name } }
  })));
});

app.post('/api/trials/:trialId/ratings', authMid, async (req, res) => {
  const { host_id, dual_points, faith_points } = req.body;
  const char = await getCharacterByUserId(req.userId);
  const trial = await db.prepare('SELECT status FROM trials WHERE id=?').get(req.params.trialId);
  if (!trial) return res.status(400).json({ error: '试炼不存在' });
  if (trial.status !== 'finished') return res.status(400).json({ error: '试炼未结束，无法评分' });
  await db.prepare('INSERT OR REPLACE INTO host_ratings(trial_id,host_id,rater_id,dual_points,faith_points) VALUES(?,?,?,?,?)').run(req.params.trialId, host_id, char.id, dual_points, faith_points);
  if (dual_points !== 0) {
    const host = await db.prepare('SELECT points, max_points FROM characters WHERE id=?').get(host_id);
    if (host) {
      const newPoints = host.points + dual_points;
      const newMax = Math.max(host.max_points, newPoints);
      await db.prepare('UPDATE characters SET points=?,max_points=? WHERE id=?').run(newPoints, newMax, host_id);
    }
  }
  if (faith_points !== 0) await db.prepare('UPDATE characters SET faith_points=GREATEST(0,faith_points+?) WHERE id=?').run(faith_points, host_id);
  res.json({ success: true });
});

app.get('/api/trials/:trialId/ratings/check', authMid, async (req, res) => {
  const char = await getCharacterByUserId(req.userId);
  const rating = await db.prepare('SELECT id FROM host_ratings WHERE trial_id=? AND rater_id=?').get(req.params.trialId, char?.id);
  res.json({ hasRated: !!rating });
});

// ============ CHAT / LOCATIONS ============
app.get('/api/trials/:trialId/locations', async (req, res) => {
  res.json(await db.prepare('SELECT * FROM trial_locations WHERE trial_id=? ORDER BY created_at').all(req.params.trialId));
});

app.post('/api/trials/:trialId/locations', authMid, async (req, res) => {
  const { location_name, created_by } = req.body;
  const info = await db.prepare('INSERT INTO trial_locations(trial_id,location_name,created_by) VALUES(?,?,?)').run(req.params.trialId, location_name, created_by);
  res.json(await db.prepare('SELECT * FROM trial_locations WHERE id=?').get(info.lastInsertRowid));
});

app.get('/api/locations/:locId/messages', async (req, res) => {
  const { character_id, is_observer } = req.query;
  const loc = await db.prepare('SELECT trial_id FROM trial_locations WHERE id=?').get(req.params.locId);
  if (!loc) return res.json([]);
  let sql = `SELECT m.*, ch.character_id as ch_cid, ch.path_id, ch.profession_id, ch.points, ch.faith_points, ch.curse_count,
    pa.name as path_name, pf.name as prof_name, pr.username FROM location_chat_messages m
    LEFT JOIN characters ch ON m.character_id=ch.id LEFT JOIN paths pa ON ch.path_id=pa.id
    LEFT JOIN professions pf ON ch.profession_id=pf.id LEFT JOIN profiles pr ON ch.user_id=pr.id
    WHERE m.location_id=? ORDER BY m.created_at`;
  let messages = await db.prepare(sql).all(req.params.locId);
  if (!is_observer || is_observer !== 'true') {
    const history = await db.prepare('SELECT * FROM location_visit_history WHERE location_id=? AND character_id=? ORDER BY entered_at').all(req.params.locId, character_id);
    if (history.length === 0) return res.json([]);
    messages = messages.filter(m => {
      const t = new Date(m.created_at).getTime();
      return history.some(h => { const enter = new Date(h.entered_at).getTime(); const left = h.left_at ? new Date(h.left_at).getTime() : Date.now(); return t >= enter && t <= left; });
    });
  }
  res.json(messages.map(m => ({
    ...m, character: { id: m.character_id, character_id: m.ch_cid, path: m.path_name ? { id: m.path_id, name: m.path_name } : null,
      profession: m.prof_name ? { id: m.profession_id, name: m.prof_name } : null, profile: { username: m.username } }
  })));
});

app.post('/api/locations/:locId/messages', authMid, async (req, res) => {
  const { character_id, message, image_url } = req.body;
  const info = await db.prepare('INSERT INTO location_chat_messages(location_id,character_id,message,image_url) VALUES(?,?,?,?)').run(req.params.locId, character_id, message||null, image_url||null);
  res.json(await db.prepare('SELECT * FROM location_chat_messages WHERE id=?').get(info.lastInsertRowid));
});

app.post('/api/locations/:locId/join', authMid, async (req, res) => {
  const { character_id } = req.body;
  await db.prepare('INSERT INTO location_visit_history(location_id,character_id,entered_at) VALUES(?,?,?)').run(req.params.locId, character_id, new Date().toISOString());
  const existing = await db.prepare('SELECT * FROM location_chat_members WHERE location_id=? AND character_id=?').get(req.params.locId, character_id);
  if (existing) await db.prepare('UPDATE location_chat_members SET is_active=1,left_at=NULL WHERE id=?').run(existing.id);
  else await db.prepare('INSERT INTO location_chat_members(location_id,character_id,is_active) VALUES(?,?,1)').run(req.params.locId, character_id);
  res.json({ success: true });
});

app.post('/api/locations/:locId/leave', authMid, async (req, res) => {
  const { character_id } = req.body;
  const lastVisit = await db.prepare('SELECT * FROM location_visit_history WHERE location_id=? AND character_id=? AND left_at IS NULL ORDER BY entered_at DESC LIMIT 1').get(req.params.locId, character_id);
  if (lastVisit) await db.prepare('UPDATE location_visit_history SET left_at=? WHERE id=?').run(new Date().toISOString(), lastVisit.id);
  await db.prepare('UPDATE location_chat_members SET is_active=0,left_at=? WHERE location_id=? AND character_id=? AND is_active=1').run(new Date().toISOString(), req.params.locId, character_id);
  res.json({ success: true });
});

// Private messages
app.get('/api/trials/:trialId/private-messages/:charId/:otherId', async (req, res) => {
  const rows = await db.prepare(`SELECT m.*, sc.character_id as sender_cid, spr.username as sender_name,
    rc.character_id as recv_cid, rpr.username as recv_name FROM trial_private_messages m
    LEFT JOIN characters sc ON m.sender_id=sc.id LEFT JOIN profiles spr ON sc.user_id=spr.id
    LEFT JOIN characters rc ON m.receiver_id=rc.id LEFT JOIN profiles rpr ON rc.user_id=rpr.id
    WHERE m.trial_id=? AND ((m.sender_id=? AND m.receiver_id=?) OR (m.sender_id=? AND m.receiver_id=?))
    ORDER BY m.created_at`).all(req.params.trialId, req.params.charId, req.params.otherId, req.params.otherId, req.params.charId);
  res.json(rows.map(m => ({
    ...m,
    sender: { id: m.sender_id, character_id: m.sender_cid, profile: { username: m.sender_name } },
    receiver: { id: m.receiver_id, character_id: m.recv_cid, profile: { username: m.recv_name } }
  })));
});

app.post('/api/trials/:trialId/private-messages', authMid, async (req, res) => {
  const { sender_id, receiver_id, message, image_url } = req.body;
  const info = await db.prepare('INSERT INTO trial_private_messages(trial_id,sender_id,receiver_id,message,image_url) VALUES(?,?,?,?,?)').run(req.params.trialId, sender_id, receiver_id, message||null, image_url||null);
  res.json(await db.prepare('SELECT * FROM trial_private_messages WHERE id=?').get(info.lastInsertRowid));
});

app.put('/api/private-messages/read', authMid, async (req, res) => {
  const { message_ids } = req.body;
  const placeholders = message_ids.map(()=>'?').join(',');
  await db.prepare(`UPDATE trial_private_messages SET is_read=1 WHERE id IN (${placeholders})`).run(...message_ids);
  res.json({ success: true });
});

app.get('/api/trials/:trialId/unread/:charId', async (req, res) => {
  const count = await db.prepare('SELECT COUNT(*) as c FROM trial_private_messages WHERE trial_id=? AND receiver_id=? AND is_read=0').get(req.params.trialId, req.params.charId);
  res.json(count.c);
});

// ============ IMAGE UPLOAD ============
app.post('/api/upload', authMid, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '没有文件' });
  const filename = `${Date.now()}-${Math.random().toString(36).substr(2,9)}.jpg`;
  const dir = 'uploads';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  fs.writeFileSync(`${dir}/${filename}`, req.file.buffer);
  res.json({ url: `/uploads/${filename}` });
});

app.use('/uploads', express.static('uploads'));

// ============ ADMIN LOGS ============
app.post('/api/admin-logs', authMid, adminMid, async (req, res) => {
  const { action, target_type, target_id, reason } = req.body;
  await db.prepare('INSERT INTO admin_logs(admin_id,action,target_type,target_id,reason) VALUES(?,?,?,?,?)').run(req.userId, action, target_type, target_id, reason||null);
  res.json({ success: true });
});

// ============ FREQUENT TRADE ALERTS ============
app.get('/api/trade-alerts', async (_, res) => {
  res.json(await db.prepare('SELECT * FROM frequent_trade_alerts WHERE status=? ORDER BY trade_count DESC').all('pending'));
});

app.put('/api/trade-alerts/:id', authMid, adminMid, async (req, res) => {
  const { status, admin_note } = req.body;
  await db.prepare('UPDATE frequent_trade_alerts SET status=?,admin_note=?,updated_at=? WHERE id=?').run(status, admin_note, new Date().toISOString(), req.params.id);
  res.json({ success: true });
});

// ============ ACCOUNT DELETION ============
app.get('/api/account-deletion/requests', authMid, adminMid, async (_, res) => {
  const rows = await db.prepare(`SELECT r.*, ac.character_id as applicant_cid, apr.username as applicant_name,
    tc.character_id as target_cid, tpr.username as target_name FROM account_deletion_requests r
    LEFT JOIN characters ac ON r.applicant_admin_id=ac.id LEFT JOIN profiles apr ON ac.user_id=apr.id
    LEFT JOIN characters tc ON r.target_player_id=tc.id LEFT JOIN profiles tpr ON tc.user_id=tpr.id
    ORDER BY r.created_at DESC`).all();
  res.json(rows.map(r => ({
    ...r,
    applicant: { id: r.applicant_admin_id, character_id: r.applicant_cid, profile: { username: r.applicant_name } },
    target: { id: r.target_player_id, character_id: r.target_cid, profile: { username: r.target_name } }
  })));
});

app.post('/api/account-deletion/requests', authMid, adminMid, async (req, res) => {
  const { target_player_id, reason } = req.body;
  const char = await getCharacterByUserId(req.userId);
  const info = await db.prepare('INSERT INTO account_deletion_requests(applicant_admin_id,target_player_id,reason,status) VALUES(?,?,?,?)').run(char.id, target_player_id, reason, 'pending');
  res.json(await db.prepare('SELECT * FROM account_deletion_requests WHERE id=?').get(info.lastInsertRowid));
});

app.post('/api/account-deletion/requests/:id/approve', authMid, adminMid, async (req, res) => {
  const { approved, comment } = req.body;
  const request = await db.prepare('SELECT * FROM account_deletion_requests WHERE id=? AND status=?').get(req.params.id, 'pending');
  if (!request) return res.status(400).json({ error: '申请不存在或已处理' });
  const char = await getCharacterByUserId(req.userId);
  if (request.applicant_admin_id === char.id) return res.status(400).json({ error: '不能审批自己的申请' });
  await db.prepare('INSERT INTO deletion_approvals(request_id,admin_id,approved,comment) VALUES(?,?,?,?)').run(req.params.id, char.id, approved?1:0, comment||null);
  if (!approved) {
    await db.prepare('UPDATE account_deletion_requests SET status=? WHERE id=?').run('rejected', req.params.id);
    return res.json({ success: true });
  }
  const approvals = await db.prepare('SELECT * FROM deletion_approvals WHERE request_id=? AND approved=1').all(req.params.id);
  if (approvals.length >= 2) {
    await db.prepare('UPDATE account_deletion_requests SET status=? WHERE id=?').run('approved', req.params.id);
  }
  res.json({ success: true });
});

app.post('/api/account-deletion/requests/:id/execute', authMid, adminMid, async (req, res) => {
  const request = await db.prepare('SELECT * FROM account_deletion_requests WHERE id=? AND status=?').get(req.params.id, 'approved');
  if (!request) return res.status(400).json({ error: '申请不存在或状态不正确' });
  await db.prepare('DELETE FROM characters WHERE id=?').run(request.target_player_id);
  await db.prepare('UPDATE account_deletion_requests SET status=?,executed_at=? WHERE id=?').run('executed', new Date().toISOString(), req.params.id);
  res.json({ success: true });
});

// ============ BATTLE SYSTEM ============
app.get('/api/trials/:trialId/battle-states', async (req, res) => {
  res.json(await db.prepare('SELECT * FROM battle_states WHERE trial_id=?').all(req.params.trialId));
});

app.post('/api/trials/:trialId/battle-init', authMid, async (req, res) => {
  const { character_ids } = req.body;
  const trialId = parseInt(req.params.trialId);
  const hpMap = { '战士':50,'猎人':50,'法师':40,'歌者':40,'牧师':40,'刺客':40 };
  const mpMap = { '战士':40,'猎人':40,'法师':50,'歌者':50,'牧师':50,'刺客':40 };
  for (const charId of character_ids) {
    const existing = await db.prepare('SELECT id FROM battle_states WHERE trial_id=? AND character_id=?').get(trialId, charId);
    if (existing) continue;
    const char = await getCharacterById(charId);
    const profName = char?.profession?.name || '战士';
    await db.prepare('INSERT INTO battle_states(trial_id,character_id,hp,max_hp,mp,max_mp,agility,defense,is_ready) VALUES(?,?,?,?,?,?,?,?,1)').run(trialId, charId, hpMap[profName]||40, hpMap[profName]||40, mpMap[profName]||40, mpMap[profName]||40, 14, 1);
  }
  res.json({ success: true });
});

app.put('/api/trials/:trialId/battle-states/:charId', authMid, async (req, res) => {
  const { hp, mp, defense, agility } = req.body;
  const updates = { updated_at: new Date().toISOString() };
  if (hp !== undefined) updates.hp = Math.max(0, hp);
  if (mp !== undefined) updates.mp = Math.max(0, mp);
  if (defense !== undefined) updates.defense = Math.max(0, defense);
  if (agility !== undefined) updates.agility = Math.max(0, agility);
  const sets = Object.keys(updates).map(k => `${k}=?`).join(',');
  const trialId = parseInt(req.params.trialId); const charId = parseInt(req.params.charId);
  await db.prepare(`UPDATE battle_states SET ${sets} WHERE trial_id=? AND character_id=?`).run(...Object.values(updates), trialId, charId);
  res.json({ success: true });
});

// Talent usage notifications
app.get('/api/trials/:trialId/talent-notifications', async (req, res) => {
  const rows = await db.prepare(`SELECT n.*, ch.character_id, pr.username, t.name as talent_name, i.name as item_name
    FROM talent_usage_notifications n LEFT JOIN characters ch ON n.character_id=ch.id
    LEFT JOIN profiles pr ON ch.user_id=pr.id LEFT JOIN talents t ON n.talent_id=t.id
    LEFT JOIN items i ON n.item_id=i.id WHERE n.trial_id=? AND n.status=? ORDER BY n.created_at`).all(req.params.trialId, 'pending');
  res.json(rows.map(r => ({
    ...r,
    character: { id: r.character_id, character_id: r.character_id, profile: { username: r.username } },
    talent: r.talent_id ? { id: r.talent_id, name: r.talent_name } : null,
    item: r.item_id ? { id: r.item_id, name: r.item_name } : null
  })));
});

app.post('/api/talent-notifications/:id/process', authMid, async (req, res) => {
  await db.prepare('UPDATE talent_usage_notifications SET status=?,processed_at=? WHERE id=?').run('processed', new Date().toISOString(), req.params.id);
  res.json({ success: true });
});

app.post('/api/trials/:trialId/talent-notifications/process-all', authMid, async (req, res) => {
  await db.prepare('UPDATE talent_usage_notifications SET status=?,processed_at=? WHERE trial_id=? AND status=?').run('processed', new Date().toISOString(), req.params.trialId, 'pending');
  res.json({ success: true });
});

// Talent cooldowns
app.get('/api/trials/:trialId/cooldowns/:charId', async (req, res) => {
  const now = new Date();
  const rows = await db.prepare('SELECT talent_id, available_at FROM talent_cooldowns WHERE character_id=? AND trial_id=? AND available_at>?').all(req.params.charId, req.params.trialId, now.toISOString());
  const obj = {};
  rows.forEach(r => { obj[r.talent_id] = Math.ceil((new Date(r.available_at).getTime() - now.getTime()) / 1000); });
  res.json(obj);
});

// Discard items
app.post('/api/characters/:id/discard', authMid, async (req, res) => {
  const { item_ids, quantity } = req.body;
  const ids = Array.isArray(item_ids) ? item_ids : [item_ids];
  if (ids.length === 1 && quantity && quantity > 0) {
    const item = await db.prepare('SELECT * FROM character_items WHERE id=?').get(ids[0]);
    if (!item) return res.json({ success: false });
    if (quantity >= item.quantity) await db.prepare('DELETE FROM character_items WHERE id=?').run(ids[0]);
    else await db.prepare('UPDATE character_items SET quantity=quantity-? WHERE id=?').run(quantity, ids[0]);
  } else {
    const placeholders = ids.map(()=>'?').join(',');
    await db.prepare(`DELETE FROM character_items WHERE id IN (${placeholders})`).run(...ids);
  }
  res.json({ success: true });
});

// Exchange items for draws
app.post('/api/characters/:id/exchange', authMid, async (req, res) => {
  const { item_ids } = req.body;
  const charId = parseInt(req.params.id);
  if (item_ids.length === 0 || item_ids.length % 5 !== 0) return res.json({ success: false, message: '道具数量必须是5的倍数' });
  const draws = item_ids.length / 5;
  const placeholders = item_ids.map(()=>'?').join(',');
  await db.prepare(`DELETE FROM character_items WHERE id IN (${placeholders}) AND character_id=?`).run(...item_ids, charId);
  await db.prepare('UPDATE characters SET global_item_draws=global_item_draws+? WHERE id=?').run(draws, charId);
  res.json({ success: true, message: `兑换成功！获得${draws}次道具抽奖次数`, itemDraws: draws });
});

// Trial nickname
app.put('/api/trials/:trialId/participants/:pid/nickname', authMid, async (req, res) => {
  await db.prepare('UPDATE trial_participants SET trial_nickname=? WHERE id=?').run(req.body.nickname, req.params.pid);
  res.json({ success: true });
});

// Instant draw records
app.get('/api/trials/:trialId/draw-records/:charId', async (req, res) => {
  const { is_host } = req.query;
  let sql = 'SELECT * FROM instant_draw_records WHERE trial_id=? AND character_id=?';
  const params = [req.params.trialId, req.params.charId];
  if (is_host === 'true') sql += ' AND is_host_reward=1';
  sql += ' LIMIT 1';
  res.json(await db.prepare(sql).get(...params) || null);
});

app.post('/api/trials/:trialId/draw-records', authMid, async (req, res) => {
  const { character_id, ascension_score, faith_score, talent_draws, item_draws, is_host_reward } = req.body;
  await db.prepare('INSERT OR REPLACE INTO instant_draw_records(trial_id,character_id,ascension_score,faith_score,talent_draws,item_draws,is_host_reward) VALUES(?,?,?,?,?,?,?)').run(req.params.trialId,character_id,ascension_score,faith_score,talent_draws,item_draws,is_host_reward?1:0);
  res.json({ success: true, talentDraws: talent_draws, itemDraws: item_draws });
});

app.put('/api/trials/:trialId/draw-records/:charId', authMid, async (req, res) => {
  const { drawn_talents, drawn_items, is_host } = req.body;
  let sql = 'UPDATE instant_draw_records SET is_drawn=1';
  const params = [];
  if (drawn_talents !== undefined) { sql += ',drawn_talents=?'; params.push(JSON.stringify(drawn_talents||[])); }
  if (drawn_items !== undefined) { sql += ',drawn_items=?'; params.push(JSON.stringify(drawn_items||[])); }
  sql += ' WHERE trial_id=? AND character_id=?';
  params.push(parseInt(req.params.trialId), parseInt(req.params.charId));
  if (is_host) sql += ' AND is_host_reward=1';
  await db.prepare(sql).run(...params);
  res.json({ success: true });
});

// Check trial completion
app.post('/api/trials/:trialId/check-complete', authMid, async (req, res) => {
  const trialId = parseInt(req.params.trialId);
  const trial = await db.prepare('SELECT * FROM trials WHERE id=?').get(trialId);
  if (!trial || trial.status !== 'settling') return res.json({ success: false });
  const records = await db.prepare('SELECT * FROM instant_draw_records WHERE trial_id=?').all(trialId);
  const allDrawn = records.every(r => r.is_drawn || (r.talent_draws === 0 && r.item_draws === 0));
  if (allDrawn) {
    await db.prepare('UPDATE trials SET status=? WHERE id=?').run('finished', trialId);
    const ongoing = await db.prepare('SELECT id FROM trials WHERE host_id=? AND status=?').all(trial.host_id, 'ongoing');
    if (ongoing.length === 0) {
      const hostChar = await getCharacterById(trial.host_id);
      if (hostChar) await db.prepare('UPDATE profiles SET role=? WHERE id=?').run('player', hostChar.user_id);
    }
  }
  res.json({ success: true, finished: allDrawn });
});

// Settlement host ratings
app.post('/api/trials/:trialId/settle-host', authMid, async (req, res) => {
  const trialId = parseInt(req.params.trialId);
  const trial = await db.prepare('SELECT * FROM trials WHERE id=?').get(trialId);
  if (!trial || (trial.status !== 'finished' && trial.status !== 'settling')) return res.json({ success: false });
  const ratings = await db.prepare('SELECT * FROM host_ratings WHERE trial_id=?').all(trialId);
  if (ratings.length === 0) return res.json({ success: true });
  let dualPoints = 0, faithPoints = 0;
  if (ratings.length === 1) { dualPoints = ratings[0].dual_points; faithPoints = ratings[0].faith_points; }
  else if (ratings.length >= 3) {
    const dual = ratings.map(r => r.dual_points).sort((a,b) => a-b).slice(1, -1);
    const faith = ratings.map(r => r.faith_points).sort((a,b) => a-b).slice(1, -1);
    dualPoints = Math.round(dual.reduce((s,v) => s+v, 0) / dual.length);
    faithPoints = Math.round(faith.reduce((s,v) => s+v, 0) / faith.length);
  } else {
    dualPoints = Math.round(ratings.reduce((s,r) => s+r.dual_points, 0) / ratings.length);
    faithPoints = Math.round(ratings.reduce((s,r) => s+r.faith_points, 0) / ratings.length);
  }
  if (dualPoints !== 0 || faithPoints !== 0) {
    const char = await getCharacterById(trial.host_id);
    if (char) {
      const newPoints = Math.max(0, char.points + dualPoints);
      const newMax = Math.max(char.max_points, newPoints);
      const newFaith = Math.max(0, char.faith_points + faithPoints);
      await db.prepare('UPDATE characters SET points=?,max_points=?,faith_points=? WHERE id=?').run(newPoints, newMax, newFaith, trial.host_id);
    }
  }
  res.json({ success: true });
});

// ============ STATIC FILES (Client) ============
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.join(__dirname, '../client/dist');
app.use(express.static(clientDir));
app.get('*', (req, res) => { res.sendFile(path.join(clientDir, 'index.html')); });

// Initialize and start
async function start() {
  await initSchema();
  await seedData();
  app.listen(PORT, '0.0.0.0', () => { console.log(`Server running on http://0.0.0.0:${PORT}`); });
}
start();
