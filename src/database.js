const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const security = require('./security');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function initData() {
  const existing = loadData();
  if (existing && existing.users && existing.users.length > 0) return existing;

  const data = {
    users: [{
      id: crypto.randomUUID(),
      username: '管理员',
      passwordHash: security.hashPassword('xxxxxxx'),
      role: 'admin',
      status: 'approved',
      scorePath: 0,
      scoreLadder: 0,
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
    }],
    initialized: true,
  };
  saveData(data);
  return data;
}

module.exports.loadData = loadData;
module.exports.saveData = saveData;
module.exports.initData = initData;
