import type { InspectionOrder, WorkOrderStatus } from '../types/inspectionOrder';

const STORAGE_KEY = 'inspection_orders';

// 模拟数据存储
let mockDatabase: InspectionOrder[] = [];

// 初始化模拟数据
function initMockData(): InspectionOrder[] {
  if (mockDatabase.length > 0) return mockDatabase;

  mockDatabase = [
    {
      id: '1',
      orderNo: 'INS202603250001',
      projectName: '济宁分布式光伏发电项目',
      inspectionDate: '2026-03-25',
      inspector: '巡检员张伟',
      inspectorPhone: '13800138001',
      weather: '晴',
      inverterNo: 'INV-A-001',
      farmerName: '王建国',
      farmerPhone: '13905371234',
      address: '山东省济宁市任城区二十里铺镇',
      installedCapacity: '30',
      gridConnectionDate: '2024-06-15',
      inspections: [
        { id: '1', category: '光伏组件', name: '组件表面清洁度', result: '正常', description: '' },
        { id: '2', category: '光伏组件', name: '组件有无破损', result: '异常', description: '发现2块组件有轻微隐裂' },
        { id: '3', category: '逆变器', name: '逆变器运行状态', result: '正常', description: '' },
        { id: '4', category: '配电箱', name: '配电箱门锁完好', result: '正常', description: '' }
      ],
      photos: [
        { id: 'p1', name: '组件航拍图', url: '', description: '整体布局正常' },
        { id: 'p2', name: '逆变器照片', url: '', description: '' }
      ],
      conclusion: '电站整体运行正常，发现组件隐裂问题需要关注',
      signature: '',
      status: 'completed',
      priority: 'medium',
      createdAt: '2026-03-25T08:00:00Z',
      updatedAt: '2026-03-25T10:30:00Z',
      createdBy: 'admin',
      completedAt: '2026-03-25T10:30:00Z'
    },
    {
      id: '2',
      orderNo: 'INS202603250002',
      projectName: '济宁分布式光伏发电项目',
      inspectionDate: '2026-03-25',
      inspector: '巡检员李娜',
      inspectorPhone: '13800138002',
      weather: '多云',
      inverterNo: 'INV-B-003',
      farmerName: '赵大海',
      farmerPhone: '13905372345',
      address: '山东省济宁市兖州区兴隆庄镇',
      installedCapacity: '25',
      gridConnectionDate: '2024-08-20',
      inspections: [],
      photos: [],
      conclusion: '',
      signature: '',
      status: 'pending',
      assignedTo: '巡检员李娜',
      priority: 'high',
      createdAt: '2026-03-25T09:00:00Z',
      updatedAt: '2026-03-25T09:00:00Z',
      createdBy: 'admin'
    }
  ];

  return mockDatabase;
}

// 保存到本地存储
function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mockDatabase));
}

// 从本地存储加载
function loadFromStorage(): InspectionOrder[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    mockDatabase = JSON.parse(stored);
    return mockDatabase;
  }
  initMockData();
  saveToStorage();
  return mockDatabase;
}

// 生成工单编号
export function generateOrderNo(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const count = mockDatabase.length + 1;
  return `INS${dateStr}${String(count).padStart(4, '0')}`;
}

// 获取所有工单
export async function getInspectionOrders(): Promise<InspectionOrder[]> {
  await new Promise(resolve => setTimeout(resolve, 300));
  return loadFromStorage();
}

// 获取单个工单
export async function getInspectionOrderById(id: string): Promise<InspectionOrder | null> {
  await new Promise(resolve => setTimeout(resolve, 100));
  const orders = loadFromStorage();
  return orders.find(o => o.id === id) || null;
}

// 创建工单
export async function createInspectionOrder(
  order: Omit<InspectionOrder, 'id' | 'orderNo' | 'createdAt' | 'updatedAt'>
): Promise<InspectionOrder> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const newOrder: InspectionOrder = {
    ...order,
    id: `insp_${Date.now()}`,
    orderNo: generateOrderNo(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockDatabase = [newOrder, ...mockDatabase];
  saveToStorage();
  return newOrder;
}

// 更新工单
export async function updateInspectionOrder(
  id: string,
  updates: Partial<InspectionOrder>
): Promise<InspectionOrder | null> {
  await new Promise(resolve => setTimeout(resolve, 200));
  const orders = loadFromStorage();

  const index = orders.findIndex(o => o.id === id);
  if (index === -1) return null;

  mockDatabase[index] = {
    ...orders[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  // 如果是完成状态，设置完成时间
  if (updates.status === 'completed' && !mockDatabase[index].completedAt) {
    mockDatabase[index].completedAt = new Date().toISOString();
  }

  saveToStorage();
  return mockDatabase[index];
}

// 删除工单
export async function deleteInspectionOrder(id: string): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 200));
  const orders = loadFromStorage();
  mockDatabase = orders.filter(o => o.id !== id);
  saveToStorage();
  return true;
}

// 更新状态
export async function updateOrderStatus(id: string, status: WorkOrderStatus): Promise<boolean> {
  const result = await updateInspectionOrder(id, { status });
  return !!result;
}

// 指派工单
export async function assignOrder(id: string, assignee: string): Promise<boolean> {
  const result = await updateInspectionOrder(id, {
    assignedTo: assignee,
    status: 'processing'
  });
  return !!result;
}

// 获取统计数据
export function getStats(orders: InspectionOrder[]) {
  return {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    completed: orders.filter(o => o.status === 'completed').length,
    closed: orders.filter(o => o.status === 'closed').length
  };
}