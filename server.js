const http = require('http');
const fs = require('fs');
const path = require('path');

const database = require('./src/database');
const { readBody, sendJSON } = require('./src/httpUtils');
const authRoutes = require('./src/authRoutes');
const rankingRoutes = require('./src/rankingRoutes');
const adminRoutes = require('./src/adminRoutes');

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const API_ROUTES = {
  'POST /api/register': authRoutes.handleRegister,
  'POST /api/login': authRoutes.handleLogin,
  'POST /api/logout': authRoutes.handleLogout,
  'GET /api/session': authRoutes.handleSession,
  'GET /api/rankings': rankingRoutes.handleRankings,
  'GET /api/admin/pending': adminRoutes.handlePending,
  'POST /api/admin/approve': adminRoutes.handleApprove,
  'POST /api/admin/reject': adminRoutes.handleReject,
  'POST /api/admin/score': adminRoutes.handleScore,
  'POST /api/admin/role': adminRoutes.handleRole,
  'GET /api/admin/users': adminRoutes.handleUsers,
  'POST /api/admin/delete': adminRoutes.handleDelete,
  'POST /api/change-password': authRoutes.handleChangePassword,
};

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/index.html' : pathname;
  if (filePath === '/dashboard') filePath = '/dashboard.html';
  if (filePath === '/admin') filePath = '/admin.html';
  if (filePath === '/protocol') filePath = '/protocol.html';

  const fullPath = path.join(PUBLIC_DIR, filePath);
  if (!fullPath.startsWith(PUBLIC_DIR)) {
    return sendJSON(res, 403, { error: 'Forbidden' });
  }

  const ext = path.extname(fullPath);
  fs.readFile(fullPath, (err, content) => {
    if (err) return sendJSON(res, 404, { error: 'Not Found' });
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  const routeKey = `${req.method} ${urlObj.pathname}`;

  if (API_ROUTES[routeKey]) {
    try {
      await API_ROUTES[routeKey](req, res);
    } catch (err) {
      console.error('API Error:', err);
      sendJSON(res, 500, { error: '服务器内部错误' });
    }
    return;
  }

  serveStatic(req, res, urlObj.pathname);
});

database.initData();

server.listen(PORT, () => {
  console.log('========================================');
  console.log('  诸神愚戏 · 信仰游戏');
  console.log('========================================');
  console.log(`  服务已启动: http://localhost:${PORT}`);
  console.log(`  管理员账号: 管理员`);
  console.log(`  管理员密码: xxxxxxx (请尽快修改)`);
  console.log('========================================');
  console.log('  按 Ctrl+C 停止服务');
  console.log('');
});
