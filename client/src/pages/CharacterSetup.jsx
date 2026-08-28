import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

const pathDescs = {
  '诞生': '生命初始的力量', '污堕': '堕入黑暗的深渊', '繁荣': '万物生长的荣光', '腐朽': '消亡与衰败的法则',
  '死亡': '终结的使者', '湮灭': '归于虚无的力量', '真理': '永恒不变的法则', '痴愚': '混沌中的清醒',
  '秩序': '万物运行的规律', '混乱': '打破一切的颠覆', '战争': '冲突与征服', '沉默': '寂静中的力量',
  '记忆': '过往的回响', '欺诈': '虚妄与真实的交织', '时间': '流转的维度', '命运': '不可改变的轨迹'
};

const profDescs = {
  '战士': '近战物理输出，高生命值', '猎人': '远程物理输出，善于追踪', '法师': '魔法伤害输出，高法力值',
  '歌者': '辅助与控制，音波攻击', '牧师': '治疗与增益，守护同伴', '刺客': '高爆发输出，敏捷为主'
};

export default function CharacterSetup() {
  const { user, refreshChar } = useAuth();
  const nav = useNavigate();
  const [paths, setPaths] = useState([]);
  const [profs, setProfs] = useState([]);
  const [selPath, setSelPath] = useState(null);
  const [selProf, setSelProf] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [regInfo, setRegInfo] = useState(null);

  useEffect(() => {
    api.getPaths().then(setPaths).catch(() => {});
    api.getProfessions().then(setProfs).catch(() => {});
    api.regStatus().then(setRegInfo).catch(() => {});
  }, []);

  const submit = async () => {
    if (!selPath || !selProf) { setErr('请选择命途和职业'); return; }
    setErr(''); setLoading(true);
    try {
      await api.createChar(selPath, selProf);
      await refreshChar();
      nav('/home');
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  const applyReg = async () => {
    try {
      await api.applyReg();
      const info = await api.regStatus();
      setRegInfo(info);
    } catch (e) { setErr(e.message); }
  };

  // Registration pending
  if (regInfo?.hasApplication && regInfo.status === 'pending') {
    return (
      <div className="page-bg flex flex-col items-center justify-center min-h-screen">
        <div className="glass-card w-full max-w-sm text-center">
          <h2 className="text-xl font-bold mb-4">审核中</h2>
          <p className="text-white/70 mb-4">您的注册申请正在审核中，请耐心等待管理员通过。</p>
          <button className="btn-primary" onClick={() => nav('/login')}>返回登录</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-bg page-with-nav">
      <h1 className="text-2xl font-bold gradient-text text-center mb-4">创建角色</h1>

      <div className="glass-card mb-4">
        <h3 className="font-bold mb-2">选择命途</h3>
        <div className="grid grid-cols-2 gap-2">
          {paths.map(p => (
            <div key={p.id} onClick={() => setSelPath(p.id)}
              className={`glass p-2 cursor-pointer text-center ${selPath === p.id ? 'ring-2 ring-white/60' : ''}`}>
              <div className="font-bold">{p.name}</div>
              <div className="text-xs text-white/60">{pathDescs[p.name] || p.description}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card mb-4">
        <h3 className="font-bold mb-2">选择职业</h3>
        <div className="grid grid-cols-2 gap-2">
          {profs.map(p => (
            <div key={p.id} onClick={() => setSelProf(p.id)}
              className={`glass p-2 cursor-pointer text-center ${selProf === p.id ? 'ring-2 ring-white/60' : ''}`}>
              <div className="font-bold">{p.name}</div>
              <div className="text-xs text-white/60">{profDescs[p.name] || p.description}</div>
            </div>
          ))}
        </div>
      </div>

      {err && <p className="text-red-400 text-center mb-2">{err}</p>}
      <button className="btn-primary w-full" onClick={submit} disabled={loading}>
        {loading ? '创建中...' : '确认创建'}
      </button>
    </div>
  );
}
