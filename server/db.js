import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  // Transaction pooler mode (port 6543) doesn't support prepared statements
  ...(process.env.DATABASE_URL && process.env.DATABASE_URL.includes(':6543') ? { statement_timeout: 30000 } : {}),
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err);
});

// ? → $1,$2,...
function cvtPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// SQLite → PG syntax
function cvtSql(sql) {
  let s = sql.replace(/datetime\('now'\)/gi, 'NOW()');
  s = s.replace(/MAX\(0,\s*/gi, 'GREATEST(0, ');
  s = cvtPlaceholders(s);
  return s;
}

class Stmt {
  constructor(sql) {
    this.orig = sql;
    this.orIgnore = /INSERT\s+OR\s+IGNORE/i.test(sql);
    this.orReplace = /INSERT\s+OR\s+REPLACE/i.test(sql);
    let s = sql.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
    s = s.replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'INSERT INTO');
    this.sql = cvtSql(s);
  }

  async run(...args) {
    let sql = this.sql;
    if (this.orIgnore) {
      if (!/ON\s+CONFLICT/i.test(sql)) sql += ' ON CONFLICT DO NOTHING';
    } else if (this.orReplace) {
      if (!/ON\s+CONFLICT/i.test(sql)) sql += ' ON CONFLICT DO NOTHING';
    } else if (/^\s*INSERT\s/i.test(sql) && !/RETURNING/i.test(sql)) {
      sql += ' RETURNING id';
    }
    const res = await pool.query(sql, args);
    return { lastInsertRowid: res.rows[0]?.id ?? null, changes: res.rowCount ?? 0 };
  }

  async get(...args) {
    const res = await pool.query(this.sql, args);
    return res.rows[0] || undefined;
  }

  async all(...args) {
    const res = await pool.query(this.sql, args);
    return res.rows;
  }
}

const db = {
  prepare(sql) { return new Stmt(sql); },
  async exec(sql) {
    let s = sql.replace(/datetime\('now'\)/gi, 'NOW()');
    await pool.query(s);
  },
  _pool: pool,
};

// ---- Schema (PostgreSQL) ----
const SCHEMA = `
CREATE TABLE IF NOT EXISTS profiles(
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'player',
  password_hash TEXT,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS paths(
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT
);
CREATE TABLE IF NOT EXISTS professions(
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT
);
CREATE TABLE IF NOT EXISTS talents(
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'active',
  faith_id INTEGER REFERENCES paths(id),
  profession_id INTEGER REFERENCES professions(id),
  grade TEXT DEFAULT 'C',
  cooldown_seconds INTEGER DEFAULT 60
);
CREATE TABLE IF NOT EXISTS items(
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'consumable',
  is_tradable INTEGER DEFAULT 1,
  is_drawable INTEGER DEFAULT 1,
  grade TEXT DEFAULT 'D'
);
CREATE TABLE IF NOT EXISTS characters(
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id),
  character_id TEXT UNIQUE NOT NULL,
  path_id INTEGER REFERENCES paths(id),
  profession_id INTEGER REFERENCES professions(id),
  points INTEGER DEFAULT 1000,
  max_points INTEGER DEFAULT 1000,
  faith_points INTEGER DEFAULT 0,
  talent_draw_count INTEGER DEFAULT 2,
  item_draw_count INTEGER DEFAULT 2,
  curse_count INTEGER DEFAULT 0,
  abandoned_path_ids TEXT DEFAULT '[]',
  banned_until TEXT,
  equipped_item_id INTEGER,
  equipment_appearance TEXT,
  global_item_draws INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS character_talents(
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  talent_id INTEGER NOT NULL REFERENCES talents(id),
  is_locked INTEGER DEFAULT 0,
  acquired_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS')),
  UNIQUE(character_id, talent_id)
);
CREATE TABLE IF NOT EXISTS character_items(
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id),
  quantity INTEGER DEFAULT 1,
  acquired_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS')),
  UNIQUE(character_id, item_id)
);
CREATE TABLE IF NOT EXISTS achievements(
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'manual',
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS character_achievements(
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  achievement_id INTEGER NOT NULL REFERENCES achievements(id),
  awarded_by TEXT,
  awarded_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS curse_talents(
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS trials(
  id SERIAL PRIMARY KEY,
  host_id INTEGER NOT NULL REFERENCES characters(id),
  name TEXT NOT NULL,
  mode TEXT DEFAULT 'normal',
  max_participants INTEGER DEFAULT 10,
  expected_start_time TEXT,
  location_name TEXT,
  status TEXT DEFAULT 'recruiting',
  is_featured INTEGER DEFAULT 0,
  started_at TEXT,
  finished_at TEXT,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS trial_participants(
  id SERIAL PRIMARY KEY,
  trial_id INTEGER NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
  character_id INTEGER NOT NULL REFERENCES characters(id),
  role TEXT DEFAULT 'participant',
  participant_role TEXT,
  ascension_score REAL DEFAULT 0,
  faith_score REAL DEFAULT 0,
  score_change REAL DEFAULT 0,
  notes TEXT,
  joined_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS')),
  player_status TEXT DEFAULT '{}',
  reward_granted INTEGER DEFAULT 0,
  trial_nickname TEXT,
  force_quit INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS trial_scores(
  id SERIAL PRIMARY KEY,
  trial_id INTEGER NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
  character_id INTEGER NOT NULL REFERENCES characters(id),
  ascension_points REAL DEFAULT 0,
  faith_points REAL DEFAULT 0,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS trial_rewards(
  id SERIAL PRIMARY KEY,
  trial_id INTEGER NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
  participant_id INTEGER NOT NULL REFERENCES trial_participants(id),
  reward_type TEXT NOT NULL,
  reward_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  is_host_granted INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS trial_inventories(
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id),
  trial_id INTEGER NOT NULL REFERENCES trials(id),
  item_id INTEGER NOT NULL REFERENCES items(id),
  UNIQUE(character_id, trial_id, item_id)
);
CREATE TABLE IF NOT EXISTS trial_trades(
  id SERIAL PRIMARY KEY,
  trial_id INTEGER NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
  from_character_id INTEGER REFERENCES characters(id),
  to_character_id INTEGER REFERENCES characters(id),
  from_item_id INTEGER REFERENCES items(id),
  from_quantity INTEGER DEFAULT 1,
  to_item_id INTEGER REFERENCES items(id),
  to_quantity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS')),
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS trial_locations(
  id SERIAL PRIMARY KEY,
  trial_id INTEGER NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  created_by INTEGER REFERENCES characters(id),
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS location_chat_members(
  id SERIAL PRIMARY KEY,
  location_id INTEGER NOT NULL REFERENCES trial_locations(id) ON DELETE CASCADE,
  character_id INTEGER NOT NULL REFERENCES characters(id),
  is_active INTEGER DEFAULT 1,
  left_at TEXT
);
CREATE TABLE IF NOT EXISTS location_visit_history(
  id SERIAL PRIMARY KEY,
  location_id INTEGER NOT NULL REFERENCES trial_locations(id) ON DELETE CASCADE,
  character_id INTEGER NOT NULL REFERENCES characters(id),
  entered_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS')),
  left_at TEXT
);
CREATE TABLE IF NOT EXISTS location_chat_messages(
  id SERIAL PRIMARY KEY,
  location_id INTEGER NOT NULL REFERENCES trial_locations(id) ON DELETE CASCADE,
  character_id INTEGER NOT NULL REFERENCES characters(id),
  message TEXT,
  image_url TEXT,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS trial_private_messages(
  id SERIAL PRIMARY KEY,
  trial_id INTEGER NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES characters(id),
  receiver_id INTEGER NOT NULL REFERENCES characters(id),
  message TEXT,
  image_url TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS market_listings(
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES characters(id),
  item_id INTEGER NOT NULL REFERENCES items(id),
  wanted_item_id INTEGER REFERENCES items(id),
  target_buyer_id INTEGER REFERENCES characters(id),
  buyer_id INTEGER REFERENCES characters(id),
  price REAL,
  current_price REAL,
  starting_price REAL,
  trade_type TEXT DEFAULT 'public',
  status TEXT DEFAULT 'active',
  is_anonymous INTEGER DEFAULT 0,
  auction_end_time TEXT,
  sold_at TEXT,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS auction_bids(
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
  bidder_id INTEGER NOT NULL REFERENCES characters(id),
  bid_amount REAL NOT NULL,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS item_trade_records(
  id SERIAL PRIMARY KEY,
  seller_id INTEGER REFERENCES characters(id),
  buyer_id INTEGER REFERENCES characters(id),
  item_id INTEGER REFERENCES items(id),
  quantity INTEGER DEFAULT 1,
  price REAL,
  trade_type TEXT,
  trial_id INTEGER,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS frequent_trade_alerts(
  id SERIAL PRIMARY KEY,
  player1_id INTEGER REFERENCES characters(id),
  player2_id INTEGER REFERENCES characters(id),
  trade_count INTEGER DEFAULT 0,
  last_trade_at TEXT,
  status TEXT DEFAULT 'pending',
  admin_note TEXT,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS')),
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS lottery_pools(
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  talent_id INTEGER REFERENCES talents(id),
  item_id INTEGER REFERENCES items(id),
  probability REAL DEFAULT 0.1,
  cost INTEGER DEFAULT 100
);
CREATE TABLE IF NOT EXISTS host_applications(
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id),
  status TEXT DEFAULT 'pending',
  reason TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS host_ratings(
  id SERIAL PRIMARY KEY,
  trial_id INTEGER NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
  host_id INTEGER NOT NULL REFERENCES characters(id),
  rater_id INTEGER NOT NULL REFERENCES characters(id),
  dual_points REAL DEFAULT 0,
  faith_points REAL DEFAULT 0,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS')),
  UNIQUE(trial_id, rater_id)
);
CREATE TABLE IF NOT EXISTS registration_applications(
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id),
  status TEXT DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TEXT,
  reject_reason TEXT,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS reports(
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER REFERENCES characters(id),
  reported_id INTEGER REFERENCES characters(id),
  reason TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TEXT,
  action_taken TEXT,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS bans(
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id),
  banned_by TEXT,
  reason TEXT,
  banned_until TEXT,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS admin_logs(
  id SERIAL PRIMARY KEY,
  admin_id TEXT NOT NULL,
  action TEXT,
  target_type TEXT,
  target_id TEXT,
  reason TEXT,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS game_settings(
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT,
  updated_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS announcements(
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_by TEXT,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS')),
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS battle_states(
  id SERIAL PRIMARY KEY,
  trial_id INTEGER NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
  character_id INTEGER NOT NULL REFERENCES characters(id),
  hp INTEGER DEFAULT 50,
  max_hp INTEGER DEFAULT 50,
  mp INTEGER DEFAULT 40,
  max_mp INTEGER DEFAULT 40,
  agility INTEGER DEFAULT 14,
  defense INTEGER DEFAULT 1,
  is_ready INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS battle_actions(
  id SERIAL PRIMARY KEY,
  trial_id INTEGER NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
  character_id INTEGER NOT NULL REFERENCES characters(id),
  action_type TEXT,
  target_id INTEGER,
  damage INTEGER DEFAULT 0,
  description TEXT,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS talent_cooldowns(
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id),
  talent_id INTEGER NOT NULL REFERENCES talents(id),
  trial_id INTEGER NOT NULL REFERENCES trials(id),
  used_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS')),
  available_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS talent_buffs(
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id),
  trial_id INTEGER NOT NULL REFERENCES trials(id),
  talent_id INTEGER REFERENCES talents(id),
  is_active INTEGER DEFAULT 1,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS talent_usage_notifications(
  id SERIAL PRIMARY KEY,
  trial_id INTEGER NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
  character_id INTEGER NOT NULL REFERENCES characters(id),
  target_id INTEGER REFERENCES characters(id),
  talent_id INTEGER REFERENCES talents(id),
  item_id INTEGER REFERENCES items(id),
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  processed_at TEXT,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS instant_draw_records(
  id SERIAL PRIMARY KEY,
  trial_id INTEGER NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
  character_id INTEGER NOT NULL REFERENCES characters(id),
  ascension_score REAL DEFAULT 0,
  faith_score REAL DEFAULT 0,
  talent_draws INTEGER DEFAULT 0,
  item_draws INTEGER DEFAULT 0,
  is_drawn INTEGER DEFAULT 0,
  drawn_talents TEXT,
  drawn_items TEXT,
  is_host_reward INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS')),
  UNIQUE(trial_id, character_id, is_host_reward)
);
CREATE TABLE IF NOT EXISTS account_deletion_requests(
  id SERIAL PRIMARY KEY,
  applicant_admin_id INTEGER NOT NULL REFERENCES characters(id),
  target_player_id INTEGER NOT NULL REFERENCES characters(id),
  reason TEXT,
  status TEXT DEFAULT 'pending',
  executed_at TEXT,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS deletion_approvals(
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES account_deletion_requests(id) ON DELETE CASCADE,
  admin_id INTEGER NOT NULL REFERENCES characters(id),
  approved INTEGER NOT NULL,
  comment TEXT,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS item_exchange_records(
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id),
  exchanged_items TEXT,
  item_grade TEXT,
  talent_draws INTEGER DEFAULT 0,
  item_draws INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))
);
CREATE TABLE IF NOT EXISTS character_skills(
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL,
  talent_id INTEGER REFERENCES talents(id),
  UNIQUE(character_id, slot_index)
);
`;

export async function initSchema() {
  await pool.query(SCHEMA);
}

export default db;
