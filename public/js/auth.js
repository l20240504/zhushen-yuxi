function switchTab(tab) {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginLink = document.getElementById('login-link');
  const registerLink = document.getElementById('register-link');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');

  if (tab === 'login') {
    loginForm.style.display = '';
    registerForm.style.display = 'none';
    loginLink.style.display = 'none';
    registerLink.style.display = '';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = '';
    loginLink.style.display = '';
    registerLink.style.display = 'none';
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
  }
  hideMessage();
}

function showMessage(text, type) {
  const msg = document.getElementById('msg');
  msg.className = `message ${type} show`;
  msg.textContent = text;
}

function hideMessage() {
  const msg = document.getElementById('msg');
  msg.className = 'message';
  msg.textContent = '';
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const agree = document.getElementById('login-agree').checked;
  const remember = document.getElementById('login-remember').checked;
  const btn = document.getElementById('login-btn');

  if (!username || !password) {
    showMessage('请输入用户名和密码', 'error');
    return false;
  }
  if (!agree) {
    showMessage('请先同意用户协议和隐私政策', 'error');
    return false;
  }

  btn.disabled = true;
  btn.textContent = '登录中...';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, remember }),
    });
    const data = await res.json();

    if (data.success) {
      showMessage('登录成功，正在跳转...', 'success');
      setTimeout(() => {
        window.location.href = data.user.role === 'admin' ? '/admin' : '/dashboard';
      }, 800);
    } else {
      showMessage(data.error || '登录失败', 'error');
      btn.disabled = false;
      btn.textContent = '登录';
    }
  } catch {
    showMessage('网络错误，请稍后重试', 'error');
    btn.disabled = false;
    btn.textContent = '登录';
  }

  return false;
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  const agree = document.getElementById('reg-agree').checked;
  const btn = document.getElementById('register-btn');

  if (!username || !password) {
    showMessage('用户名和密码不能为空', 'error');
    return false;
  }
  if (username.length > 20) {
    showMessage('用户名长度不能超过20个字符', 'error');
    return false;
  }
  if (password !== confirm) {
    showMessage('两次输入的密码不一致', 'error');
    return false;
  }
  if (!agree) {
    showMessage('请先同意用户协议和隐私政策', 'error');
    return false;
  }

  btn.disabled = true;
  btn.textContent = '提交中...';

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, confirmPassword: confirm }),
    });
    const data = await res.json();

    if (data.success) {
      showMessage(data.message, 'success');
      document.getElementById('reg-username').value = '';
      document.getElementById('reg-password').value = '';
      document.getElementById('reg-confirm').value = '';
      document.getElementById('reg-agree').checked = false;
      setTimeout(() => switchTab('login'), 2000);
    } else {
      showMessage(data.error || '注册失败', 'error');
    }
  } catch {
    showMessage('网络错误，请稍后重试', 'error');
  }

  btn.disabled = false;
  btn.textContent = '提交注册';
  return false;
}

function openProtocol(e) {
  e.preventDefault();
  document.getElementById('protocol-modal').classList.add('show');
  return false;
}

function closeProtocol() {
  document.getElementById('protocol-modal').classList.remove('show');
}

document.getElementById('protocol-modal').addEventListener('click', function(e) {
  if (e.target === this) closeProtocol();
});

(async function checkSession() {
  try {
    const res = await fetch('/api/session');
    const data = await res.json();
    if (data.authenticated) {
      window.location.href = data.user.role === 'admin' ? '/admin' : '/dashboard';
    }
  } catch {}
})();
