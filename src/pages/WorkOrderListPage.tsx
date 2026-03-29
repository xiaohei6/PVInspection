import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, FileText, Clock, CheckCircle,
  RefreshCw, XCircle, LogOut, User, Eye, Edit2, Trash2,
  Sun, Cloud, CloudRain, Cloudy, Menu, FileDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { statusConfig, priorityConfig, type InspectionOrder } from '../types/inspectionOrder';
import { getInspectionOrders, deleteInspectionOrder, getStats } from '../utils/inspectionService';
import { exportOrderToPDF } from '../utils/pdfExport';

export default function WorkOrderListPage() {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const [orders, setOrders] = useState<InspectionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [areas, setAreas] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchToolbar, setShowBatchToolbar] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    const data = await getInspectionOrders();
    setOrders(data);
    // 提取唯一地区列表
    const uniqueAreas = [...new Set(data.map(order => {
      const addr = order.address;
      if (!addr) return '';
      const match = addr.match(/(?:省|自治区)(?:.*?(?:市|区|县))/);
      if (match) {
        const part = match[0];
        const areaMatch = part.match(/(?:市|区|县)([^市、区、县]+)(?:市|区|县)?$/);
        if (areaMatch) return areaMatch[1];
        const lastMatch = part.match(/(.+?)(?:市|区|县)$/);
        if (lastMatch) return lastMatch[1];
      }
      return addr.slice(0, 8);
    }))].filter(Boolean).sort();
    setAreas(uniqueAreas);
    setLoading(false);
  };

  // 批量选择
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set());
      setShowBatchToolbar(false);
    } else {
      setSelectedIds(new Set(filteredOrders.map(o => o.id)));
      setShowBatchToolbar(true);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setShowBatchToolbar(newSelected.size > 0);
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (confirm(`确定要删除选中的 ${selectedIds.size} 条工单吗？`)) {
      for (const id of selectedIds) {
        await deleteInspectionOrder(id);
      }
      setSelectedIds(new Set());
      setShowBatchToolbar(false);
      loadOrders();
    }
  };

  // 批量导出PDF
  const handleBatchExportPDF = async () => {
    const selectedOrders = filteredOrders.filter(o => selectedIds.has(o.id));
    for (const order of selectedOrders) {
      await exportOrderToPDF(order);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    setSelectedIds(new Set());
    setShowBatchToolbar(false);
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
      order.inverterNo.includes(searchKeyword) ||
      (order.assignedTo && order.assignedTo.includes(searchKeyword));
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    // 日期筛选（仅在已完成状态下生效）
    const matchesDate = filterStatus !== 'completed' || filterDate === '' ||
      (order.completedAt && order.completedAt.startsWith(filterDate));
    // 地区筛选
    const matchesArea = filterArea === 'all' || (order.address && order.address.includes(filterArea));
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
    return matchesSearch && matchesStatus && matchesInspector && matchesDate && matchesArea;
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
              {/* 地区筛选 */}
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none min-w-[80px] cursor-pointer"
              >
                <option value="all">地区</option>
                {areas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
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

      <main className={`px-4 py-4 pb-24 ${showBatchToolbar ? 'pt-3' : ''}`}>
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
              placeholder="搜索工单编号、项目名称、逆变器编号..."
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
          {/* 日期筛选器 - 仅在已完成状态下显示 */}
          {filterStatus === 'completed' && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
              <span className="text-xs text-amber-700">完成日期筛选:</span>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-2 py-1 text-sm border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white"
              />
              {filterDate && (
                <button
                  onClick={() => setFilterDate('')}
                  className="text-xs text-amber-600 hover:text-amber-800 font-medium"
                >
                  清除
                </button>
              )}
              <span className="text-xs text-amber-600">
                {filterDate ? `显示 ${filterDate} 完成的工单` : '显示所有已完成工单'}
              </span>
            </div>
          )}
        </div>

        {/* 批量操作工具栏 */}
        {showBatchToolbar && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 shadow-lg">
            <div className="px-4 py-2 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-600 font-medium">{selectedIds.size} 项已选</span>
                <button
                  onClick={() => { setSelectedIds(new Set()); setShowBatchToolbar(false); }}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  取消
                </button>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={handleBatchDelete}
                    className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">删除</span>
                  </button>
                )}
                <button
                  onClick={handleBatchExportPDF}
                  className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium"
                >
                  <FileDown className="w-4 h-4" />
                  <span className="hidden sm:inline">导出</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 工单列表 */}
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            filteredOrders.length === 0 ? (
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
              <>
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredOrders.length && filteredOrders.length > 0}
                    onChange={toggleSelectAll}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-600">全选 ({filteredOrders.length})</span>
                </div>
                {filteredOrders.map(order => {
                  const status = statusConfig[order.status];
                  const priority = priorityConfig[order.priority];
                  const isSelected = selectedIds.has(order.id);
                  return (
                    <div
                      key={order.id}
                      className={`bg-white rounded-xl shadow-sm border p-3 mb-3 ${isSelected ? 'border-blue-400 ring-1 ring-blue-100' : 'border-slate-100'}`}
                      onClick={() => navigate(`/detail/${order.id}`)}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(order.id)}
                          onClick={e => e.stopPropagation()}
                          className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0">
                              <p className="font-mono text-xs text-blue-600 font-medium">{order.orderNo}</p>
                              <h3 className="font-medium text-slate-800 mt-0.5 line-clamp-1">{order.projectName}</h3>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${priority.bgColor} ${priority.color}`}>
                                {priority.label}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                            <span className="flex items-center gap-1">
                              {getWeatherIcon(order.weather)}
                              {order.weather}
                            </span>
                            <span>{order.inspectionDate}</span>
                            <span className="truncate">{order.farmerName}</span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${status.bgColor} ${status.color}`}>
                              {order.status === 'pending' && <Clock className="w-3 h-3" />}
                              {order.status === 'processing' && <RefreshCw className="w-3 h-3" />}
                              {order.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                              {order.status === 'closed' && <XCircle className="w-3 h-3" />}
                              {status.label}
                            </span>
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <button onClick={() => navigate(`/detail/${order.id}`)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button onClick={() => navigate(`/edit/${order.id}`)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {isAdmin && (
                                <button onClick={() => handleDelete(order.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )
          )}
        </div>
      </main>

      {/* 底部浮动按钮 - 批量工具栏显示时上移 */}
      <div className={`fixed right-6 flex flex-col gap-3 transition-all duration-300 ${showBatchToolbar ? 'bottom-24' : 'bottom-6'}`}>
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