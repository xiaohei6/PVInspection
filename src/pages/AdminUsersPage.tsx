import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Search, Edit2, Trash2, User, Shield,
  UserCheck, UserX, Phone, MapPin, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { User as UserType, UserRole } from '../types/inspectionOrder';

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { user, isAdmin, updateUser, addUser, deleteUser, getUsers } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    displayName: '',
    role: 'inspector' as UserRole,
    phone: '',
    area: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    loadUsers();
  }, [isAdmin]);

  const loadUsers = () => {
    setUsers(getUsers());
  };

  const filteredUsers = users.filter(u =>
    u.username.includes(searchKeyword) ||
    u.displayName.includes(searchKeyword) ||
    u.phone.includes(searchKeyword)
  );

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      displayName: '',
      role: 'inspector',
      phone: '',
      area: ''
    });
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (user: UserType) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      displayName: user.displayName,
      role: user.role,
      phone: user.phone,
      area: user.area || ''
    });
    setErrors({});
    setShowModal(true);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.username.trim()) newErrors.username = '请输入用户名';
    if (!editingUser && !formData.password) newErrors.password = '请输入密码';
    if (formData.password && formData.password.length < 6) newErrors.password = '密码至少6位';
    if (!formData.displayName.trim()) newErrors.displayName = '请输入姓名';
    if (!formData.phone.trim()) newErrors.phone = '请输入电话';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    if (editingUser) {
      updateUser({
        ...editingUser,
        displayName: formData.displayName,
        role: formData.role,
        phone: formData.phone,
        area: formData.area,
        ...(formData.password ? { password: formData.password } : {})
      });
    } else {
      const success = await addUser({
        username: formData.username,
        password: formData.password,
        displayName: formData.displayName,
        role: formData.role,
        phone: formData.phone,
        area: formData.area,
        status: 'active'
      });
      if (!success) {
        setErrors({ username: '用户名已存在' });
        return;
      }
    }

    loadUsers();
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    if (id === user?.id) {
      alert('不能删除当前登录账号');
      return;
    }
    if (confirm('确定要删除该账号吗？')) {
      await deleteUser(id);
      loadUsers();
    }
  };

  const toggleStatus = (user: UserType) => {
    if (user.id === user?.id) return;
    updateUser({
      ...user,
      status: user.status === 'active' ? 'inactive' : 'active'
    });
    loadUsers();
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">管理员</span>;
      case 'inspector':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">巡检员</span>;
      case 'viewer':
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">访客</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* 头部 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/')} className="p-2 -ml-2 hover:bg-slate-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <h1 className="font-semibold text-slate-800">账号管理</h1>
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              新增账号
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-4">
        {/* 搜索 */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索用户名、姓名、电话..."
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          />
        </div>

        {/* 用户列表 */}
        <div className="space-y-3">
          {filteredUsers.map(u => (
            <div key={u.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    u.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                    u.role === 'inspector' ? 'bg-blue-100 text-blue-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {u.role === 'admin' ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800">{u.displayName}</p>
                      {getRoleBadge(u.role)}
                      {u.status !== 'active' && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">已禁用</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">@{u.username}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleStatus(u)}
                    disabled={u.id === user?.id}
                    className={`p-2 rounded-lg transition-colors ${
                      u.id === user?.id ? 'opacity-50 cursor-not-allowed' :
                      u.status === 'active'
                        ? 'text-emerald-600 hover:bg-emerald-50'
                        : 'text-slate-400 hover:bg-slate-100'
                    }`}
                    title={u.status === 'active' ? '禁用账号' : '启用账号'}
                  >
                    {u.status === 'active' ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEditModal(u)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(u.id)}
                    disabled={u.id === user?.id}
                    className={`p-2 rounded-lg transition-colors ${
                      u.id === user?.id ? 'opacity-50 cursor-not-allowed' :
                      'text-slate-400 hover:text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {u.phone}
                </span>
                {u.area && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {u.area}
                  </span>
                )}
              </div>
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">暂无账号数据</p>
            </div>
          )}
        </div>
      </main>

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-lg text-slate-800">
                {editingUser ? '编辑账号' : '新增账号'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">用户名</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  disabled={!!editingUser}
                  placeholder="请输入用户名"
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                    errors.username ? 'border-red-500' : 'border-slate-200'
                  } ${editingUser ? 'bg-slate-50' : ''}`}
                />
                {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  密码 {editingUser && <span className="text-slate-400 font-normal">(留空则不修改)</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder={editingUser ? '留空不修改' : '请输入密码'}
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                    errors.password ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">姓名</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="请输入姓名"
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                    errors.displayName ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                {errors.displayName && <p className="text-red-500 text-xs mt-1">{errors.displayName}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">角色</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="inspector">巡检员</option>
                    <option value="admin">管理员</option>
                    <option value="viewer">访客</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">电话</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="请输入电话"
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                      errors.phone ? 'border-red-500' : 'border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {formData.role === 'inspector' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">负责区域</label>
                  <input
                    type="text"
                    value={formData.area}
                    onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                    placeholder="如：华北区域"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}