import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function Ranking() {
  const { char } = useAuth();
  const [tab, setTab] = useState('global');
  const [paths, setPaths] = useState([]);
  const [selPath, setSelPath] = useState(null);
  const [data, setData] = useState([]);
  const [oppData, setOppData] = useState([]);

  useEffect(() => {
    api.getPaths().then(setPaths).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [tab, selPath, char]);

  const load = async () => {
    try {
      if (tab === 'global') {
        const d = await api.getGlobalRank();
        setData(d); setOppData([]);
      } else if (tab === 'path' && selPath) {
        const d = await api.getPathRank(selPath);
        setData(d); setOppData([]);
      } else if (tab === 'opposite' && char?.path?.name) {
        const d = await api.getOppositeRank(char.path.name);
        setData(d.myPath || []); setOppData(d.oppositePath || []);
      }
    } catch {}
  };

  return (
    <div className="page-bg page-with-nav">
      <div className="glass-card mb-4">
        <div className="flex gap-1 mb-3">
          <button className={`btn-primary text-xs flex-1 ${tab === 'global' ? 'ring-2' : ''}`} onClick={() => setTab('global')}>总榜</button>
          <button className={`btn-primary text-xs flex-1 ${tab === 'path' ? 'ring-2' : ''}`} onClick={() => setTab('path')}>命途榜</button>
          <button className={`btn-primary text-xs flex-1 ${tab === 'opposite' ? 'ring-2' : ''}`} onClick={() => setTab('opposite')}>对立榜</button>
        </div>
        {tab === 'path' && (
          <select value={selPath || ''} onChange={e => setSelPath(e.target.value)}>
            <option value="">选择命途</option>
            {paths.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>

      <div className="space-y-1 mb-4">
        {data.map((r, i) => (
          <div key={i} className={`glass p-2 flex items-center ${r.character?.character_id === char?.character_id ? 'ring-1 ring-yellow-300' : ''}`}>
            <span className="font-bold text-lg w-8 text-center text-yellow-300">{r.rank}</span>
            <div className="flex-1">
              <div className="font-bold">{r.character?.profile?.username || '?'}</div>
              <div className="text-xs text-white/60">{r.character?.path?.name} · {r.character?.profession?.name}</div>
            </div>
            <span className="font-bold text-yellow-300">{r.points}</span>
          </div>
        ))}
        {data.length === 0 && <p className="text-center text-white/50 py-4">暂无数据</p>}
      </div>

      {oppData.length > 0 && (
        <>
          <h3 className="font-bold mb-2 text-white/80">对立命途</h3>
          <div className="space-y-1">
            {oppData.map((r, i) => (
              <div key={i} className="glass p-2 flex items-center">
                <span className="font-bold text-lg w-8 text-center text-red-300">{r.rank}</span>
                <div className="flex-1">
                  <div className="font-bold">{r.character?.profile?.username || '?'}</div>
                  <div className="text-xs text-white/60">{r.character?.path?.name}</div>
                </div>
                <span className="font-bold text-red-300">{r.points}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
