// 光伏电站巡检工单数据模型

export type WorkOrderStatus = 'pending' | 'processing' | 'completed' | 'closed';
export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type Weather = '晴' | '多云' | '阴' | '雨' | '雪' | '雾';
export type InspectionResult = '正常' | '异常' | '待复查';
export type UserRole = 'admin' | 'inspector' | 'viewer';

// 用户模型
export interface User {
  id: string;
  username: string;
  password: string; // 实际项目中应加密存储
  displayName: string;
  role: UserRole;
  phone: string;
  area?: string; // 负责区域
  status: 'active' | 'inactive';
  createdAt: string;
}

// 图片附件
export interface PhotoAttachment {
  id: string;
  name: string; // 图片名称，如"组件航拍图"
  url: string; // Base64 或 URL
  description?: string; // 图片描述
  capturedAt?: string; // 拍摄时间
}

// 巡检项目
export interface InspectionItem {
  id: string;
  category: string; // 类别：光伏组件/支架/逆变器/配电箱/接地防雷/采集装置
  name: string; // 项目名称
  result: InspectionResult;
  description?: string; // 异常描述
}

// 巡检工单
export interface InspectionOrder {
  id: string;
  orderNo: string; // 工单编号

  // 基础信息
  projectName: string; // 项目名称
  inspectionDate: string; // 巡检日期
  inspector: string; // 巡检员
  inspectorPhone: string; // 巡检员电话
  weather: Weather; // 天气

  // 电站信息
  inverterNo: string; // 逆变器编号
  farmerName: string; // 农户姓名
  farmerPhone: string; // 农户电话
  address: string; // 地址
  installedCapacity: string; // 装机容量(kWp)
  gridConnectionDate: string; // 并网日期

  // 巡检项目
  inspections: InspectionItem[];

  // 照片
  photos: PhotoAttachment[];

  // 结论
  conclusion: string; // 巡检结论
  signature: string; // 巡检员签名

  // 状态
  status: WorkOrderStatus;
  assignedTo?: string; // 指派给
  priority: Priority;

  // 时间戳
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  completedAt?: string;
}

// 巡检类别和项目配置
export const inspectionCategories = {
  光伏组件: [
    '组件表面清洁度',
    '组件有无破损',
    '组件隐裂检测',
    '组件连接线紧固',
    '组件接地可靠',
    '组件朝向角度',
    '组件遮挡情况',
    '组件接线盒密封',
    '组件功率输出',
    '组件温度异常',
    '组件PID检测',
    '组件背面检查'
  ],
  支架: [
    '支架整体稳固',
    '支架防腐处理',
    '支架垂直度',
    '支架连接件紧固',
    '支架接地可靠',
    '支架基础无破损',
    '支架锈蚀情况',
    '支架角度调整',
    '支架追踪系统',
    '支架导向机构',
    '支架减速机',
    '支架防腐涂层'
  ],
  逆变器: [
    '逆变器运行状态',
    '逆变器输入电压',
    '逆变器输出功率',
    '逆变器效率',
    '逆变器温度',
    '逆变器风扇运转',
    '逆变器显示面板',
    '逆变器告警记录',
    '逆变器通讯状态',
    '逆变器接地检查',
    '逆变器输入端子',
    '逆变器输出端子',
    '逆变器保护功能'
  ],
  配电箱: [
    '配电箱门锁完好',
    '配电箱防水密封',
    '配电箱内部清洁',
    '断路器状态',
    '浪涌保护器',
    '计量表读数',
    '接线端子紧固',
    '电缆敷设整齐',
    '接地线连接',
    '防雷设施检查',
    '配电箱温度',
    '漏电保护器',
    '配电箱标识'
  ],
  接地与防雷: [
    '接地电阻测试',
    '接地线完好',
    '接地块埋设',
    '避雷针安装',
    '防雷模块状态',
    '等电位连接'
  ],
  采集装置及电缆: [
    '数据采集器运行',
    '通讯模块状态',
    '传感器校准',
    '电缆外观检查',
    '电缆接头密封',
    '光纤通讯状态',
    '电源供电正常',
    '环境监测设备',
    '箱变监控装置'
  ]
};

// 照片配置
export const photoConfig = [
  { id: 'aerial', name: '组件航拍图', required: true },
  { id: 'overall', name: '电站整体照', required: true },
  { id: 'inverter', name: '逆变器照片', required: true },
  { id: 'distribution', name: '配电箱照片', required: false },
  { id: 'meter', name: '电表照片', required: false },
  { id: 'signature', name: '用户签名照', required: true },
  { id: 'other1', name: '其他照片1', required: false },
  { id: 'other2', name: '其他照片2', required: false }
];

// 状态配置
export const statusConfig: Record<WorkOrderStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: '待巡检', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  processing: { label: '巡检中', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  completed: { label: '已完成', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  closed: { label: '已关闭', color: 'text-slate-600', bgColor: 'bg-slate-100' }
};

// 优先级配置
export const priorityConfig: Record<Priority, { label: string; color: string; bgColor: string }> = {
  urgent: { label: '紧急', color: 'text-red-600', bgColor: 'bg-red-50' },
  high: { label: '高', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  medium: { label: '中', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  low: { label: '低', color: 'text-blue-600', bgColor: 'bg-blue-50' }
};

// 天气选项
export const weatherOptions: Weather[] = ['晴', '多云', '阴', '雨', '雪', '雾'];

// 创建空工单
export const createEmptyOrder = (createdBy: string): Omit<InspectionOrder, 'id' | 'orderNo' | 'createdAt' | 'updatedAt'> => {
  const inspections: InspectionItem[] = [];
  let id = 1;

  Object.entries(inspectionCategories).forEach(([category, items]) => {
    items.forEach(itemName => {
      inspections.push({
        id: `insp_${id++}`,
        category,
        name: itemName,
        result: '正常',
        description: ''
      });
    });
  });

  return {
    projectName: '',
    inspectionDate: new Date().toISOString().slice(0, 10),
    inspector: '',
    inspectorPhone: '',
    weather: '晴',
    inverterNo: '',
    farmerName: '',
    farmerPhone: '',
    address: '',
    installedCapacity: '',
    gridConnectionDate: '',
    inspections,
    photos: [],
    conclusion: '',
    signature: '',
    status: 'pending',
    priority: 'medium',
    createdBy
  };
};

// 测试账号
export const testUsers: User[] = [
  { id: '1', username: 'admin', password: '123456', displayName: '管理员', role: 'admin', phone: '13800138000', status: 'active', createdAt: '2026-01-01' },
  { id: '2', username: 'inspector1', password: '123456', displayName: '巡检员张伟', role: 'inspector', phone: '13800138001', area: '华北区域', status: 'active', createdAt: '2026-01-15' },
  { id: '3', username: 'inspector2', password: '123456', displayName: '巡检员李娜', role: 'inspector', phone: '13800138002', area: '华东区域', status: 'active', createdAt: '2026-01-15' },
  { id: '4', username: 'viewer', password: '123456', displayName: '访客', role: 'viewer', phone: '13800138003', status: 'active', createdAt: '2026-02-01' }
];