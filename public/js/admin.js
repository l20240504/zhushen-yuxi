async function checkAdmin() {
  try {
    const res = await fetch('/api/session');
    const data = await res.json();
    if (!data.authenticated) {
      window.location.href = '/';
      return;
    }
    if (data.user.role !== 'admin') {
      window.location.href = '/dashboard';
      return;
    }
    document.getElementById('admin-name').textContent = data.user.username;
    loadPending();
    loadUsers();
  } catch {
    window.location.href = '/';
  }
}

function showMsg(id, text, type) {
  const el = document.getElementById(id);
  el.className = `message ${type} show`;
  el.textContent = text;
  setTimeout(() => { el.className = 'message'; }, 3000);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function statusBadge(status) {
  const map = {
    pending: { cls: 'badge-pending', text: '待审核' },
    approved: { cls: 'badge-approved', text: '已通过' },
    rejected: { cls: 'badge-rejected', text: '已拒绝' },
  };
  const s = map[status] || map.pending;
  return `<span class="badge ${s.cls}">${s.text}</span>`;
}

function roleBadge(role) {
  if (role === 'admin') return `<span class="badge badge-admin">管理员</span>`;
  return `<span class="badge badge-viewer">看榜</span>`;
}

async function loadPending() {
  try {
    const res = await fetch('/api/admin/pending');
    const data = await res.json();
    const list = document.getElementById('pending-list');

    if (!data.pending || data.pending.length === 0) {
      list.innerHTML = '<div class="empty-state">暂无待审核的注册申请</div>';
      return;
    }

    list.innerHTML = data.pending.map(u => `
      <div class="pending-card">
        <div>
          <div class="pending-name">${escapeHtml(u.username)}</div>
          <div class="pending-time">申请时间：${formatTime(u.createdAt)}</div>
        </div>
        <div class="pending-actions">
          <button class="btn btn-primary btn-sm" onclick="approveUser('${u.id}')">通过</button>
          <button class="btn btn-danger btn-sm" onclick="rejectUser('${u.id}')">拒绝</button>
        </div>
      </div>
    `).join('');
  } catch {
    document.getElementById('pending-list').innerHTML = '<div class="empty-state">加载失败</div>';
  }
}

async function loadUsers() {
  try {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    const list = document.getElementById('users-list');

    if (!data.users || data.users.length === 0) {
      list.innerHTML = '<div class="empty-state">暂无用户</div>';
      return;
    }

    list.innerHTML = data.users.map(u => `
      <div class="user-row">
        <span class="user-name">${escapeHtml(u.username)}</span>
        ${roleBadge(u.role)}
        ${u.status === 'approved' ? '' : statusBadge(u.status)}
        <div style="display:flex; align-items:center; gap:0.3rem;">
          <span class="score-label">登神</span>
          <input type="number" class="score-input" value="${u.scorePath}" onchange="updateScore('${u.id}', 'path', this.value)">
          <span class="score-label">觐见</span>
          <input type="number" class="score-input" value="${u.scoreLadder}" onchange="updateScore('${u.id}', 'ladder', this.value)">
        </div>
        <div class="action-group">
          ${u.role === 'admin'
            ? `<button class="btn btn-secondary btn-sm" onclick="updateRole('${u.id}', 'viewer')">设为看榜</button>`
            : `<button class="btn btn-secondary btn-sm" onclick="updateRole('${u.id}', 'admin')">设为管理员</button>`
          }
          <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}', '${escapeHtml(u.username)}')">删除</button>
        </div>
      </div>
    `).join('');
  } catch {
    document.getElementById('users-list').innerHTML = '<div class="empty-state">加载失败</div>';
  }
}

async function approveUser(userId) {
  const res = await fetch('/api/admin/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  showMsg('admin-msg', data.message || data.error, data.success ? 'success' : 'error');
  loadPending();
  loadUsers();
}

async function rejectUser(userId) {
  const res = await fetch('/api/admin/reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  showMsg('admin-msg', data.message || data.error, data.success ? 'success' : 'error');
  loadPending();
  loadUsers();
}

async function updateScore(userId, board, score) {
  const num = parseInt(score, 10);
  if (isNaN(num)) {
    showMsg('admin-msg', '分数必须为数字', 'error');
    return;
  }
  const res = await fetch('/api/admin/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, board, score: num }),
  });
  const data = await res.json();
  showMsg('admin-msg', data.message || data.error, data.success ? 'success' : 'error');
}

async function updateRole(userId, role) {
  const res = await fetch('/api/admin/role', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, role }),
  });
  const data = await res.json();
  showMsg('admin-msg', data.message || data.error, data.success ? 'success' : 'error');
  loadUsers();
}

async function deleteUser(userId, username) {
  if (!confirm(`确定要删除用户「${username}」吗？此操作不可撤销。`)) return;
  const res = await fetch('/api/admin/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  showMsg('admin-msg', data.message || data.error, data.success ? 'success' : 'error');
  loadUsers();
}

async function handleChangePassword(e) {
  e.preventDefault();
  const oldPwd = document.getElementById('old-pwd').value;
  const newPwd = document.getElementById('new-pwd').value;
  const btn = document.getElementById('pwd-btn');

  if (!oldPwd || !newPwd) {
    showMsg('pwd-msg', '请填写旧密码和新密码', 'error');
    return false;
  }

  btn.disabled = true;
  btn.textContent = '修改中...';

  try {
    const res = await fetch('/api/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd }),
    });
    const data = await res.json();
    showMsg('pwd-msg', data.message || data.error, data.success ? 'success' : 'error');
    if (data.success) {
      document.getElementById('old-pwd').value = '';
      document.getElementById('new-pwd').value = '';
    }
  } catch {
    showMsg('pwd-msg', '网络错误', 'error');
  }

  btn.disabled = false;
  btn.textContent = '确认修改';
  return false;
}

function formatTime(iso) {
  if (!iso) return '--';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function goToDashboard() {
  window.location.href = '/dashboard';
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
}

checkAdmin();
