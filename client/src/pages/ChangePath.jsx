import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

const oppositeMap = { '诞生':'污堕','污堕':'诞生','繁荣':'腐朽','腐朽':'繁荣','死亡':'湮灭','湮灭':'死亡',
  '真理':'痴愚','痴愚':'真理','秩序':'混乱','混乱':'秩序','战争':'沉默','沉默':'战争',
  '记忆':'欺诈','欺诈':'记忆','时间':'命运','命运':'时间' };

export default function ChangePath() {
  const { char, refreshChar } = useAuth();
  const nav = useNavigate();
  const [paths, setPaths] = useState([]);
  const [selPath, setSelPath] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { api.getPaths().then(setPaths).catch(() => {}); }, []);

  const submit = async () => {
    if (!selPath) { setErr('请选择新命途'); return; }
    setLoading(true);
    try {
      await api.changePath(char.id, selPath);
      await refreshChar();
      nav('/character');
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  if (!char) return null;
  const opposite = oppositeMap[char.path?.name];
  const abandoned = JSON.parse(char.abandoned_path_ids || '[]');

  return (
    <div className="page-bg page-with-nav">
      <div className="glass-card mb-4">
        <h2 className="text-lg font-bold mb-2">弃誓·更换命途</h2>
        <div className="text-sm text-white/70 space-y-1">
          <p>当前命途: <span className="font-bold text-white">{char.path?.name}</span></p>
          <p>当前弃誓次数: <span className="font-bold text-red-400">{char.curse_count}</span></p>
          <p className="text-yellow-300/80">警告: 弃誓将失去所有已装备的天赋，并获得诅咒标记！</p>
        </div>
      </div>

      <div className="glass-card mb-4">
        <h3 className="font-bold mb-2">选择新命途</h3>
        <div className="grid grid-cols-2 gap-2">
          {paths.map(p => {
            const isOpposite = p.name === opposite;
            const isAbandoned = abandoned.includes(p.id);
            const isCurrent = p.id === char.path_id;
            return (
              <div key={p.id}
                className={`glass p-2 cursor-pointer text-center ${selPath === p.id ? 'ring-2 ring-white/60' : ''} ${isCurrent ? 'opacity-30' : ''}`}
                onClick={() => !isCurrent && setSelPath(p.id)}>
                <div className="font-bold">{p.name}</div>
                {isOpposite && <div className="text-xs text-red-400">对立命途</div>}
                {isAbandoned && <div className="text-xs text-yellow-400">已弃誓过</div>}
                {isCurrent && <div className="text-xs text-white/40">当前</div>}
              </div>
            );
          })}
        </div>
      </div>

      {err && <p className="text-red-400 text-center mb-2">{err}</p>}

      {!confirming ? (
        <button className="btn-danger w-full" onClick={() => setConfirming(true)}>确认弃誓</button>
      ) : (
        <div className="glass-card">
          <p className="text-center text-red-300 mb-3">确定要弃誓吗？此操作不可逆！</p>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={() => setConfirming(false)}>取消</button>
            <button className="btn-danger flex-1" onClick={submit} disabled={loading}>{loading ? '处理中...' : '确认'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
