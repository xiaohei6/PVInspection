import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, Search, User, MapPin,
  RefreshCw, X, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { statusConfig, priorityConfig, type InspectionOrder } from '../types/inspectionOrder';
import { getInspectionOrders, assignOrder, deleteInspectionOrder } from '../utils/inspectionService';

export default function AdminOrdersPage() {
  const navigate = useNavigate();
  const { isAdmin, getUsers } = useAuth();
  const [orders, setOrders] = useState<InspectionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<InspectionOrder | null>(null);
  const [selectedInspector, setSelectedInspector] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    loadOrders();
  }, [isAdmin]);

  const loadOrders = async () => {
    setLoading(true);
    const data = await getInspectionOrders();
    setOrders(data);
    setLoading(false);
  };

  const inspectors = getUsers().filter(u => u.role === 'inspector' && u.status === 'active');

  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchKeyword === '' ||
      order.orderNo.includes(searchKeyword) ||
      order.projectName.includes(searchKeyword) ||
      order.farmerName.includes(searchKeyword) ||
      order.inspector.includes(searchKeyword) ||
      (order.assignedTo && order.assignedTo.includes(searchKeyword));
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleAssign = async () => {
    if (!selectedOrder || !selectedInspector) return;

    await assignOrder(selectedOrder.id, selectedInspector);
    setShowAssignModal(false);
    setSelectedOrder(null);
    setSelectedInspector('');
    loadOrders();
  };

  const openAssignModal = (order: InspectionOrder) => {
    setSelectedOrder(order);
    setSelectedInspector(order.assignedTo || '');
    setShowAssignModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这条工单吗？')) {
      await deleteInspectionOrder(id);
      loadOrders();
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
              <div>
                <h1 className="font-semibold text-slate-800">工单管理</h1>
                <p className="text-xs text-slate-500">派单调度</p>
              </div>
            </div>
            <button onClick={loadOrders} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* 搜索和筛选 */}
      <div className="px-4 py-3 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索工单..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['all', 'pending', 'processing', 'completed', 'closed'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {status === 'all' ? '全部' : statusConfig[status as keyof typeof statusConfig]?.label || status}
            </button>
          ))}
        </div>
      </div>

      {/* 工单列表 */}
      <main className="px-4 pb-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>暂无工单</p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const status = statusConfig[order.status];
            const priority = priorityConfig[order.priority];
            return (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-mono text-sm text-blue-600 font-medium">{order.orderNo}</p>
                    <h3 className="font-semibold text-slate-800 mt-1">{order.projectName}</h3>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${priority.bgColor} ${priority.color}`}>
                      {priority.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.bgColor} ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-3">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>巡检员：{order.inspector || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>农户：{order.farmerName || '-'}</span>
                  </div>
                  {order.assignedTo && (
                    <div className="flex items-center gap-1.5 col-span-2 text-blue-600">
                      <User className="w-3.5 h-3.5" />
                      <span>已指派：{order.assignedTo}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/detail/${order.id}`)}
                    className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium"
                  >
                    查看详情
                  </button>
                  <button
                    onClick={() => openAssignModal(order)}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium"
                  >
                    派单
                  </button>
                  <button
                    onClick={() => handleDelete(order.id)}
                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-medium"
                  >
                    删除
                  </button>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* 派单弹窗 */}
      {showAssignModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">指派巡检员</h3>
              <button onClick={() => setShowAssignModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-600 mb-3">
                工单：<span className="font-medium">{selectedOrder.orderNo}</span>
              </p>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">选择巡检员</label>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {inspectors.map(inspector => (
                    <button
                      key={inspector.id}
                      onClick={() => setSelectedInspector(inspector.displayName)}
                      className={`w-full px-3 py-2.5 rounded-lg text-left text-sm flex items-center justify-between ${
                        selectedInspector === inspector.displayName
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-slate-800">{inspector.displayName}</div>
                        <div className="text-xs text-slate-500">{inspector.area || inspector.phone}</div>
                      </div>
                      {selectedInspector === inspector.displayName && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium"
              >
                取消
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedInspector}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                确认派单
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
