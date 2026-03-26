import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, CheckCircle, LogIn } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const result = await login(username, password);

    if (result.success) {
      setSuccess(result.message);
      setTimeout(() => navigate('/'), 500);
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  const handleQuickLogin = async (user: string, pwd: string) => {
    setUsername(user);
    setPassword(pwd);
    setError('');
    setSuccess('');
    setLoading(true);

    const result = await login(user, pwd);
    if (result.success) {
      setSuccess(result.message);
      setTimeout(() => navigate('/'), 500);
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/30">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">光伏电站巡检</h1>
          <p className="text-slate-400 text-sm">移动工单管理系统</p>
        </div>

        {/* 登录表单 */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 text-sm">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          {/* 测试账号快速登录 */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs text-slate-500 text-center mb-3">快速测试登录</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleQuickLogin('admin', '123456')}
                disabled={loading}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-center transition-colors disabled:opacity-50"
              >
                <p className="font-medium text-slate-800 text-sm">管理员</p>
                <p className="text-xs text-slate-500 mt-0.5">admin</p>
              </button>
              <button
                onClick={() => handleQuickLogin('inspector1', '123456')}
                disabled={loading}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-center transition-colors disabled:opacity-50"
              >
                <p className="font-medium text-slate-800 text-sm">巡检员</p>
                <p className="text-xs text-slate-500 mt-0.5">inspector1</p>
              </button>
              <button
                onClick={() => handleQuickLogin('viewer', '123456')}
                disabled={loading}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-center transition-colors disabled:opacity-50"
              >
                <p className="font-medium text-slate-800 text-sm">访客</p>
                <p className="text-xs text-slate-500 mt-0.5">viewer</p>
              </button>
            </div>
          </div>
        </div>

        {/* 底部信息 */}
        <p className="text-center text-slate-500 text-xs mt-6">
          测试环境 · 演示账号密码: 123456
        </p>
      </div>
    </div>
  );
}