import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, Search, User, MapPin,
  RefreshCw, X, Check, Trash2, Users, FileDown,
  Upload, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { uploadToCloudStorage } from '../utils/cloudStorage';
import { statusConfig, priorityConfig, type InspectionOrder } from '../types/inspectionOrder';
import { getInspectionOrders, assignOrder, deleteInspectionOrder, createInspectionOrder } from '../utils/inspectionService';
import { exportOrderToPDF } from '../utils/pdfExport';

export default function AdminOrdersPage() {
  const navigate = useNavigate();
  const { isAdmin, getUsers } = useAuth();
  const [orders, setOrders] = useState<InspectionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [areas, setAreas] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<InspectionOrder | null>(null);
  const [selectedInspector, setSelectedInspector] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchAction, setBatchAction] = useState<'assign' | 'delete' | 'export'>('assign');
  const [showBatchToolbar, setShowBatchToolbar] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);

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
    // 提取唯一地区列表
    const uniqueAreas = [...new Set(data.map(order => {
      // 从地址中提取地区，格式如 "山东省济南市历下区..." -> "历下区"
      const addr = order.address;
      if (!addr) return '';
      // 匹配省市区/县
      const match = addr.match(/(?:省|自治区)(?:.*?(?:市|区|县))/);
      if (match) {
        const part = match[0];
        // 提取最后的区/县名
        const areaMatch = part.match(/(?:市|区|县)([^市、区、县]+)(?:市|区|县)?$/);
        if (areaMatch) return areaMatch[1];
        // 如果没有找到，尝试直接提取
        const lastMatch = part.match(/(.+?)(?:市|区|县)$/);
        if (lastMatch) return lastMatch[1];
      }
      // 简单取地址前8个字符作为地区标识
      return addr.slice(0, 8);
    }))].filter(Boolean).sort();
    setAreas(uniqueAreas);
    setLoading(false);
  };

  const inspectors = getUsers().filter(u => u.role === 'inspector' && u.status === 'active');

  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchKeyword === '' ||
      order.orderNo.includes(searchKeyword) ||
      order.projectName.includes(searchKeyword) ||
      order.farmerName.includes(searchKeyword) ||
      order.inspector.includes(searchKeyword) ||
      order.inverterNo.includes(searchKeyword) ||
      (order.assignedTo && order.assignedTo.includes(searchKeyword));
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    // 地区筛选
    const matchesArea = filterArea === 'all' || (order.address && order.address.includes(filterArea));
    // 日期筛选（仅在已完成状态下生效）
    const matchesDate = filterStatus !== 'completed' || filterDate === '' ||
      (order.completedAt && order.completedAt.startsWith(filterDate));
    return matchesSearch && matchesStatus && matchesArea && matchesDate;
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

  // 批量指派
  const openBatchAssignModal = () => {
    setBatchAction('assign');
    setSelectedInspector('');
    setShowBatchModal(true);
  };

  const handleBatchAssign = async () => {
    if (!selectedInspector) return;
    for (const id of selectedIds) {
      await assignOrder(id, selectedInspector);
    }
    setShowBatchModal(false);
    setSelectedIds(new Set());
    setShowBatchToolbar(false);
    loadOrders();
  };

  // 批量导出PDF
  const handleBatchExportPDF = async () => {
    const selectedOrders = filteredOrders.filter(o => selectedIds.has(o.id));
    let successCount = 0;
    let failCount = 0;
    for (const order of selectedOrders) {
      try {
        const result = await exportOrderToPDF(order);
        if (result.success) successCount++;
        else failCount++;
      } catch (e) {
        failCount++;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    setSelectedIds(new Set());
    setShowBatchToolbar(false);
    alert(`批量导出完成：成功 ${successCount} 条${failCount > 0 ? `，失败 ${failCount} 条` : ''}`);
  };

  // 导出所有工单到Excel文件
  const handleExportOrders = async () => {
    const exportData = filteredOrders.map(order => {
      // 将巡检项转换为字符串
      const inspectionsStr = order.inspections?.map((item: any) =>
        `${item.itemName}: ${item.result || '未填写'}`
      ).join('; ') || '';
      return {
        '工单号': order.orderNo,
        '项目名称': order.projectName,
        '巡检日期': order.inspectionDate,
        '巡检员': order.inspector,
        '巡检员电话': order.inspectorPhone,
        '天气': order.weather,
        '逆变器编号': order.inverterNo,
        '农户姓名': order.farmerName,
        '农户电话': order.farmerPhone,
        '地址': order.address,
        '装机容量': order.installedCapacity,
        '并网日期': order.gridConnectionDate,
        '巡检项目': inspectionsStr,
        '结论': order.conclusion,
        '状态': statusConfig[order.status as keyof typeof statusConfig]?.label || order.status,
        '优先级': priorityConfig[order.priority as keyof typeof priorityConfig]?.label || order.priority,
        '指派给': order.assignedTo || '',
        '创建人': order.createdBy,
      };
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '工单列表');
    // 设置列宽
    ws['!cols'] = [
      { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
      { wch: 6 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 30 },
      { wch: 12 }, { wch: 12 }, { wch: 40 }, { wch: 20 },
      { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 8 }
    ];

    const fileName = `工单导出_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // 尝试上传到云存储
    const cloudPath = `exports/excel/${new Date().toISOString().slice(0, 10)}/${fileName}`;
    const uploadResult = await uploadToCloudStorage(cloudPath, blob);

    if (uploadResult?.tempFileURL) {
      // 云存储上传成功，使用云端链接下载
      const link = document.createElement('a');
      link.href = uploadResult.tempFileURL;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert(`导出成功！文件已保存到云存储：${fileName}`);
    } else {
      // 云存储不可用，回退到本地下载
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // 导入工单
  const handleImportOrders = async (file: File) => {
    setImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];

      if (!Array.isArray(jsonData) || jsonData.length === 0) {
        alert('导入失败：文件格式错误或没有数据');
        setImporting(false);
        return;
      }

      let successCount = 0;
      let failCount = 0;
      for (const row of jsonData) {
        try {
          // 解析巡检项目（从字符串还原为对象数组）
          const inspectionsStr = row['巡检项目'] || '';
          const inspections: any[] = [];
          if (inspectionsStr) {
            const items = inspectionsStr.split(';');
            for (const item of items) {
              const match = item.match(/^(.+?):\s*(.+)$/);
              if (match) {
                inspections.push({
                  id: `import_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                  itemName: match[1].trim(),
                  result: match[2].trim(),
                });
              }
            }
          }

          // 状态映射
          const statusMap: Record<string, string> = {
            '待派单': 'pending', '待巡检': 'processing', '已完成': 'completed', '已关闭': 'closed'
          };
          const priorityMap: Record<string, string> = {
            '高': 'high', '中': 'medium', '低': 'low'
          };

          const newOrder = {
            projectName: row['项目名称'] || row['projectName'] || '',
            inspectionDate: row['巡检日期'] || row['inspectionDate'] || new Date().toISOString().slice(0, 10),
            inspector: row['巡检员'] || row['inspector'] || '',
            inspectorPhone: row['巡检员电话'] || row['inspectorPhone'] || '',
            weather: row['天气'] || row['weather'] || '晴',
            inverterNo: row['逆变器编号'] || row['inverterNo'] || '',
            farmerName: row['农户姓名'] || row['farmerName'] || '',
            farmerPhone: row['农户电话'] || row['farmerPhone'] || '',
            address: row['地址'] || row['address'] || '',
            installedCapacity: row['装机容量'] || row['installedCapacity'] || '',
            gridConnectionDate: row['并网日期'] || row['gridConnectionDate'] || '',
            inspections: inspections,
            photos: [],
            conclusion: row['结论'] || row['conclusion'] || '',
            signature: '',
            status: (statusMap[row['状态'] || row['status']] || 'pending') as 'pending' | 'processing' | 'completed' | 'closed',
            assignedTo: row['指派给'] || row['assignedTo'] || '',
            priority: (priorityMap[row['优先级'] || row['priority']] || 'medium') as 'high' | 'medium' | 'low',
            createdBy: row['创建人'] || row['createdBy'] || 'admin'
          };
          await createInspectionOrder(newOrder);
          successCount++;
        } catch (e) {
          console.error('导入单条工单失败:', e);
          failCount++;
        }
      }
      alert(`导入完成：成功 ${successCount} 条，失败 ${failCount} 条`);
      setShowImportModal(false);
      loadOrders();
    } catch (e) {
      alert('导入失败：文件解析错误');
      console.error('导入失败:', e);
    }
    setImporting(false);
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
            <div className="flex items-center gap-2">
              {/* 地区筛选 - 移动端优化 */}
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none min-w-[80px]"
              >
                <option value="all">地区</option>
                {areas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
              {/* 导出按钮 */}
              <button
                onClick={handleExportOrders}
                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg active:bg-emerald-100"
                title="导出工单"
              >
                <Download className="w-5 h-5" />
              </button>
              {/* 导入按钮 */}
              <button
                onClick={() => setShowImportModal(true)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg active:bg-blue-100"
                title="导入工单"
              >
                <Upload className="w-5 h-5" />
              </button>
              <button onClick={loadOrders} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg active:bg-slate-200">
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 搜索和筛选 - 移动端优化 */}
      <div className="px-4 py-3 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索工单..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        {/* 筛选栏：状态 + 地区 */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {['all', 'pending', 'processing', 'completed', 'closed'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap active:scale-95 transition-transform ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {status === 'all' ? '全部' : statusConfig[status as keyof typeof statusConfig]?.label || status}
            </button>
          ))}
        </div>
        {/* 日期筛选器 - 仅在已完成状态下显示 */}
        {filterStatus === 'completed' && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
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

      {/* 批量操作工具栏 - 移动端优化 */}
      {showBatchToolbar && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 shadow-lg">
          <div className="px-4 py-2 flex items-center justify-between">
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
              <button
                onClick={handleBatchDelete}
                className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-medium"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">删除</span>
              </button>
              <button
                onClick={openBatchAssignModal}
                className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">指派</span>
              </button>
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
      <main className={`px-4 pb-24 space-y-3 ${showBatchToolbar ? 'pt-3' : ''}`}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>暂无工单</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 flex items-center gap-3">
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
                  <div key={order.id} className={`bg-white rounded-xl shadow-sm border p-3 ${isSelected ? 'border-blue-400 ring-1 ring-blue-100' : 'border-slate-100'}`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(order.id)}
                        className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="font-mono text-xs text-blue-600 font-medium">{order.orderNo}</p>
                            <h3 className="font-semibold text-slate-800 text-sm mt-0.5 truncate">{order.projectName}</h3>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${priority.bgColor} ${priority.color}`}>
                              {priority.label}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${status.bgColor} ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-500 mb-3">
                          <div className="flex items-center gap-1 truncate">
                            <User className="w-3 h-3 shrink-0" />
                            <span className="truncate">{order.inspector || '-'}</span>
                          </div>
                          <div className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{order.farmerName || '-'}</span>
                          </div>
                          {order.assignedTo && (
                            <div className="flex items-center gap-1 col-span-2 text-blue-600 truncate">
                              <User className="w-3 h-3 shrink-0" />
                              <span className="truncate">→ {order.assignedTo}</span>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => navigate(`/detail/${order.id}`)}
                            className="py-2.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium active:bg-slate-200"
                          >
                            详情
                          </button>
                          <button
                            onClick={() => openAssignModal(order)}
                            className="py-2.5 bg-blue-600 text-white rounded-lg text-xs font-medium active:bg-blue-700"
                          >
                            派单
                          </button>
                          <button
                            onClick={() => handleDelete(order.id)}
                            className="py-2.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium active:bg-red-100"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )
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

      {/* 批量指派弹窗 */}
      {showBatchModal && batchAction === 'assign' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">批量指派巡检员</h3>
              <button onClick={() => setShowBatchModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-600 mb-3">
                将为 <span className="font-medium text-blue-600">{selectedIds.size}</span> 条工单指派巡检员
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
                onClick={() => setShowBatchModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium"
              >
                取消
              </button>
              <button
                onClick={handleBatchAssign}
                disabled={!selectedInspector}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                确认指派
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导入工单弹窗 */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">导入工单</h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-600 mb-4">
                请选择要导入的 Excel 文件
              </p>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors">
                <Upload className="w-8 h-8 text-blue-500 mb-2" />
                <span className="text-sm text-blue-600 font-medium">点击选择文件</span>
                <span className="text-xs text-slate-500 mt-1">支持 .xlsx, .xls 格式</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImportOrders(file);
                  }}
                  disabled={importing}
                />
              </label>
              {importing && (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="ml-2 text-sm text-slate-600">导入中...</span>
                </div>
              )}
              <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                <p className="text-xs text-amber-700">
                  <strong>注意事项：</strong>
                </p>
                <ul className="text-xs text-amber-600 mt-1 list-disc list-inside">
                  <li>导入文件格式为 Excel (.xlsx)</li>
                  <li>导入的工单将创建为新工单</li>
                  <li>建议导入前先导出备份</li>
                </ul>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-200">
              <button
                onClick={() => setShowImportModal(false)}
                className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
