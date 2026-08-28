import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function CharacterSkills() {
  const { char, refreshChar } = useAuth();
  const [allTalents, setAllTalents] = useState([]);
  const [myTalents, setMyTalents] = useState([]);
  const [filter, setFilter] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.getTalents().then(setAllTalents).catch(() => {});
    if (char) api.getCharTalents(char.id).then(setMyTalents).catch(() => {});
  }, [char]);

  const maxSlots = char ? (char.points < 1000 ? 0 : char.points < 1200 ? 2 : char.points < 1600 ? 3 : char.points < 2000 ? 4 : char.points < 2400 ? 5 : 6) : 0;

  const addTalent = async (talentId) => {
    try {
      await api.addCharTalent(char.id, talentId);
      const updated = await api.getCharTalents(char.id);
      setMyTalents(updated);
      setMsg('天赋添加成功');
      setTimeout(() => setMsg(''), 2000);
    } catch (e) { setMsg(e.message); }
  };

  const removeTalent = async (talentId) => {
    try {
      await api.delCharTalent(char.id, talentId);
      const updated = await api.getCharTalents(char.id);
      setMyTalents(updated);
    } catch (e) { setMsg(e.message); }
  };

  const myTalentIds = new Set(myTalents.map(t => t.talent_id));
  const filtered = allTalents.filter(t =>
    !filter || t.name.includes(filter) || t.description?.includes(filter)
  );

  return (
    <div className="page-bg page-with-nav">
      <div className="glass-card mb-4">
        <h2 className="text-lg font-bold mb-2">天赋管理 ({myTalents.length}/{maxSlots})</h2>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="搜索天赋..." />
      </div>

      {msg && <div className="toast">{msg}</div>}

      {myTalents.length > 0 && (
        <div className="glass-card mb-4">
          <h3 className="font-bold mb-2">已装备</h3>
          {myTalents.map(t => (
            <div key={t.id} className="glass p-2 mb-1 flex justify-between items-center">
              <div>
                <span className={`font-bold grade-${t.talent?.grade}`}>{t.talent?.name}</span>
                <span className="text-xs text-white/50 ml-2">{t.talent?.grade}</span>
                <p className="text-xs text-white/60">{t.talent?.description}</p>
              </div>
              <button className="btn-danger text-xs px-2 py-1" onClick={() => removeTalent(t.talent_id)}>卸下</button>
            </div>
          ))}
        </div>
      )}

      <div className="glass-card">
        <h3 className="font-bold mb-2">可选天赋</h3>
        {filtered.map(t => {
          const has = myTalentIds.has(t.id);
          const canAdd = myTalents.length < maxSlots;
          return (
            <div key={t.id} className="glass p-2 mb-1 flex justify-between items-center">
              <div>
                <span className={`font-bold grade-${t.grade}`}>{t.name}</span>
                <span className="text-xs text-white/50 ml-2">{t.grade} · {t.type === 'passive' ? '被动' : '主动'}</span>
                <p className="text-xs text-white/60">{t.description}</p>
              </div>
              {has ? (
                <span className="text-xs text-white/40">已装备</span>
              ) : (
                <button className="btn-primary text-xs px-2 py-1" disabled={!canAdd} onClick={() => addTalent(t.id)}>
                  {canAdd ? '装备' : '槽满'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
