import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!username || !password) { setErr('请输入用户名和密码'); return; }
    if (password !== confirm) { setErr('两次密码不一致'); return; }
    if (password.length < 6) { setErr('密码至少6位'); return; }
    setErr(''); setLoading(true);
    try {
      await register(username, password);
      nav('/home');
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div className="page-bg flex flex-col items-center justify-center min-h-screen">
      <div className="glass-card w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center gradient-text mb-6">注册账号</h1>
        <form onSubmit={submit} className="space-y-3">
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="用户名" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="密码（至少6位）" />
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="确认密码" />
          {err && <p className="text-red-400 text-sm text-center">{err}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? '注册中...' : '注册'}</button>
        </form>
        <div className="text-center mt-4 text-sm">
          <Link to="/login" className="text-white/60 underline">已有账号？去登录</Link>
        </div>
      </div>
    </div>
  );
}
