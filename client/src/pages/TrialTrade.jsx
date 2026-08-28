import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function TrialTrade() {
  const { id } = useParams();
  const nav = useNavigate();
  const { char } = useAuth();
  const [trades, setTrades] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, [id, char]);
  const load = async () => {
    try {
      const t = await api.getTrialTrades(id, char?.id);
      setTrades(t);
      if (char) {
        const items = await api.getCharItems(char.id);
        setMyItems(items);
      }
      const p = await api.getParticipants(id);
      setParticipants(p.filter(p => p.character_id !== char?.id && p.role !== 'observer'));
    } catch {}
  };

  const acceptTrade = async (tradeId) => {
    try { await api.acceptTrade(id, tradeId); await load(); setMsg('交易已接受'); }
    catch (e) { setMsg(e.message); }
    setTimeout(() => setMsg(''), 2000);
  };

  const rejectTrade = async (tradeId) => {
    try { await api.rejectTrade(id, tradeId); await load(); }
    catch (e) { setMsg(e.message); }
  };

  const cancelTrade = async (tradeId) => {
    try { await api.cancelTrade(id, tradeId); await load(); }
    catch (e) { setMsg(e.message); }
  };

  return (
    <div className="page-bg page-with-nav">
      {msg && <div className="toast">{msg}</div>}
      <div className="glass-card mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold">试炼交易</h2>
          <button className="btn-primary text-xs" onClick={() => setShowCreate(!showCreate)}>发起交易</button>
        </div>
      </div>

      {showCreate && (
        <CreateTrade trialId={id} myItems={myItems} participants={participants} myCharId={char?.id}
          onCreate={async (data) => {
            try { await api.createTrade(id, data); await load(); setShowCreate(false); setMsg('交易已发起'); }
            catch (e) { setMsg(e.message); }
            setTimeout(() => setMsg(''), 2000);
          }} onCancel={() => setShowCreate(false)} />
      )}

      <div className="space-y-2">
        {trades.map(t => (
          <div key={t.id} className="glass-card">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold">{t.from_character?.profile?.username}</span>
              <span className="text-xs text-white/50">{t.status}</span>
            </div>
            <div className="text-sm text-white/70">
              {t.from_item?.name} x{t.from_quantity}
              {t.to_item && <> → {t.to_item.name} x{t.to_quantity}</>}
            </div>
            {t.status === 'pending' && (
              <div className="flex gap-1 mt-2">
                {t.to_character_id === char?.id && <button className="btn-primary text-xs flex-1" onClick={() => acceptTrade(t.id)}>接受</button>}
                {t.to_character_id === char?.id && <button className="btn-danger text-xs flex-1" onClick={() => rejectTrade(t.id)}>拒绝</button>}
                {t.from_character_id === char?.id && <button className="btn-danger text-xs flex-1" onClick={() => cancelTrade(t.id)}>取消</button>}
              </div>
            )}
          </div>
        ))}
        {trades.length === 0 && <p className="text-center text-white/50 py-4">暂无交易</p>}
      </div>

      <button className="btn-primary w-full mt-4" onClick={() => nav(`/trial/${id}`)}>返回</button>
    </div>
  );
}

function CreateTrade({ myItems, participants, myCharId, onCreate, onCancel }) {
  const [targetId, setTargetId] = useState('');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [wantItemId, setWantItemId] = useState('');
  const [wantQty, setWantQty] = useState(1);

  return (
    <div className="glass-card mb-4 space-y-2">
      <h3 className="font-bold">发起交易</h3>
      <select value={targetId} onChange={e => setTargetId(e.target.value)}>
        <option value="">选择对方</option>
        {participants.map(p => <option key={p.id} value={p.character_id}>{p.character?.profile?.username}</option>)}
      </select>
      <select value={itemId} onChange={e => setItemId(e.target.value)}>
        <option value="">选择我的道具</option>
        {myItems.map(i => <option key={i.id} value={i.item_id}>{i.item.name} x{i.quantity}</option>)}
      </select>
      <input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value)||1)} placeholder="数量" />
      <div className="text-center text-white/50 text-xs">换取（选填）</div>
      <select value={wantItemId} onChange={e => setWantItemId(e.target.value)}>
        <option value="">不指定</option>
        {myItems.map(i => <option key={i.id} value={i.item_id}>{i.item.name}</option>)}
      </select>
      <input type="number" value={wantQty} onChange={e => setWantQty(parseInt(e.target.value)||1)} placeholder="需求数量" />
      <div className="flex gap-2">
        <button className="btn-primary flex-1" onClick={() => onCreate({
          from_character_id: myCharId, to_character_id: parseInt(targetId),
          from_item_id: parseInt(itemId), from_quantity: quantity,
          to_item_id: wantItemId ? parseInt(wantItemId) : null, to_quantity: wantItemId ? wantQty : null
        })}>发起</button>
        <button className="btn-primary flex-1" onClick={onCancel}>取消</button>
      </div>
    </div>
  );
}
