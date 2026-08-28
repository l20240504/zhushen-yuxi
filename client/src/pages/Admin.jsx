import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function Admin() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState('reg');
  const [data, setData] = useState({});
  const [msg, setMsg] = useState('');
  const [paths, setPaths] = useState([]);
  const [profs, setProfs] = useState([]);

  useEffect(() => { load(); }, [tab]);
  useEffect(() => {
    if (tab === 'talents' || tab === 'items') {
      api.getPaths().then(setPaths).catch(() => {});
      api.getProfessions().then(setProfs).catch(() => {});
    }
  }, [tab]);

  const load = async () => {
    try {
      if (tab === 'reg') setData({ list: await api.getRegApps() });
      else if (tab === 'reports') setData({ list: await api.getReports() });
      else if (tab === 'announcements') setData({ list: await api.getAllAnnouncements() });
      else if (tab === 'host') setData({ list: await api.getHostApps() });
      else if (tab === 'settings') setData({ obj: await api.getSettings() });
      else if (tab === 'trade-alerts') setData({ list: await api.getTradeAlerts() });
      else if (tab === 'deletion') setData({ list: await api.getDeletionRequests() });
      else if (tab === 'talents') setData({ list: await api.getTalents() });
      else if (tab === 'items') setData({ list: await api.getItems() });
    } catch {}
  };

  if (user?.role !== 'admin') {
    return <div className="page-bg page-with-nav"><p className="text-center text-white/50 py-8">无权限</p></div>;
  }

  const reviewReg = async (id, approved) => {
    try { await api.reviewRegApp(id, { approved }); await load(); setMsg('已处理'); }
    catch (e) { setMsg(e.message); }
    setTimeout(() => setMsg(''), 2000);
  };

  const reviewReport = async (id, status) => {
    try { await api.updateReport(id, { status }); await load(); }
    catch (e) { setMsg(e.message); }
  };

  const createAnn = async () => {
    const content = prompt('公告内容:');
    if (!content) return;
    try { await api.createAnnouncement({ content, priority: 0 }); await load(); }
    catch (e) { setMsg(e.message); }
  };

  const delAnn = async (id) => {
    if (!confirm('删除此公告?')) return;
    try { await api.deleteAnnouncement(id); await load(); }
    catch (e) { setMsg(e.message); }
  };

  const toggleAnn = async (id, active) => {
    try { await api.updateAnnouncement(id, { is_active: !active }); await load(); }
    catch (e) { setMsg(e.message); }
  };

  const reviewHost = async (id, approved) => {
    try { await api.reviewHostApp(id, { status: approved ? 'approved' : 'rejected' }); await load(); }
    catch (e) { setMsg(e.message); }
  };

  const updateSetting = async (key, val) => {
    try { await api.updateSetting(key, val); await load(); setMsg('已更新'); }
    catch (e) { setMsg(e.message); }
    setTimeout(() => setMsg(''), 2000);
  };

  const reviewTradeAlert = async (id, status) => {
    try { await api.updateTradeAlert(id, { status }); await load(); }
    catch (e) { setMsg(e.message); }
  };

  const approveDeletion = async (id, approved) => {
    try { await api.approveDeletion(id, { approved, comment: '' }); await load(); setMsg('已审批'); }
    catch (e) { setMsg(e.message); }
    setTimeout(() => setMsg(''), 2000);
  };

  const executeDeletion = async (id) => {
    if (!confirm('确定执行删除？此操作不可逆！')) return;
    try { await api.executeDeletion(id); await load(); setMsg('已执行'); }
    catch (e) { setMsg(e.message); }
    setTimeout(() => setMsg(''), 2000);
  };

  // --- Talent management ---
  const addTalent = async () => {
    const name = prompt('天赋名称:');
    if (!name) return;
    const description = prompt('描述:') || '';
    const type = prompt('类型 (active/passive):', 'active') || 'active';
    const grade = prompt('等级 (D/C/B/A/S/SS/SSS):', 'C') || 'C';
    const faithId = prompt('命途ID (留空=无):', '') || null;
    const profId = prompt('职业ID (留空=无):', '') || null;
    try {
      await api.createTalent({ name, description, type, grade, faith_id: faithId ? parseInt(faithId) : null, profession_id: profId ? parseInt(profId) : null });
      await load(); setMsg('已添加');
    } catch (e) { setMsg(e.message); }
    setTimeout(() => setMsg(''), 2000);
  };

  const editTalent = async (t) => {
    const name = prompt('名称:', t.name);
    if (name === null) return;
    const description = prompt('描述:', t.description || '');
    const type = prompt('类型 (active/passive):', t.type) || 'active';
    const grade = prompt('等级:', t.grade) || 'C';
    const faithId = prompt('命途ID (留空=无):', t.faith_id || '') || null;
    const profId = prompt('职业ID (留空=无):', t.profession_id || '') || null;
    try {
      await api.updateTalent(t.id, { name, description, type, grade, faith_id: faithId ? parseInt(faithId) : null, profession_id: profId ? parseInt(profId) : null });
      await load(); setMsg('已更新');
    } catch (e) { setMsg(e.message); }
    setTimeout(() => setMsg(''), 2000);
  };

  const delTalent = async (id) => {
    if (!confirm('删除此天赋?')) return;
    try { await api.deleteTalent(id); await load(); }
    catch (e) { setMsg(e.message); }
  };

  // --- Item management ---
  const addItem = async () => {
    const name = prompt('道具名称:');
    if (!name) return;
    const description = prompt('描述:') || '';
    const type = prompt('类型 (consumable/equipment):', 'consumable') || 'consumable';
    const grade = prompt('等级 (D/C/B/A/S/SS/SSS):', 'D') || 'D';
    const tradeable = confirm('可交易?') ? 1 : 0;
    const drawable = confirm('可抽奖?') ? 1 : 0;
    try {
      await api.createItem({ name, description, type, grade, tradeable, drawable });
      await load(); setMsg('已添加');
    } catch (e) { setMsg(e.message); }
    setTimeout(() => setMsg(''), 2000);
  };

  const editItem = async (it) => {
    const name = prompt('名称:', it.name);
    if (name === null) return;
    const description = prompt('描述:', it.description || '');
    const type = prompt('类型:', it.type) || 'consumable';
    const grade = prompt('等级:', it.grade) || 'D';
    const tradeable = confirm(`可交易? (当前: ${it.is_tradable ? '是' : '否'})`) ? 1 : 0;
    const drawable = confirm(`可抽奖? (当前: ${it.is_drawable ? '是' : '否'})`) ? 1 : 0;
    try {
      await api.updateItem(it.id, { name, description, type, grade, tradeable, drawable });
      await load(); setMsg('已更新');
    } catch (e) { setMsg(e.message); }
    setTimeout(() => setMsg(''), 2000);
  };

  const delItem = async (id) => {
    if (!confirm('删除此道具?')) return;
    try { await api.deleteItem(id); await load(); }
    catch (e) { setMsg(e.message); }
  };

  const tabs = [
    { id: 'reg', label: '注册审核' },
    { id: 'reports', label: '举报' },
    { id: 'announcements', label: '公告' },
    { id: 'host', label: '主持申请' },
    { id: 'talents', label: '天赋库' },
    { id: 'items', label: '道具库' },
    { id: 'settings', label: '设置' },
    { id: 'trade-alerts', label: '交易预警' },
    { id: 'deletion', label: '删号' },
  ];

  return (
    <div className="page-bg page-with-nav">
      {msg && <div className="toast">{msg}</div>}

      <div className="glass-card mb-4">
        <div className="flex gap-1 flex-wrap mb-3">
          {tabs.map(t => (
            <button key={t.id} className={`btn-primary text-xs ${tab === t.id ? 'ring-2 ring-white/60' : ''}`}
              onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>

      {tab === 'reg' && (
        <div className="space-y-2">
          {(data.list || []).map(a => (
            <div key={a.id} className="glass-card">
              <div className="flex justify-between">
                <span className="font-bold">{a.username}</span>
                <span className={`text-xs ${a.status === 'approved' ? 'text-green-400' : a.status === 'rejected' ? 'text-red-400' : 'text-yellow-300'}`}>
                  {a.status}
                </span>
              </div>
              {a.status === 'pending' && (
                <div className="flex gap-1 mt-1">
                  <button className="btn-primary text-xs flex-1" onClick={() => reviewReg(a.id, true)}>通过</button>
                  <button className="btn-danger text-xs flex-1" onClick={() => reviewReg(a.id, false)}>拒绝</button>
                </div>
              )}
            </div>
          ))}
          {(data.list || []).length === 0 && <p className="text-center text-white/50 py-4">暂无申请</p>}
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-2">
          {(data.list || []).map(r => (
            <div key={r.id} className="glass-card">
              <div className="text-sm">
                <span className="font-bold">{r.reporter?.profile?.username || '匿名'}</span> →
                <span className="font-bold ml-1">{r.reported?.profile?.username || '?'}</span>
              </div>
              <p className="text-xs text-white/60 mt-1">{r.reason}</p>
              <div className="flex gap-1 mt-1">
                {r.status === 'pending' && <>
                  <button className="btn-primary text-xs flex-1" onClick={() => reviewReport(r.id, 'resolved')}>已处理</button>
                  <button className="btn-danger text-xs flex-1" onClick={() => reviewReport(r.id, 'dismissed')}>驳回</button>
                </>}
                {r.status !== 'pending' && <span className="text-xs text-white/50">{r.status}</span>}
              </div>
            </div>
          ))}
          {(data.list || []).length === 0 && <p className="text-center text-white/50 py-4">暂无举报</p>}
        </div>
      )}

      {tab === 'announcements' && (
        <div>
          <button className="btn-primary w-full mb-2" onClick={createAnn}>发布公告</button>
          <div className="space-y-2">
            {(data.list || []).map(a => (
              <div key={a.id} className="glass-card">
                <div className="flex justify-between">
                  <span className="text-sm">{a.content}</span>
                  <span className={`text-xs ${a.is_active ? 'text-green-400' : 'text-white/40'}`}>{a.is_active ? '启用' : '禁用'}</span>
                </div>
                <div className="flex gap-1 mt-1">
                  <button className="btn-primary text-xs flex-1" onClick={() => toggleAnn(a.id, a.is_active)}>{a.is_active ? '禁用' : '启用'}</button>
                  <button className="btn-danger text-xs flex-1" onClick={() => delAnn(a.id)}>删除</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'host' && (
        <div className="space-y-2">
          {(data.list || []).map(a => (
            <div key={a.id} className="glass-card">
              <div className="flex justify-between">
                <span className="font-bold">{a.profile?.username}</span>
                <span className={`text-xs ${a.status === 'approved' ? 'text-green-400' : a.status === 'rejected' ? 'text-red-400' : 'text-yellow-300'}`}>{a.status}</span>
              </div>
              {a.status === 'pending' && (
                <div className="flex gap-1 mt-1">
                  <button className="btn-primary text-xs flex-1" onClick={() => reviewHost(a.id, true)}>通过</button>
                  <button className="btn-danger text-xs flex-1" onClick={() => reviewHost(a.id, false)}>拒绝</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'talents' && (
        <div>
          <button className="btn-primary w-full mb-2" onClick={addTalent}>添加天赋</button>
          <div className="space-y-2">
            {(data.list || []).map(t => (
              <div key={t.id} className="glass-card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <span className="font-bold text-sm">{t.name}</span>
                    <span className="ml-2 text-xs text-white/40">{t.grade} · {t.type}</span>
                  </div>
                </div>
                <p className="text-xs text-white/60 mt-1">{t.description}</p>
                <div className="flex gap-1 mt-1">
                  <button className="btn-primary text-xs flex-1" onClick={() => editTalent(t)}>编辑</button>
                  <button className="btn-danger text-xs flex-1" onClick={() => delTalent(t.id)}>删除</button>
                </div>
              </div>
            ))}
            {(data.list || []).length === 0 && <p className="text-center text-white/50 py-4">暂无天赋，点击上方添加</p>}
          </div>
        </div>
      )}

      {tab === 'items' && (
        <div>
          <button className="btn-primary w-full mb-2" onClick={addItem}>添加道具</button>
          <div className="space-y-2">
            {(data.list || []).map(it => (
              <div key={it.id} className="glass-card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <span className="font-bold text-sm">{it.name}</span>
                    <span className="ml-2 text-xs text-white/40">{it.grade} · {it.type}</span>
                  </div>
                  <div className="text-xs text-white/40">
                    {it.is_tradable ? '可交易' : ''} {it.is_drawable ? '可抽' : ''}
                  </div>
                </div>
                <p className="text-xs text-white/60 mt-1">{it.description}</p>
                <div className="flex gap-1 mt-1">
                  <button className="btn-primary text-xs flex-1" onClick={() => editItem(it)}>编辑</button>
                  <button className="btn-danger text-xs flex-1" onClick={() => delItem(it.id)}>删除</button>
                </div>
              </div>
            ))}
            {(data.list || []).length === 0 && <p className="text-center text-white/50 py-4">暂无道具，点击上方添加</p>}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="space-y-2">
          {Object.entries(data.obj || {}).map(([k, v]) => (
            <div key={k} className="glass-card flex items-center gap-2">
              <span className="text-sm flex-1">{k}</span>
              <input defaultValue={v} className="w-24" onBlur={e => e.target.value !== v && updateSetting(k, e.target.value)} />
            </div>
          ))}
        </div>
      )}

      {tab === 'trade-alerts' && (
        <div className="space-y-2">
          {(data.list || []).map(a => (
            <div key={a.id} className="glass-card">
              <div className="text-sm">交易次数: {a.trade_count}</div>
              <div className="flex gap-1 mt-1">
                <button className="btn-primary text-xs flex-1" onClick={() => reviewTradeAlert(a.id, 'resolved')}>已处理</button>
                <button className="btn-danger text-xs flex-1" onClick={() => reviewTradeAlert(a.id, 'ignored')}>忽略</button>
              </div>
            </div>
          ))}
          {(data.list || []).length === 0 && <p className="text-center text-white/50 py-4">暂无预警</p>}
        </div>
      )}

      {tab === 'deletion' && (
        <div className="space-y-2">
          {(data.list || []).map(r => (
            <div key={r.id} className="glass-card">
              <div className="text-sm">
                目标: <span className="font-bold">{r.target?.profile?.username}</span>
              </div>
              <div className="text-xs text-white/60">原因: {r.reason}</div>
              <div className="text-xs">状态: {r.status}</div>
              {r.status === 'pending' && (
                <div className="flex gap-1 mt-1">
                  <button className="btn-primary text-xs flex-1" onClick={() => approveDeletion(r.id, true)}>同意</button>
                  <button className="btn-danger text-xs flex-1" onClick={() => approveDeletion(r.id, false)}>拒绝</button>
                </div>
              )}
              {r.status === 'approved' && (
                <button className="btn-danger w-full mt-1 text-xs" onClick={() => executeDeletion(r.id)}>执行删除</button>
              )}
            </div>
          ))}
          {(data.list || []).length === 0 && <p className="text-center text-white/50 py-4">暂无申请</p>}
        </div>
      )}
    </div>
  );
}
