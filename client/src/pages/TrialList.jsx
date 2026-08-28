import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

export default function TrialList() {
  const nav = useNavigate();
  const [trials, setTrials] = useState([]);
  const [filter, setFilter] = useState('');

  useEffect(() => { load(); }, []);
  const load = () => api.getTrials(filter || undefined).then(setTrials).catch(() => {});

  useEffect(() => { load(); }, [filter]);

  const statusLabel = { recruiting: '招募中', ongoing: '进行中', finished: '已结束', settling: '结算中' };
  const statusColor = { recruiting: 'status-recruiting', ongoing: 'status-ongoing', finished: 'status-finished', settling: 'status-ongoing' };

  return (
    <div className="page-bg page-with-nav">
      <div className="glass-card mb-4">
        <div className="flex gap-2 mb-3">
          {['', 'recruiting', 'ongoing', 'finished'].map(s => (
            <button key={s} className={`btn-primary text-xs flex-1 ${filter === s ? 'ring-2 ring-white/60' : ''}`}
              onClick={() => setFilter(s)}>
              {s ? statusLabel[s] : '全部'}
            </button>
          ))}
        </div>
        <button className="btn-primary w-full" onClick={() => nav('/trial/create')}>创建试炼</button>
      </div>

      <div className="space-y-2">
        {trials.map(t => (
          <div key={t.id} className="glass-card cursor-pointer" onClick={() => nav(`/trial/${t.id}`)}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-lg">{t.name}</span>
              <span className={`text-xs ${statusColor[t.status]}`}>{statusLabel[t.status]}</span>
            </div>
            <div className="text-sm text-white/60">
              主持: {t.host?.profile?.username || '?'} · 人数: {t.participants_count}/{t.max_participants}
              {t.is_featured && <span className="ml-2 text-yellow-300">★精华</span>}
            </div>
            {t.location_name && <div className="text-xs text-white/50 mt-1">地点: {t.location_name}</div>}
          </div>
        ))}
        {trials.length === 0 && <p className="text-center text-white/50 py-8">暂无试炼</p>}
      </div>
    </div>
  );
}
