import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function Report() {
  const { char } = useAuth();
  const [chars, setChars] = useState([]);
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => { api.getCharacters().then(setChars).catch(() => {}); }, []);

  const submit = async () => {
    if (!target) { setMsg('请选择举报对象'); return; }
    if (!reason) { setMsg('请填写举报理由'); return; }
    try {
      await api.createReport({ reported_id: parseInt(target), reason });
      setMsg('举报已提交');
      setTarget(''); setReason('');
    } catch (e) { setMsg(e.message); }
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div className="page-bg page-with-nav">
      <div className="glass-card">
        <h2 className="text-lg font-bold mb-4">举报玩家</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-white/60 mb-1 block">选择举报对象</label>
            <select value={target} onChange={e => setTarget(e.target.value)}>
              <option value="">请选择</option>
              {chars.filter(c => c.id !== char?.id).map(c => (
                <option key={c.id} value={c.id}>{c.character_id} ({c.profile?.username})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1 block">举报理由</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="详细描述违规行为..." rows={4} />
          </div>
          {msg && <p className="text-center text-sm text-yellow-300">{msg}</p>}
          <button className="btn-primary w-full" onClick={submit}>提交举报</button>
        </div>
      </div>
    </div>
  );
}
