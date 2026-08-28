import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function Character() {
  const { char, refreshChar, user } = useAuth();
  const nav = useNavigate();
  const [talents, setTalents] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [curseTalents, setCurseTalents] = useState([]);

  useEffect(() => {
    if (!char) return;
    api.getCharTalents(char.id).then(setTalents).catch(() => {});
    api.getCharAchievements(char.id).then(setAchievements).catch(() => {});
    api.getCurseTalents(char.id).then(setCurseTalents).catch(() => {});
  }, [char]);

  if (!char) {
    return (
      <div className="page-bg page-with-nav flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-white/60 mb-4">您还没有创建角色</p>
          <button className="btn-primary" onClick={() => nav('/character-setup')}>创建角色</button>
        </div>
      </div>
    );
  }

  const maxSlots = char.points < 1000 ? 0 : char.points < 1200 ? 2 : char.points < 1600 ? 3 : char.points < 2000 ? 4 : char.points < 2400 ? 5 : 6;

  return (
    <div className="page-bg page-with-nav">
      <div className="glass-card mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">{char.character_id}</h2>
          <span className="text-sm text-white/60">{user?.username}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="glass p-2"><span className="text-white/60">命途</span> <span className="font-bold ml-2">{char.path?.name}</span></div>
          <div className="glass p-2"><span className="text-white/60">职业</span> <span className="font-bold ml-2">{char.profession?.name}</span></div>
          <div className="glass p-2"><span className="text-white/60">积分</span> <span className="font-bold ml-2 text-yellow-300">{char.points}</span></div>
          <div className="glass p-2"><span className="text-white/60">最高积分</span> <span className="font-bold ml-2">{char.max_points}</span></div>
          <div className="glass p-2"><span className="text-white/60">信仰</span> <span className="font-bold ml-2">{char.faith_points}</span></div>
          <div className="glass p-2"><span className="text-white/60">弃誓次数</span> <span className="font-bold ml-2">{char.curse_count}</span></div>
        </div>
      </div>

      <div className="glass-card mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold">天赋 ({talents.length}/{maxSlots})</h3>
          <span className="text-sm text-white/60 cursor-pointer" onClick={() => nav('/character/skills')}>管理</span>
        </div>
        {talents.length === 0 ? (
          <p className="text-sm text-white/50 text-center py-2">暂无天赋</p>
        ) : (
          talents.map(t => (
            <div key={t.id} className="glass p-2 mb-1">
              <div className="flex justify-between">
                <span className={`font-bold grade-${t.talent?.grade}`}>{t.talent?.name}</span>
                <span className="text-xs text-white/50">{t.talent?.type === 'passive' ? '被动' : '主动'}</span>
              </div>
              <p className="text-xs text-white/60 mt-1">{t.talent?.description}</p>
            </div>
          ))
        )}
      </div>

      {curseTalents.length > 0 && (
        <div className="glass-card mb-4">
          <h3 className="font-bold mb-2">诅咒</h3>
          {curseTalents.map(c => (
            <div key={c.id} className="glass p-2 mb-1">
              <div className="font-bold text-red-400">{c.name}</div>
              <p className="text-xs text-white/60">{c.description}</p>
            </div>
          ))}
        </div>
      )}

      {achievements.length > 0 && (
        <div className="glass-card mb-4">
          <h3 className="font-bold mb-2">成就</h3>
          {achievements.map(a => (
            <div key={a.id} className="glass p-2 mb-1">
              <div className="font-bold text-yellow-300">{a.achievement?.name}</div>
              <p className="text-xs text-white/60">{a.achievement?.description}</p>
            </div>
          ))}
        </div>
      )}

      <button className="btn-primary w-full mb-2" onClick={() => nav('/change-path')}>弃誓·换命途</button>
      <button className="btn-primary w-full" onClick={() => nav('/report')}>举报</button>
      {user?.role === 'admin' && <button className="btn-primary w-full mt-2" onClick={() => nav('/admin')}>管理后台</button>}
    </div>
  );
}
