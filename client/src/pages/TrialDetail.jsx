import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function TrialDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { char, user } = useAuth();
  const [trial, setTrial] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [msg, setMsg] = useState('');
  const [showScore, setShowScore] = useState(null);

  useEffect(() => { load(); }, [id]);
  const load = async () => {
    try {
      const t = await api.getTrial(id);
      setTrial(t);
      const p = await api.getParticipants(id);
      setParticipants(p);
    } catch {}
  };

  const statusLabel = { recruiting: '招募中', ongoing: '进行中', finished: '已结束', settling: '结算中' };
  const statusColor = { recruiting: 'status-recruiting', ongoing: 'status-ongoing', finished: 'status-finished', settling: 'status-ongoing' };

  const isHost = trial && char && trial.host_id === char.id;
  const isAdmin = user?.role === 'admin';
  const myPart = participants.find(p => p.character_id === char?.id);
  const hasJoined = !!myPart;

  const join = async () => {
    try { await api.joinTrial(id); await load(); setMsg('加入成功'); }
    catch (e) { setMsg(e.message); }
    setTimeout(() => setMsg(''), 2000);
  };

  const leave = async () => {
    try { await api.leaveTrial(id); await load(); }
    catch (e) { setMsg(e.message); }
  };

  const startTrial = async () => {
    try { await api.updateTrialStatus(id, 'ongoing'); await load(); }
    catch (e) { setMsg(e.message); }
  };

  const finishTrial = async () => {
    try { await api.updateTrialStatus(id, 'settling'); await load(); }
    catch (e) { setMsg(e.message); }
  };

  const settleTrial = async () => {
    try { await api.settleTrial(id); await load(); setMsg('结算完成'); }
    catch (e) { setMsg(e.message); }
    setTimeout(() => setMsg(''), 2000);
  };

  const setScore = async (pid, asc, faith) => {
    try {
      await api.updateScore(id, pid, { ascension_score: parseFloat(asc)||0, faith_score: parseFloat(faith)||0 });
      await load(); setShowScore(null);
    } catch (e) { setMsg(e.message); }
  };

  const setCoHost = async (charId) => {
    try { await api.setCoHost(id, charId); await load(); }
    catch (e) { setMsg(e.message); }
  };

  const removeCoHost = async (charId) => {
    try { await api.removeCoHost(id, charId); await load(); }
    catch (e) { setMsg(e.message); }
  };

  const delTrial = async () => {
    if (!confirm('确定删除此试炼？')) return;
    try { await api.deleteTrial(id); nav('/trial'); }
    catch (e) { setMsg(e.message); }
  };

  if (!trial) return <div className="page-bg page-with-nav"><p className="text-center text-white/50 py-8">加载中...</p></div>;

  return (
    <div className="page-bg page-with-nav">
      <div className="glass-card mb-4">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-xl font-bold">{trial.name}</h2>
          <span className={`text-xs ${statusColor[trial.status]}`}>{statusLabel[trial.status]}</span>
        </div>
        <div className="text-sm text-white/60 space-y-1">
          <div>主持: {trial.host?.profile?.username || '?'}</div>
          <div>模式: {trial.mode === 'battle' ? '战斗' : '普通'} · 人数: {participants.length}/{trial.max_participants}</div>
          {trial.location_name && <div>地点: {trial.location_name}</div>}
          {trial.expected_start_time && <div>预计开始: {trial.expected_start_time}</div>}
        </div>
      </div>

      {msg && <div className="toast">{msg}</div>}

      <div className="glass-card mb-4">
        <h3 className="font-bold mb-2">参与者</h3>
        {participants.map(p => (
          <div key={p.id} className="glass p-2 mb-1">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold">{p.character?.profile?.username || p.trial_nickname || '?'}</span>
                {p.role === 'host' && <span className="text-xs text-yellow-300 ml-2">主持</span>}
                {p.role === 'co_host' && <span className="text-xs text-blue-300 ml-2">副主持</span>}
                {p.participant_role === 'observer' && <span className="text-xs text-purple-300 ml-2">观察者</span>}
              </div>
              {p.character && <span className="text-xs text-white/50">{p.character.character_id}</span>}
            </div>
            {p.character && (
              <div className="text-xs text-white/60 mt-1">
                {p.character.path?.name} · {p.character.profession?.name}
                {p.ascension_score !== 0 && <span className="ml-2 text-yellow-300">积分: {p.ascension_score > 0 ? '+' : ''}{p.ascension_score}</span>}
                {p.faith_score !== 0 && <span className="ml-2 text-blue-300">信仰: {p.faith_score > 0 ? '+' : ''}{p.faith_score}</span>}
              </div>
            )}
            {isHost && p.role !== 'host' && trial.status === 'ongoing' && (
              <div className="flex gap-1 mt-1">
                <button className="btn-primary text-xs px-2 py-1" onClick={() => setShowScore(p.id)}>评分</button>
                {p.role === 'participant' && <button className="btn-primary text-xs px-2 py-1" onClick={() => setCoHost(p.character_id)}>设副主持</button>}
                {p.role === 'co_host' && <button className="btn-primary text-xs px-2 py-1" onClick={() => removeCoHost(p.character_id)}>取消副主持</button>}
              </div>
            )}
            {showScore === p.id && (
              <ScoreEditor onSave={(asc, faith) => setScore(p.id, asc, faith)} onCancel={() => setShowScore(null)}
                defaultAsc={p.ascension_score} defaultFaith={p.faith_score} />
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {!hasJoined && trial.status === 'recruiting' && (
          <button className="btn-primary w-full" onClick={join}>加入试炼</button>
        )}
        {hasJoined && myPart?.role !== 'host' && trial.status === 'recruiting' && (
          <button className="btn-danger w-full" onClick={leave}>退出试炼</button>
        )}
        {isHost && trial.status === 'recruiting' && (
          <button className="btn-primary w-full" onClick={startTrial}>开始试炼</button>
        )}
        {isHost && trial.status === 'ongoing' && (
          <>
            <button className="btn-primary w-full" onClick={finishTrial}>结束并结算</button>
            <button className="btn-primary w-full" onClick={() => nav(`/trial/${id}/trade`)}>交易管理</button>
            <button className="btn-primary w-full" onClick={() => nav(`/trial/${id}/rewards`)}>奖励管理</button>
          </>
        )}
        {isHost && trial.status === 'settling' && (
          <button className="btn-primary w-full" onClick={settleTrial}>确认结算</button>
        )}
        {trial.status === 'finished' && hasJoined && (
          <button className="btn-primary w-full" onClick={() => nav(`/trial/${id}/rewards`)}>查看奖励</button>
        )}
        {(isHost || isAdmin) && trial.status === 'recruiting' && (
          <button className="btn-danger w-full" onClick={delTrial}>删除试炼</button>
        )}
      </div>
    </div>
  );
}

function ScoreEditor({ onSave, onCancel, defaultAsc, defaultFaith }) {
  const [asc, setAsc] = useState(defaultAsc || 0);
  const [faith, setFaith] = useState(defaultFaith || 0);
  return (
    <div className="glass p-2 mt-1 space-y-1">
      <input type="number" value={asc} onChange={e => setAsc(e.target.value)} placeholder="积分变化" />
      <input type="number" value={faith} onChange={e => setFaith(e.target.value)} placeholder="信仰变化" />
      <div className="flex gap-1">
        <button className="btn-primary text-xs flex-1" onClick={() => onSave(asc, faith)}>保存</button>
        <button className="btn-primary text-xs flex-1" onClick={onCancel}>取消</button>
      </div>
    </div>
  );
}
