import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function Backpack() {
  const { char, refreshChar } = useAuth();
  const [items, setItems] = useState([]);
  const [selItems, setSelItems] = useState([]);
  const [msg, setMsg] = useState('');
  const [showExchange, setShowExchange] = useState(false);

  useEffect(() => {
    if (char) api.getCharItems(char.id).then(setItems).catch(() => {});
  }, [char]);

  const toggle = (id) => {
    setSelItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const discard = async () => {
    if (selItems.length === 0) return;
    if (!confirm(`确定丢弃 ${selItems.length} 个道具？`)) return;
    try {
      await api.discardItems(char.id, { item_ids: selItems });
      const updated = await api.getCharItems(char.id);
      setItems(updated);
      setSelItems([]);
      setMsg('已丢弃');
    } catch (e) { setMsg(e.message); }
    setTimeout(() => setMsg(''), 2000);
  };

  const exchange = async () => {
    if (selItems.length === 0 || selItems.length % 5 !== 0) {
      setMsg('兑换需要选择5的倍数个道具');
      setTimeout(() => setMsg(''), 2000);
      return;
    }
    try {
      const r = await api.exchangeItems(char.id, selItems);
      const updated = await api.getCharItems(char.id);
      setItems(updated);
      setSelItems([]);
      setMsg(r.message);
      await refreshChar();
    } catch (e) { setMsg(e.message); }
    setTimeout(() => setMsg(''), 3000);
  };

  if (!char) return <div className="page-bg page-with-nav"><p className="text-center text-white/50 py-8">请先创建角色</p></div>;

  return (
    <div className="page-bg page-with-nav">
      {msg && <div className="toast">{msg}</div>}

      <div className="glass-card mb-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">背包</h2>
          <span className="text-sm text-white/60">{items.length} 种道具</span>
        </div>
        {char.equipped_item_id && (
          <div className="text-sm text-yellow-300 mt-1">已装备: {items.find(i => i.item_id === char.equipped_item_id)?.item?.name || '未知'}</div>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {items.map(i => (
          <div key={i.id} className={`glass-card cursor-pointer ${selItems.includes(i.id) ? 'ring-2 ring-white/60' : ''}`}
            onClick={() => toggle(i.id)}>
            <div className="flex justify-between items-center">
              <div>
                <span className={`font-bold grade-${i.item?.grade}`}>{i.item?.name}</span>
                <span className="text-xs text-white/50 ml-2">{i.item?.grade}</span>
              </div>
              <span className="text-sm text-white/70">x{i.quantity}</span>
            </div>
            <p className="text-xs text-white/60 mt-1">{i.item?.description}</p>
            <div className="text-xs text-white/40 mt-1">
              {i.item?.type} · {i.item?.is_tradable ? '可交易' : '不可交易'}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-white/50 py-8">背包空空如也</p>}
      </div>

      {selItems.length > 0 && (
        <div className="glass-card">
          <p className="text-sm text-white/70 mb-2">已选 {selItems.length} 个道具</p>
          <div className="flex gap-2">
            <button className="btn-danger flex-1" onClick={discard}>丢弃</button>
            <button className="btn-primary flex-1" onClick={exchange}>兑换抽奖</button>
          </div>
          <p className="text-xs text-white/50 mt-1">每5个道具可兑换1次抽奖</p>
        </div>
      )}
    </div>
  );
}
