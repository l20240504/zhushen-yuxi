import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function TrialRewards() {
  const { id } = useParams();
  const nav = useNavigate();
  const { char } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [drawRecord, setDrawRecord] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, [id]);
  const load = async () => {
    try {
      const p = await api.getParticipants(id);
      setParticipants(p);
      if (char) {
        const r = await api.getDrawRecord(id, char.id);
        setDrawRecord(r);
      }
    } catch {}
  };

  const saveScore = async (pid, asc, faith) => {
    try {
      await api.updateScore(id, pid, { ascension_score: parseFloat(asc)||0, faith_score: parseFloat(faith)||0 });
      setMsg('已保存');
      await load();
    } catch (e) { setMsg(e.message); }
    setTimeout(() => setMsg(''), 2000);
  };

  return (
    <div className="page-bg page-with-nav">
      <div className="glass-card mb-4">
        <h2 className="text-lg font-bold mb-2">试炼奖励</h2>
        {msg && <p className="text-sm text-yellow-300 text-center">{msg}</p>}
        <div className="space-y-2">
          {participants.map(p => (
            <RewardRow key={p.id} p={p} onSave={saveScore} />
          ))}
        </div>
      </div>

      {drawRecord && (
        <div className="glass-card mb-4">
          <h3 className="font-bold mb-2">抽奖记录</h3>
          <div className="text-sm text-white/70">
            <p>天赋抽奖: {drawRecord.talent_draws}</p>
            <p>道具抽奖: {drawRecord.item_draws}</p>
            {drawRecord.is_drawn && <p className="text-green-400">已抽取</p>}
          </div>
        </div>
      )}

      <button className="btn-primary w-full" onClick={() => nav(`/trial/${id}`)}>返回</button>
    </div>
  );
}

function RewardRow({ p, onSave }) {
  const [asc, setAsc] = useState(p.ascension_score || 0);
  const [faith, setFaith] = useState(p.faith_score || 0);
  return (
    <div className="glass p-2">
      <div className="flex justify-between mb-1">
        <span className="font-bold">{p.character?.profile?.username || p.trial_nickname || '?'}</span>
        <span className="text-xs text-white/50">{p.role === 'host' ? '主持' : '参与者'}</span>
      </div>
      <div className="flex gap-1">
        <input type="number" value={asc} onChange={e => setAsc(e.target.value)} placeholder="积分" className="flex-1" />
        <input type="number" value={faith} onChange={e => setFaith(e.target.value)} placeholder="信仰" className="flex-1" />
        <button className="btn-primary text-xs px-2" onClick={() => onSave(p.id, asc, faith)}>保存</button>
      </div>
    </div>
  );
}
