import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, FileText, Clock, CheckCircle,
  RefreshCw, XCircle, LogOut, User, Eye, Edit2, Trash2,
  Sun, Cloud, CloudRain, Cloudy, Menu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { statusConfig, priorityConfig, type InspectionOrder } from '../types/inspectionOrder';
import { getInspectionOrders, deleteInspectionOrder, getStats } from '../utils/inspectionService';

export default function WorkOrderListPage() {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const [orders, setOrders] = useState<InspectionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    const data = await getInspectionOrders();
    setOrders(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这条巡检工单吗？')) {
      await deleteInspectionOrder(id);
      loadOrders();
    }
  };

  // 过滤
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchKeyword === '' ||
      order.orderNo.includes(searchKeyword) ||
      order.projectName.includes(searchKeyword) ||
      order.farmerName.includes(searchKeyword) ||
      order.inspector.includes(searchKeyword) ||
      (order.assignedTo && order.assignedTo.includes(searchKeyword));
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    // 巡检员只能看自己的工单，管理员看全部
    // 匹配逻辑：支持多种名字格式匹配
    const userIdentifier = user?.username || '';
    const userDisplayName = user?.displayName || '';
    // 提取名字中的姓氏（去掉"巡检员"前缀）
    const userNameFromDisplay = userDisplayName.replace(/^巡检员/, '');

    const matchesInspector = isAdmin ||
      order.inspector === userIdentifier ||
      order.inspector === userDisplayName ||
      order.inspector.includes(userDisplayName) ||
      order.inspector.includes(userIdentifier) ||
      order.inspector.includes(userNameFromDisplay) ||
      order.assignedTo === userIdentifier ||
      order.assignedTo === userDisplayName ||
      order.assignedTo?.includes(userDisplayName) ||
      order.assignedTo?.includes(userIdentifier) ||
      order.assignedTo?.includes(userNameFromDisplay);
    return matchesSearch && matchesStatus && matchesInspector;
  });

  // 统计只显示当前用户有权限看到的工单
  const stats = getStats(filteredOrders);

  const getWeatherIcon = (weather: string) => {
    switch (weather) {
      case '晴': return <Sun className="w-4 h-4 text-amber-500" />;
      case '多云': return <Cloud className="w-4 h-4 text-slate-500" />;
      case '阴': return <Cloudy className="w-4 h-4 text-slate-400" />;
      case '雨': return <CloudRain className="w-4 h-4 text-blue-500" />;
      default: return <Sun className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-slate-800">巡检工单</h1>
                <p className="text-xs text-slate-500">
                  {isAdmin ? '管理后台' : '移动工单'}
                </p>
              </div>
            </div>

            {/* 移动端菜单按钮 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="hidden lg:flex items-center gap-3">
                <span className="text-sm text-slate-600">
                  <User className="w-4 h-4 inline mr-1" />
                  {user?.displayName}
                </span>
                <button
                  onClick={logout}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* 移动端下拉菜单 */}
          {showMenu && (
            <div className="mt-3 pt-3 border-t border-slate-100 lg:hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-600">
                  <User className="w-4 h-4 inline mr-1" />
                  {user?.displayName}
                </span>
                <button
                  onClick={logout}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
              {isAdmin && (
                <>
                  <button
                    onClick={() => navigate('/admin/orders')}
                    className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
                  >
                    工单管理
                  </button>
                  <button
                    onClick={() => navigate('/admin/inspection-items')}
                    className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
                  >
                    巡检项管理
                  </button>
                  <button
                    onClick={() => navigate('/admin/users')}
                    className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
                  >
                    账号管理
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="px-4 py-4 pb-24">
        {/* 统计卡片 - 移动端横向滚动 */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {[
            { label: '全部', value: stats.total, icon: FileText, color: 'blue' },
            { label: '待巡检', value: stats.pending, icon: Clock, color: 'amber' },
            { label: '巡检中', value: stats.processing, icon: RefreshCw, color: 'blue' },
            { label: '已完成', value: stats.completed, icon: CheckCircle, color: 'emerald' }
          ].map(stat => (
            <div key={stat.label} className="flex-shrink-0 bg-white rounded-xl p-3 shadow-sm border border-slate-100 min-w-[100px]">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg bg-${stat.color}-50`}>
                  <stat.icon className={`w-4 h-4 text-${stat.color}-600`} />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 搜索和筛选 */}
        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索工单编号、项目名称、农户姓名..."
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {['all', 'pending', 'processing', 'completed', 'closed'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {status === 'all' ? '全部' :
                 status === 'pending' ? '待巡检' :
                 status === 'processing' ? '巡检中' :
                 status === 'completed' ? '已完成' : '已关闭'}
              </button>
            ))}
          </div>
        </div>

        {/* 工单列表 */}
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">暂无工单数据</p>
              <button
                onClick={() => navigate('/create')}
                className="mt-3 text-blue-600 text-sm font-medium"
              >
                点击新增工单
              </button>
            </div>
          ) : (
            filteredOrders.map(order => {
              const status = statusConfig[order.status];
              const priority = priorityConfig[order.priority];

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 active:bg-slate-50 transition-colors"
                  onClick={() => navigate(`/detail/${order.id}`)}
                >
                  {/* 工单头部 */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-mono text-xs text-blue-600 font-medium">{order.orderNo}</p>
                      <h3 className="font-medium text-slate-800 mt-1 line-clamp-1">{order.projectName}</h3>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${priority.bgColor} ${priority.color}`}>
                        {priority.label}
                      </span>
                    </div>
                  </div>

                  {/* 信息行 */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1">
                      {getWeatherIcon(order.weather)}
                      {order.weather}
                    </span>
                    <span>{order.inspectionDate}</span>
                    <span className="truncate">{order.farmerName}</span>
                  </div>

                  {/* 状态和操作 */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${status.bgColor} ${status.color}`}>
                      {order.status === 'pending' && <Clock className="w-3 h-3" />}
                      {order.status === 'processing' && <RefreshCw className="w-3 h-3" />}
                      {order.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                      {order.status === 'closed' && <XCircle className="w-3 h-3" />}
                      {status.label}
                    </span>

                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/detail/${order.id}`)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/edit/${order.id}`)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* 底部浮动按钮 */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        {isAdmin && (
          <>
            <button
              onClick={() => navigate('/admin/users')}
              className="w-12 h-12 bg-white text-slate-600 rounded-full shadow-lg flex items-center justify-center border border-slate-200 hover:bg-slate-50 transition-colors"
              title="账号管理"
            >
              <User className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/create')}
              className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
              title="新增工单"
            >
              <Plus className="w-6 h-6" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}