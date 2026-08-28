async function loadRankings() {
  try {
    const res = await fetch('/api/rankings');
    if (res.status === 401) {
      window.location.href = '/';
      return;
    }
    const data = await res.json();
    document.getElementById('username-display').textContent = data.currentUser || '--';
    renderRanking('path-list', data.pathRanking, 'path', data.currentUser);
    renderRanking('ladder-list', data.ladderRanking, 'ladder', data.currentUser);
  } catch {
    document.getElementById('path-list').innerHTML = '<li class="empty-state">加载失败，请刷新重试</li>';
    document.getElementById('ladder-list').innerHTML = '<li class="empty-state">加载失败，请刷新重试</li>';
  }
}

function renderRanking(listId, ranking, boardType, currentUser) {
  const list = document.getElementById(listId);
  if (!ranking || ranking.length === 0) {
    list.innerHTML = '<li class="empty-state">暂无排名数据</li>';
    return;
  }
  list.innerHTML = ranking.map((item, i) => {
    const rankClass = item.rank <= 3 ? `rank-${item.rank}` : '';
    const userClass = item.username === currentUser ? 'current-user' : '';
    return `
      <li class="ranking-item ${rankClass} ${userClass}">
        <span class="rank-number">${item.rank}</span>
        <span class="rank-name">${escapeHtml(item.username)}</span>
        <span class="rank-score">${item.score}</span>
      </li>`;
  }).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
}

loadRankings();
