import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function Lottery() {
  const { char, refreshChar } = useAuth();
  const [pool, setPool] = useState([]);
  const [type, setType] = useState('item');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.getLotteryPool(type).then(setPool).catch(() => {});
  }, [type]);

  const draw = async () => {
    setLoading(true);
    try {
      const r = await api.drawLottery(type);
      setResult(r.reward);
      await refreshChar();
    } catch (e) { setMsg(e.message); }
    setLoading(false);
    setTimeout(() => setMsg(''), 3000);
  };

  if (!char) return <div className="page-bg page-with-nav"><p className="text-center text-white/50 py-8">请先创建角色</p></div>;

  const cost = type === 'talent' ? 200 : 100;

  return (
    <div className="page-bg page-with-nav">
      {msg && <div className="toast">{msg}</div>}

      <div className="glass-card mb-4">
        <div className="flex gap-2 mb-3">
          <button className={`btn-primary flex-1 text-sm ${type === 'item' ? 'ring-2 ring-white/60' : ''}`} onClick={() => setType('item')}>道具抽奖</button>
          <button className={`btn-primary flex-1 text-sm ${type === 'talent' ? 'ring-2 ring-white/60' : ''}`} onClick={() => setType('talent')}>天赋抽奖</button>
        </div>
        <div className="text-center text-white/70 mb-2">
          <p>当前积分: <span className="font-bold text-yellow-300">{char.points}</span></p>
          <p className="text-xs">每次消耗: {cost} 积分</p>
        </div>
        <button className="btn-primary w-full text-lg" onClick={draw} disabled={loading || char.points < cost}>
          {loading ? '抽取中...' : '抽奖'}
        </button>
      </div>

      {result && (
        <div className="glass-card mb-4 text-center">
          <h3 className="font-bold mb-2">抽奖结果</h3>
          <div className="text-2xl">🎉</div>
          <p className="text-lg font-bold mt-2">
            {result.type === 'talent' ? '天赋' : '道具'}: {result.name}
          </p>
        </div>
      )}

      <div className="glass-card">
        <h3 className="font-bold mb-2">奖池内容</h3>
        {pool.map((p, i) => (
          <div key={i} className="glass p-2 mb-1 flex justify-between">
            <span className={`grade-${p.talent?.grade || p.item?.grade}`}>
              {p.talent?.name || p.item?.name || '?'}
            </span>
            <span className="text-xs text-white/50">{(p.probability * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
