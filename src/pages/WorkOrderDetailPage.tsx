import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit2, CheckCircle,
  FileText, MapPin, AlertTriangle, Camera, Sun,
  Cloud, CloudRain, Cloudy, ChevronDown, ChevronUp, Printer
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { statusConfig, priorityConfig, type InspectionOrder, type InspectionItem } from '../types/inspectionOrder';
import { getInspectionOrderById, updateOrderStatus } from '../utils/inspectionService';
import { exportOrderToPDF } from '../utils/pdfExport';

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [order, setOrder] = useState<InspectionOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['光伏组件']);

  useEffect(() => {
    if (id) {
      loadOrder(id);
    }
  }, [id]);

  const loadOrder = async (orderId: string) => {
    setLoading(true);
    const data = await getInspectionOrderById(orderId);
    setOrder(data);
    setLoading(false);
  };

  const handleStatusChange = async (status: InspectionOrder['status']) => {
    if (!id || !order) return;
    await updateOrderStatus(id, status);
    loadOrder(id);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const getWeatherIcon = (weather: string) => {
    switch (weather) {
      case '晴': return <Sun className="w-5 h-5 text-amber-500" />;
      case '多云': return <Cloud className="w-5 h-5 text-slate-500" />;
      case '阴': return <Cloudy className="w-5 h-5 text-slate-400" />;
      case '雨': return <CloudRain className="w-5 h-5 text-blue-500" />;
      default: return <Sun className="w-5 h-5 text-amber-500" />;
    }
  };

  // 按类别分组巡检项目
  const groupedInspections = order?.inspections.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, InspectionItem[]>) || {};

  // 生成模板格式PDF
  const handleExportPDF = async () => {
    if (!order) return;
    setExporting(true);

    try {
      await exportOrderToPDF(order);
    } catch (error) {
      console.error('导出失败:', error);
      alert('PDF导出失败，请重试');
    }
    setExporting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center">
        <FileText className="w-12 h-12 text-slate-300 mb-4" />
        <p className="text-slate-500 mb-4">工单不存在</p>
        <button onClick={() => navigate('/')} className="text-blue-600 hover:underline">
          返回列表
        </button>
      </div>
    );
  }

  const status = statusConfig[order.status];
  const priority = priorityConfig[order.priority];

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/')} className="p-2 -ml-2 hover:bg-slate-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <h1 className="font-semibold text-slate-800">工单详情</h1>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => navigate(`/edit/${order.id}`)}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-mono text-sm text-blue-600 font-medium">{order.orderNo}</p>
              <h2 className="text-lg font-bold text-slate-800 mt-1">{order.projectName}</h2>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={`px-2 py-1 rounded text-xs font-medium ${priority.bgColor} ${priority.color}`}>
                {priority.label}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${status.bgColor} ${status.color}`}>
                {status.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              {getWeatherIcon(order.weather)}
              {order.weather}
            </span>
            <span>{order.inspectionDate}</span>
          </div>

          {(isAdmin || order.status === 'pending') && (
            <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-slate-100">
              <span className="text-sm text-slate-500 mr-1">更新状态:</span>
              {(['pending', 'processing', 'completed', 'closed'] as const).map(s => {
                const config = statusConfig[s];
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={order.status === s}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      order.status === s
                        ? `${config.bgColor} ${config.color}`
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            基础信息
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">巡检员</p>
              <p className="font-medium text-slate-800">{order.inspector}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">联系电话</p>
              <p className="font-medium text-slate-800">{order.inspectorPhone || '-'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            电站信息
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">逆变器编号</p>
              <p className="font-medium text-slate-800">{order.inverterNo}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">装机容量</p>
              <p className="font-medium text-slate-800">{order.installedCapacity ? `${order.installedCapacity} kWp` : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">农户姓名</p>
              <p className="font-medium text-slate-800">{order.farmerName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">联系电话</p>
              <p className="font-medium text-slate-800">{order.farmerPhone || '-'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-500">地址</p>
              <p className="font-medium text-slate-800">{order.address}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-amber-600" />
              巡检项目
            </h3>
            <div className="flex gap-3 mt-3">
              <span className="text-xs text-emerald-600">
                正常 {order.inspections.filter(i => i.result === '正常').length}
              </span>
              <span className="text-xs text-red-600">
                异常 {order.inspections.filter(i => i.result === '异常').length}
              </span>
              <span className="text-xs text-amber-600">
                待复查 {order.inspections.filter(i => i.result === '待复查').length}
              </span>
            </div>
          </div>

          {Object.entries(groupedInspections).map(([category, items]) => (
            <div key={category} className="border-b border-slate-100 last:border-b-0">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50"
              >
                <span className="font-medium text-slate-700">{category}</span>
                {expandedCategories.includes(category) ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {expandedCategories.includes(category) && (
                <div className="px-4 pb-3 space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-b-0">
                      <span className="text-sm text-slate-600">{item.name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        item.result === '正常' ? 'bg-emerald-100 text-emerald-700' :
                        item.result === '异常' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {item.result}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {order.photos.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Camera className="w-5 h-5 text-purple-600" />
              现场照片 ({order.photos.length})
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {order.photos.map(photo => (
                <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                  {photo.url ? (
                    <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Camera className="w-6 h-6" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            巡检结论
          </h3>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">
            {order.conclusion || '暂无结论'}
          </p>
          {order.signature && (
            <p className="text-sm text-slate-500 mt-3 pt-3 border-t border-slate-100">
              巡检员签名：{order.signature}
            </p>
          )}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 safe-area-bottom">
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm"
          >
            返回列表
          </button>
          {isAdmin ? (
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              {exporting ? '导出中...' : '导出PDF'}
            </button>
          ) : (
            <button
              onClick={() => navigate(`/edit/${order.id}`)}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              编辑工单
            </button>
          )}
        </div>
      </div>
    </div>
  );
}