import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function Home() {
  const { user, char, refreshChar } = useAuth();
  const nav = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [trials, setTrials] = useState([]);

  useEffect(() => {
    api.getAnnouncements().then(setAnnouncements).catch(() => {});
    api.getTrials().then(setTrials).catch(() => {});
    refreshChar();
  }, [refreshChar]);

  const maxSlots = char ? (char.points < 1000 ? 0 : char.points < 1200 ? 2 : char.points < 1600 ? 3 : char.points < 2000 ? 4 : char.points < 2400 ? 5 : 6) : 0;

  const statusLabel = { recruiting: '招募中', ongoing: '进行中', finished: '已结束', settling: '结算中' };
  const statusColor = { recruiting: 'status-recruiting', ongoing: 'status-ongoing', finished: 'status-finished', settling: 'status-ongoing' };

  return (
    <div className="page-bg page-with-nav">
      <div className="glass-card mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{char?.character_id || '未创建角色'}</h2>
            <p className="text-sm text-white/70">{char?.path?.name} · {char?.profession?.name}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-yellow-300">{char?.points ?? '-'}</div>
            <div className="text-xs text-white/60">积分</div>
          </div>
        </div>
        {char && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="glass p-2"><div className="font-bold">{char.faith_points}</div><div className="text-xs text-white/60">信仰</div></div>
            <div className="glass p-2"><div className="font-bold">{maxSlots}</div><div className="text-xs text-white/60">天赋槽</div></div>
            <div className="glass p-2"><div className="font-bold">{char.curse_count}</div><div className="text-xs text-white/60">弃誓</div></div>
          </div>
        )}
      </div>

      {announcements.length > 0 && (
        <div className="glass-card mb-4">
          <h3 className="font-bold mb-2">📢 公告</h3>
          {announcements.map(a => (
            <div key={a.id} className="text-sm text-white/80 py-1 border-b border-white/10 last:border-0">
              {a.content}
            </div>
          ))}
        </div>
      )}

      <div className="glass-card mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">⚔️ 试炼</h3>
          <span className="text-sm text-white/60 cursor-pointer" onClick={() => nav('/trial')}>查看全部</span>
        </div>
        {trials.slice(0, 3).map(t => (
          <div key={t.id} className="glass p-2 mb-1 cursor-pointer" onClick={() => nav(`/trial/${t.id}`)}>
            <div className="flex justify-between items-center">
              <span className="font-bold">{t.name}</span>
              <span className={`text-xs ${statusColor[t.status]}`}>{statusLabel[t.status]}</span>
            </div>
            <div className="text-xs text-white/60">主持: {t.host?.profile?.username || '?'} · 人数: {t.participants_count}/{t.max_participants}</div>
          </div>
        ))}
        {trials.length === 0 && <p className="text-sm text-white/50 text-center py-2">暂无试炼</p>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="glass-card text-center cursor-pointer" onClick={() => nav('/lottery')}>
          <div className="text-3xl mb-1">🎁</div>
          <div className="text-sm">抽奖</div>
        </div>
        <div className="glass-card text-center cursor-pointer" onClick={() => nav('/ranking')}>
          <div className="text-3xl mb-1">🏆</div>
          <div className="text-sm">排行榜</div>
        </div>
      </div>
    </div>
  );
}
