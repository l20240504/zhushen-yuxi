import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!username || !password) { setErr('请输入用户名和密码'); return; }
    setErr(''); setLoading(true);
    try {
      await login(username, password);
      nav('/home');
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div className="page-bg flex flex-col items-center justify-center min-h-screen">
      <div className="glass-card w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center gradient-text mb-1">诸神愚戏</h1>
        <p className="text-center text-sm text-white/60 mb-6">命途的抉择，愚者的舞台</p>
        <form onSubmit={submit} className="space-y-3">
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="用户名" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="密码" />
          {err && <p className="text-red-400 text-sm text-center">{err}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? '登录中...' : '登录'}</button>
        </form>
        <div className="text-center mt-4 text-sm">
          <span className="text-white/60">还没有账号？</span>
          <Link to="/register" className="text-white underline ml-1">注册</Link>
        </div>
      </div>
    </div>
  );
}
