import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function ApplyHost() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [apps, setApps] = useState([]);
  const [myApp, setMyApp] = useState(null);
  const [msg, setMsg] = useState('');
  const isAdmin = user?.role === 'admin';

  useEffect(() => { load(); }, []);
  const load = async () => {
    try {
      const all = await api.getHostApps();
      setApps(all);
      const mine = all.find(a => a.user_id === user?.id);
      setMyApp(mine);
    } catch {}
  };

  const apply = async () => {
    try { await api.applyHost(); await load(); setMsg('申请已提交'); }
    catch (e) { setMsg(e.message); }
    setTimeout(() => setMsg(''), 2000);
  };

  const review = async (appId, approved) => {
    try {
      await api.reviewHostApp(appId, { status: approved ? 'approved' : 'rejected' });
      await load();
    } catch (e) { setMsg(e.message); }
  };

  return (
    <div className="page-bg page-with-nav">
      {msg && <div className="toast">{msg}</div>}

      {!isAdmin && (
        <div className="glass-card mb-4">
          <h2 className="text-lg font-bold mb-2">申请主持</h2>
          {myApp ? (
            <div className="text-sm text-white/70">
              <p>申请状态: <span className={myApp.status === 'approved' ? 'text-green-400' : myApp.status === 'rejected' ? 'text-red-400' : 'text-yellow-300'}>
                {myApp.status === 'approved' ? '已通过' : myApp.status === 'rejected' ? '已拒绝' : '审核中'}
              </span></p>
              {myApp.reason && <p>原因: {myApp.reason}</p>}
            </div>
          ) : (
            <button className="btn-primary w-full" onClick={apply}>提交申请</button>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="glass-card">
          <h2 className="text-lg font-bold mb-2">主持申请列表</h2>
          {apps.map(a => (
            <div key={a.id} className="glass p-2 mb-1">
              <div className="flex justify-between">
                <span className="font-bold">{a.profile?.username}</span>
                <span className={`text-xs ${a.status === 'approved' ? 'text-green-400' : a.status === 'rejected' ? 'text-red-400' : 'text-yellow-300'}`}>
                  {a.status === 'approved' ? '已通过' : a.status === 'rejected' ? '已拒绝' : '待审核'}
                </span>
              </div>
              {a.status === 'pending' && (
                <div className="flex gap-1 mt-1">
                  <button className="btn-primary text-xs flex-1" onClick={() => review(a.id, true)}>通过</button>
                  <button className="btn-danger text-xs flex-1" onClick={() => review(a.id, false)}>拒绝</button>
                </div>
              )}
            </div>
          ))}
          {apps.length === 0 && <p className="text-center text-white/50 py-4">暂无申请</p>}
        </div>
      )}
    </div>
  );
}
