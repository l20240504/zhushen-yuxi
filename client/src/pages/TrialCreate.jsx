import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function TrialCreate() {
  const { char } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [mode, setMode] = useState('normal');
  const [maxP, setMaxP] = useState(10);
  const [locName, setLocName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name) { setErr('请输入试炼名称'); return; }
    setLoading(true);
    try {
      const t = await api.createTrial({ name, mode, max_participants: parseInt(maxP), location_name: locName, expected_start_time: startTime || null });
      nav(`/trial/${t.id}`);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div className="page-bg page-with-nav">
      <div className="glass-card">
        <h2 className="text-lg font-bold mb-4">创建试炼</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-white/60 mb-1 block">试炼名称</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="试炼名称" />
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1 block">模式</label>
            <select value={mode} onChange={e => setMode(e.target.value)}>
              <option value="normal">普通模式</option>
              <option value="battle">战斗模式</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1 block">最大人数</label>
            <input type="number" value={maxP} onChange={e => setMaxP(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1 block">地点名称（选填）</label>
            <input value={locName} onChange={e => setLocName(e.target.value)} placeholder="如：神殿广场" />
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1 block">预计开始时间（选填）</label>
            <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
          {err && <p className="text-red-400 text-center">{err}</p>}
          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={() => nav('/trial')}>取消</button>
            <button className="btn-primary flex-1" onClick={submit} disabled={loading}>{loading ? '创建中...' : '创建'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
