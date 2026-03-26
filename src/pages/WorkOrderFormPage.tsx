import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Camera, X, Check, ChevronRight,
  AlertTriangle, FileText, MapPin, Send, User, Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  weatherOptions, photoConfig, type InspectionItem,
  type PhotoAttachment, type Weather, type InspectionResult
} from '../types/inspectionOrder';
import { createInspectionOrder, updateInspectionOrder, getInspectionOrderById } from '../utils/inspectionService';
import { testUsers } from '../types/inspectionOrder';

type AdminFormStep = 'basic' | 'station' | 'assign' | 'send';
type InspectorFormStep = 'inspection' | 'photos' | 'conclusion';

export default function WorkOrderFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const isEdit = !!id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 如果巡检员访问 /create（没有id），重定向到首页
  useEffect(() => {
    if (!isAdmin && !isEdit) {
      alert('巡检员无法创建工单，请联系管理员派发工单');
      navigate('/');
    }
  }, [isAdmin, isEdit, navigate]);

  // 管理员表单步骤
  const [adminStep, setAdminStep] = useState<AdminFormStep>('basic');
  // 巡检员表单步骤
  const [inspectorStep, setInspectorStep] = useState<InspectorFormStep>('inspection');

  // 基础信息
  const [basicData, setBasicData] = useState({
    projectName: '',
    inspectionDate: new Date().toISOString().slice(0, 10),
    weather: '晴' as Weather
  });

  // 电站信息
  const [stationData, setStationData] = useState({
    inverterNo: '',
    farmerName: '',
    farmerPhone: '',
    address: '',
    installedCapacity: '',
    gridConnectionDate: ''
  });

  // 指派信息
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('medium');

  // 巡检信息
  const [inspections, setInspections] = useState<InspectionItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('光伏组件');
  const [photos, setPhotos] = useState<PhotoAttachment[]>([]);
  const [conclusion, setConclusion] = useState('');
  const [signature, setSignature] = useState('');
  const [activePhotoSlot, setActivePhotoSlot] = useState<string | null>(null);
  const [photoDescription, setPhotoDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 获取巡检员列表
  const inspectors = testUsers.filter(u => u.role === 'inspector' && u.status === 'active');

  // 巡检类别（从localStorage加载或默认）
  const [inspectionCategories, setInspectionCategories] = useState<Record<string, string[]>>({});

  useEffect(() => {
    // 加载巡检类别
    // 优先从对象格式加载（inspection_categories_obj），兼容数组格式（inspection_categories）
    const loadCategories = () => {
      // 默认类别
      const defaultCategories: Record<string, string[]> = {
        '光伏组件': ['组件表面清洁度', '组件有无破损', '组件隐裂检测', '组件连接线紧固', '组件接地可靠', '组件朝向角度'],
        '支架': ['支架整体稳固', '支架防腐处理', '支架垂直度', '支架连接件紧固', '支架接地可靠'],
        '逆变器': ['逆变器运行状态', '逆变器输入电压', '逆变器输出功率', '逆变器温度', '逆变器风扇运转'],
        '配电箱': ['配电箱门锁完好', '配电箱防水密封', '配电箱内部清洁', '断路器状态', '漏电保护器'],
        '接地防雷': ['接地电阻测试', '接地线完好', '避雷针安装', '防雷模块状态'],
        '采集装置': ['数据采集器运行', '通讯模块状态', '传感器校准', '电缆接头密封']
      };

      // 优先尝试对象格式
      const storedObj = localStorage.getItem('inspection_categories_obj');
      if (storedObj) {
        try {
          const parsed = JSON.parse(storedObj);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            setInspectionCategories(parsed);
            return;
          }
        } catch (e) {
          console.error('解析巡检类别对象格式失败:', e);
        }
      }

      // 尝试数组格式并转换
      const storedArr = localStorage.getItem('inspection_categories');
      if (storedArr) {
        try {
          const parsed = JSON.parse(storedArr);
          if (Array.isArray(parsed)) {
            // 转换为对象格式
            const objectFormat: Record<string, string[]> = {};
            parsed.forEach((item: { name: string; items: string[] }) => {
              objectFormat[item.name] = item.items;
            });
            setInspectionCategories(objectFormat);
            // 同步保存对象格式
            localStorage.setItem('inspection_categories_obj', JSON.stringify(objectFormat));
            return;
          }
        } catch (e) {
          console.error('解析巡检类别数组格式失败:', e);
        }
      }

      // 使用默认类别
      setInspectionCategories(defaultCategories);
      localStorage.setItem('inspection_categories_obj', JSON.stringify(defaultCategories));
    };

    loadCategories();

    // 编辑模式加载数据
    if (isEdit && id) {
      loadOrder(id);
    }
  }, [id]);

  const loadOrder = async (orderId: string) => {
    setLoading(true);
    const order = await getInspectionOrderById(orderId);
    if (order) {
      // 根据是否是巡检员来设置数据
      setBasicData({
        projectName: order.projectName,
        inspectionDate: order.inspectionDate,
        weather: order.weather
      });
      setStationData({
        inverterNo: order.inverterNo,
        farmerName: order.farmerName,
        farmerPhone: order.farmerPhone || '',
        address: order.address,
        installedCapacity: order.installedCapacity || '',
        gridConnectionDate: order.gridConnectionDate || ''
      });
      setAssignedTo(order.assignedTo || '');
      setPriority(order.priority);
      setInspections(order.inspections);
      setPhotos(order.photos);
      setConclusion(order.conclusion);
      setSignature(order.signature || '');
    } else {
      navigate('/');
    }
    setLoading(false);
  };

  // 管理员步骤
  const adminSteps: { key: AdminFormStep; label: string; icon: React.ReactNode }[] = [
    { key: 'basic', label: '基础', icon: <FileText className="w-4 h-4" /> },
    { key: 'station', label: '电站', icon: <MapPin className="w-4 h-4" /> },
    { key: 'assign', label: '指派', icon: <User className="w-4 h-4" /> },
    { key: 'send', label: '发送', icon: <Send className="w-4 h-4" /> }
  ];

  // 巡检员步骤
  const inspectorSteps: { key: InspectorFormStep; label: string; icon: React.ReactNode }[] = [
    { key: 'inspection', label: '巡检', icon: <Check className="w-4 h-4" /> },
    { key: 'photos', label: '照片', icon: <Camera className="w-4 h-4" /> },
    { key: 'conclusion', label: '结论', icon: <AlertTriangle className="w-4 h-4" /> }
  ];

  const currentAdminStepIndex = adminSteps.findIndex(s => s.key === adminStep);
  const currentInspectorStepIndex = inspectorSteps.findIndex(s => s.key === inspectorStep);

  // 初始化巡检项
  const initInspections = () => {
    const items: InspectionItem[] = [];
    let id = 1;
    Object.entries(inspectionCategories).forEach(([category, itemsList]) => {
      itemsList.forEach(itemName => {
        items.push({
          id: `insp_${id++}`,
          category,
          name: itemName,
          result: '正常' as InspectionResult,
          description: ''
        });
      });
    });
    return items;
  };

  const updateInspection = (itemId: string, updates: Partial<InspectionItem>) => {
    setInspections(prev => prev.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    ));
  };

  const handlePhotoCapture = (photoId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setPhotos(prev => {
        const existingIndex = prev.findIndex(p => p.id === photoId);
        const newPhoto: PhotoAttachment = {
          id: photoId,
          name: photoConfig.find(p => p.id === photoId)?.name || '照片',
          url,
          description: photoDescription || ''
        };
        if (existingIndex >= 0) {
          const newPhotos = [...prev];
          newPhotos[existingIndex] = newPhoto;
          return newPhotos;
        }
        return [...prev, newPhoto];
      });
      setActivePhotoSlot(null);
      setPhotoDescription('');
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  // 管理员保存（创建工单）
  const handleAdminSave = async () => {
    if (!basicData.projectName || !stationData.inverterNo || !stationData.farmerName || !stationData.address || !assignedTo) {
      alert('请填写完整信息');
      return;
    }

    setSaving(true);
    try {
      // 初始化巡检项
      const initialInspections = initInspections();

      const orderData = {
        ...basicData,
        ...stationData,
        inspections: initialInspections,
        photos: [],
        conclusion: '',
        signature: '',
        status: 'processing' as const,
        assignedTo,
        inspector: assignedTo,
        inspectorPhone: '',
        priority,
        createdBy: user?.username || ''
      };

      await createInspectionOrder(orderData);
      alert('工单已发送给巡检员！');
      navigate('/');
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    }
    setSaving(false);
  };

  // 巡检员保存（填写巡检内容）
  const handleInspectorSave = async () => {
    if (!id) return;

    // 检查必填照片
    const requiredPhotos = photoConfig.filter(p => p.required).map(p => p.id);
    const hasRequired = requiredPhotos.every(pid => photos.some(p => p.id === pid));
    if (!hasRequired) {
      alert('请上传所有必填照片');
      return;
    }

    setSaving(true);
    try {
      await updateInspectionOrder(id, {
        inspections,
        photos,
        conclusion,
        signature,
        status: 'completed'
      });
      alert('巡检完成！工单已提交。');
      navigate('/');
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    }
    setSaving(false);
  };

  // 发送提醒
  const handleSendReminder = async () => {
    alert(`工单提醒已发送给：${assignedTo}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 判断是管理员创建还是巡检员填写
  // 管理员：新建工单(/create)显示管理员流程
  // 管理员编辑 或 巡检员填写 都显示巡检员流程（巡检→照片→结论）
  const isAdminCreating = isAdmin && !isEdit;
  // 任何人在编辑模式下都显示巡检员流程
  const isFilling = isEdit;

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      {/* 头部 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/')} className="p-2 -ml-2 hover:bg-slate-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <h1 className="font-semibold text-slate-800">
                {isAdminCreating ? '新建工单' : '填写巡检工单'}
              </h1>
            </div>
          </div>

          {/* 步骤指示器 */}
          <div className="flex items-center justify-between mt-4 -mb-1">
            {isAdminCreating ? (
              // 管理员新建工单流程
              adminSteps.map((step, index) => (
                <button
                  key={step.key}
                  onClick={() => setAdminStep(step.key)}
                  className={`flex flex-col items-center gap-1 ${
                    index <= currentAdminStepIndex ? 'text-blue-600' : 'text-slate-400'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index < currentAdminStepIndex ? 'bg-blue-600 text-white' :
                    index === currentAdminStepIndex ? 'bg-blue-100 text-blue-600 border-2 border-blue-600' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {index < currentAdminStepIndex ? <Check className="w-4 h-4" /> : step.icon}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{step.label}</span>
                </button>
              ))
            ) : (
              // 巡检员流程（编辑模式下所有人都是巡检员流程）
              inspectorSteps.map((step, index) => (
                <button
                  key={step.key}
                  onClick={() => setInspectorStep(step.key)}
                  className={`flex flex-col items-center gap-1 ${
                    index <= currentInspectorStepIndex ? 'text-blue-600' : 'text-slate-400'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index < currentInspectorStepIndex ? 'bg-blue-600 text-white' :
                    index === currentInspectorStepIndex ? 'bg-blue-100 text-blue-600 border-2 border-blue-600' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {index < currentInspectorStepIndex ? <Check className="w-4 h-4" /> : step.icon}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{step.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </header>

      <main className="px-4 py-4">
        {/* ========== 管理员流程 ========== */}
        {isAdminCreating && (
          <>
            {/* Step 1: 基础信息 */}
            {adminStep === 'basic' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                  <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    基础信息
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        项目名称 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={basicData.projectName}
                        onChange={(e) => setBasicData(prev => ({ ...prev, projectName: e.target.value }))}
                        placeholder="如：山东分布式光伏发电项目"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          巡检日期
                        </label>
                        <input
                          type="date"
                          value={basicData.inspectionDate}
                          onChange={(e) => setBasicData(prev => ({ ...prev, inspectionDate: e.target.value }))}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">天气</label>
                        <div className="relative">
                          <select
                            value={basicData.weather}
                            onChange={(e) => setBasicData(prev => ({ ...prev, weather: e.target.value as Weather }))}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                          >
                            {weatherOptions.map(w => (
                              <option key={w} value={w}>{w}</option>
                            ))}
                          </select>
                          <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: 电站信息 */}
            {adminStep === 'station' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                  <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                    电站信息
                  </h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          逆变器编号 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={stationData.inverterNo}
                          onChange={(e) => setStationData(prev => ({ ...prev, inverterNo: e.target.value }))}
                          placeholder="如：INV-A-001"
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">装机容量(kWp)</label>
                        <input
                          type="text"
                          value={stationData.installedCapacity}
                          onChange={(e) => setStationData(prev => ({ ...prev, installedCapacity: e.target.value }))}
                          placeholder="如：30"
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        农户姓名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={stationData.farmerName}
                        onChange={(e) => setStationData(prev => ({ ...prev, farmerName: e.target.value }))}
                        placeholder="请输入农户姓名"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">农户电话</label>
                      <input
                        type="tel"
                        value={stationData.farmerPhone}
                        onChange={(e) => setStationData(prev => ({ ...prev, farmerPhone: e.target.value }))}
                        placeholder="请输入农户联系电话"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        地址 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={stationData.address}
                        onChange={(e) => setStationData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="请输入详细地址"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">并网日期</label>
                      <input
                        type="date"
                        value={stationData.gridConnectionDate}
                        onChange={(e) => setStationData(prev => ({ ...prev, gridConnectionDate: e.target.value }))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: 指派巡检人员 */}
            {adminStep === 'assign' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                  <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    指派巡检人员
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        选择巡检员 <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {inspectors.map(inspector => (
                          <button
                            key={inspector.id}
                            onClick={() => setAssignedTo(inspector.displayName)}
                            className={`p-4 rounded-xl border-2 transition-colors text-left ${
                              assignedTo === inspector.displayName
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-slate-200 hover:border-blue-300'
                            }`}
                          >
                            <p className="font-medium text-slate-800">{inspector.displayName}</p>
                            <p className="text-xs text-slate-500 mt-1">{inspector.phone}</p>
                            {inspector.area && (
                              <p className="text-xs text-blue-600 mt-1">{inspector.area}</p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">优先级</label>
                      <div className="flex gap-2">
                        {(['urgent', 'high', 'medium', 'low'] as const).map(p => (
                          <button
                            key={p}
                            onClick={() => setPriority(p)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                              priority === p
                                ? p === 'urgent' ? 'bg-red-100 text-red-700 border-2 border-red-500'
                                : p === 'high' ? 'bg-orange-100 text-orange-700 border-2 border-orange-500'
                                : p === 'medium' ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-500'
                                : 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {p === 'urgent' ? '紧急' : p === 'high' ? '高' : p === 'medium' ? '中' : '低'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: 发送工单 */}
            {adminStep === 'send' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                  <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Send className="w-5 h-5 text-blue-600" />
                    确认并发送工单
                  </h2>

                  <div className="bg-slate-50 rounded-xl p-4 space-y-3 mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-500">项目名称</span>
                      <span className="text-slate-800 font-medium">{basicData.projectName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">巡检日期</span>
                      <span className="text-slate-800">{basicData.inspectionDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">逆变器编号</span>
                      <span className="text-slate-800">{stationData.inverterNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">农户</span>
                      <span className="text-slate-800">{stationData.farmerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">指派给</span>
                      <span className="text-blue-600 font-medium">{assignedTo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">优先级</span>
                      <span className={`font-medium ${
                        priority === 'urgent' ? 'text-red-600' :
                        priority === 'high' ? 'text-orange-600' :
                        priority === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                      }`}>
                        {priority === 'urgent' ? '紧急' : priority === 'high' ? '高' : priority === 'medium' ? '中' : '低'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleSendReminder}
                    className="w-full py-3 bg-amber-100 text-amber-700 rounded-xl font-medium flex items-center justify-center gap-2 mb-3"
                  >
                    <Bell className="w-5 h-5" />
                    发送工单提醒
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ========== 巡检员填写流程 ========== */}
        {isFilling && (
          <>
            {/* Step 1: 巡检项 */}
            {inspectorStep === 'inspection' && (
              <div className="space-y-4">
                {/* 基础信息展示 */}
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="font-medium text-blue-800">{basicData.projectName}</h3>
                  <p className="text-sm text-blue-600 mt-1">
                    {stationData.farmerName} | {stationData.address}
                  </p>
                </div>

                {/* 类别选择 */}
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                  {Object.keys(inspectionCategories).map(category => (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        activeCategory === category
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                {/* 巡检项列表 */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-100">
                  {(inspectionCategories[activeCategory] || []).map((itemName, index) => {
                    const item = inspections.find(
                      i => i.category === activeCategory && i.name === itemName
                    ) || { id: `new_${index}`, category: activeCategory, name: itemName, result: '正常' as InspectionResult, description: '' };

                    return (
                      <div key={item.id} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700">{itemName}</span>
                          <div className="flex gap-1">
                            {(['正常', '异常', '待复查'] as InspectionResult[]).map(result => (
                              <button
                                key={result}
                                onClick={() => {
                                  // 确保巡检项存在
                                  let existingItem = inspections.find(
                                    i => i.category === activeCategory && i.name === itemName
                                  );
                                  if (!existingItem) {
                                    const newItem: InspectionItem = {
                                      id: `insp_${Date.now()}_${index}`,
                                      category: activeCategory,
                                      name: itemName,
                                      result: '正常',
                                      description: ''
                                    };
                                    setInspections(prev => [...prev, newItem]);
                                    existingItem = newItem;
                                  }
                                  updateInspection(existingItem.id, { result });
                                }}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                  item.result === result
                                    ? result === '正常' ? 'bg-emerald-100 text-emerald-700'
                                      : result === '异常' ? 'bg-red-100 text-red-700'
                                      : 'bg-amber-100 text-amber-700'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {result}
                              </button>
                            ))}
                          </div>
                        </div>
                        {item.result === '异常' && (
                          <textarea
                            value={item.description || ''}
                            onChange={(e) => {
                              let existingItem = inspections.find(
                                i => i.category === activeCategory && i.name === itemName
                              );
                              if (existingItem) {
                                updateInspection(existingItem.id, { description: e.target.value });
                              }
                            }}
                            placeholder="请描述异常情况..."
                            rows={2}
                            className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none mt-2"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: 照片 */}
            {inspectorStep === 'photos' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                  <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-amber-600" />
                    现场照片
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {photoConfig.map(photo => {
                      const existingPhoto = photos.find(p => p.id === photo.id);

                      return (
                        <div
                          key={photo.id}
                          className={`relative aspect-square rounded-xl border-2 border-dashed overflow-hidden ${
                            existingPhoto ? 'border-emerald-400' : 'border-slate-200'
                          }`}
                          onClick={() => !existingPhoto && setActivePhotoSlot(photo.id)}
                        >
                          {existingPhoto ? (
                            <>
                              <img
                                src={existingPhoto.url}
                                alt={existingPhoto.name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                              <div className="absolute bottom-2 left-2 right-2">
                                <p className="text-white text-xs font-medium truncate">{existingPhoto.name}</p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removePhoto(photo.id);
                                }}
                                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <div className="absolute top-2 left-2">
                                <span className="px-1.5 py-0.5 bg-emerald-500 text-white rounded text-xs">
                                  <Check className="w-3 h-3 inline" />
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                              <Camera className="w-8 h-8 mb-2" />
                              <p className="text-xs text-center px-2">{photo.name}</p>
                              {photo.required && (
                                <span className="text-red-500 text-xs mt-1">必填</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: 结论 */}
            {inspectorStep === 'conclusion' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                  <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    巡检结论
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">巡检结论</label>
                      <textarea
                        value={conclusion}
                        onChange={(e) => setConclusion(e.target.value)}
                        placeholder="请输入巡检结论和建议..."
                        rows={4}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">巡检员签名</label>
                      <input
                        type="text"
                        value={signature}
                        onChange={(e) => setSignature(e.target.value)}
                        placeholder="请输入巡检员签名（姓名）"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 巡检统计 */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">巡检统计</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-emerald-50 rounded-xl">
                      <p className="text-2xl font-bold text-emerald-600">
                        {inspections.filter(i => i.result === '正常').length}
                      </p>
                      <p className="text-xs text-emerald-600">正常</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-xl">
                      <p className="text-2xl font-bold text-red-600">
                        {inspections.filter(i => i.result === '异常').length}
                      </p>
                      <p className="text-xs text-red-600">异常</p>
                    </div>
                    <div className="text-center p-3 bg-amber-50 rounded-xl">
                      <p className="text-2xl font-bold text-amber-600">
                        {inspections.filter(i => i.result === '待复查').length}
                      </p>
                      <p className="text-xs text-amber-600">待复查</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 safe-area-bottom">
        <div className="flex gap-3">
          {/* 管理员流程按钮 */}
          {isAdminCreating && (
            <>
              {currentAdminStepIndex > 0 && (
                <button
                  onClick={() => setAdminStep(adminSteps[currentAdminStepIndex - 1].key)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm"
                >
                  上一步
                </button>
              )}
              {adminStep !== 'send' ? (
                <button
                  onClick={() => setAdminStep(adminSteps[currentAdminStepIndex + 1].key)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium text-sm"
                >
                  下一步
                </button>
              ) : (
                <button
                  onClick={handleAdminSave}
                  disabled={saving || !assignedTo}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium text-sm disabled:opacity-50"
                >
                  {saving ? '发送中...' : '发送工单'}
                </button>
              )}
            </>
          )}

          {/* 巡检员流程按钮 */}
          {isFilling && (
            <>
              {currentInspectorStepIndex > 0 && (
                <button
                  onClick={() => setInspectorStep(inspectorSteps[currentInspectorStepIndex - 1].key)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm"
                >
                  上一步
                </button>
              )}
              {inspectorStep !== 'conclusion' ? (
                <button
                  onClick={() => setInspectorStep(inspectorSteps[currentInspectorStepIndex + 1].key)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium text-sm"
                >
                  下一步
                </button>
              ) : (
                <button
                  onClick={handleInspectorSave}
                  disabled={saving}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium text-sm disabled:opacity-50"
                >
                  {saving ? '提交中...' : '提交巡检'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 照片上传弹窗 */}
      {activePhotoSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">
                {photoConfig.find(p => p.id === activePhotoSlot)?.name}
              </h3>
              <button onClick={() => setActivePhotoSlot(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">图片描述（选填）</label>
              <input
                type="text"
                value={photoDescription}
                onChange={(e) => setPhotoDescription(e.target.value)}
                placeholder="请输入图片描述..."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex gap-3">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoCapture(activePhotoSlot, file);
                }}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                拍照/选择照片
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
