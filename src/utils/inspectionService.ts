import type { InspectionOrder, WorkOrderStatus } from '../types/inspectionOrder';
import { callFunction, FUNCTION_NAME } from './cloudFunction';

const STORAGE_KEY = 'inspection_orders';

// 模拟数据存储（用于本地 fallback）
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

// 转换前端格式到云函数数据格式
function convertOrderToCloudData(order: Partial<InspectionOrder>): Record<string, any> {
  const data: Record<string, any> = {};

  if (order.id) data.id = order.id;
  if (order.orderNo) data.order_no = order.orderNo;
  if (order.projectName !== undefined) data.project_name = order.projectName;
  if (order.inspectionDate !== undefined) data.inspection_date = order.inspectionDate;
  if (order.inspector !== undefined) data.inspector = order.inspector;
  if (order.inspectorPhone !== undefined) data.inspector_phone = order.inspectorPhone;
  if (order.weather !== undefined) data.weather = order.weather;
  if (order.inverterNo !== undefined) data.inverter_no = order.inverterNo;
  if (order.farmerName !== undefined) data.farmer_name = order.farmerName;
  if (order.farmerPhone !== undefined) data.farmer_phone = order.farmerPhone;
  if (order.address !== undefined) data.address = order.address;
  if (order.installedCapacity !== undefined) data.installed_capacity = order.installedCapacity;
  if (order.gridConnectionDate !== undefined) data.grid_connection_date = order.gridConnectionDate;
  if (order.inspections !== undefined) data.inspections = order.inspections;
  if (order.photos !== undefined) data.photos = order.photos;
  if (order.conclusion !== undefined) data.conclusion = order.conclusion;
  if (order.signature !== undefined) data.signature = order.signature;
  if (order.status !== undefined) data.status = order.status;
  if (order.assignedTo !== undefined) data.assigned_to = order.assignedTo;
  if (order.priority !== undefined) data.priority = order.priority;
  if (order.createdBy !== undefined) data.created_by = order.createdBy;
  if (order.completedAt !== undefined) data.completed_at = order.completedAt;

  return data;
}

// 转换云函数数据到前端格式
function convertCloudToOrder(cloudOrder: any): InspectionOrder {
  // MySQL 返回的字段是下划线格式
  return {
    id: cloudOrder.id,
    orderNo: cloudOrder.order_no || '',
    projectName: cloudOrder.project_name || '',
    inspectionDate: cloudOrder.inspection_date ? new Date(cloudOrder.inspection_date).toISOString().slice(0, 10) : '',
    inspector: cloudOrder.inspector || '',
    inspectorPhone: cloudOrder.inspector_phone || '',
    weather: cloudOrder.weather || '晴',
    inverterNo: cloudOrder.inverter_no || '',
    farmerName: cloudOrder.farmer_name || '',
    farmerPhone: cloudOrder.farmer_phone || '',
    address: cloudOrder.address || '',
    installedCapacity: cloudOrder.installed_capacity || '',
    gridConnectionDate: cloudOrder.grid_connection_date || '',
    inspections: cloudOrder.inspections || [],
    photos: cloudOrder.photos || [],
    conclusion: cloudOrder.conclusion || '',
    signature: cloudOrder.signature || '',
    status: cloudOrder.status || 'pending',
    assignedTo: cloudOrder.assigned_to || '',
    priority: cloudOrder.priority || 'medium',
    createdAt: cloudOrder.created_at ? new Date(cloudOrder.created_at).toISOString() : '',
    updatedAt: cloudOrder.updated_at ? new Date(cloudOrder.updated_at).toISOString() : '',
    createdBy: cloudOrder.created_by || '',
    completedAt: cloudOrder.completed_at ? new Date(cloudOrder.completed_at).toISOString() : undefined
  };
}

// 获取所有工单
export async function getInspectionOrders(): Promise<InspectionOrder[]> {
  const result = await callFunction(FUNCTION_NAME, {
    action: 'list',
    data: { page: 1, pageSize: 100 }
  });

  if (result.success && result.data) {
    const orders = (result.data as any[]).map(convertCloudToOrder);
    mockDatabase = orders;
    return orders;
  }

  console.warn('获取工单失败，使用本地存储:', result.error);
  return loadFromStorage();
}

// 获取单个工单
export async function getInspectionOrderById(id: string): Promise<InspectionOrder | null> {
  const result = await callFunction(FUNCTION_NAME, {
    action: 'getById',
    data: { id }
  });

  if (result.success && result.data) {
    return convertCloudToOrder(result.data);
  }

  console.warn('获取工单详情失败，使用本地存储:', result.error);
  const orders = loadFromStorage();
  return orders.find(o => o.id === id) || null;
}

// 创建工单
export async function createInspectionOrder(
  order: Omit<InspectionOrder, 'id' | 'orderNo' | 'createdAt' | 'updatedAt'>
): Promise<InspectionOrder> {
  const newOrder: InspectionOrder = {
    ...order,
    id: `insp_${Date.now()}`,
    orderNo: generateOrderNo(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const cloudData = convertOrderToCloudData(newOrder);

  const result = await callFunction(FUNCTION_NAME, {
    action: 'create',
    data: cloudData
  });

  if (result.success) {
    return newOrder;
  }

  console.warn('创建工单失败，保存到本地存储:', result.error);
  mockDatabase = [newOrder, ...mockDatabase];
  saveToStorage();
  return newOrder;
}

// 更新工单
export async function updateInspectionOrder(
  id: string,
  updates: Partial<InspectionOrder>
): Promise<InspectionOrder | null> {
  const cloudData = convertOrderToCloudData(updates);

  const result = await callFunction(FUNCTION_NAME, {
    action: 'update',
    data: { id, updateData: cloudData }
  });

  if (result.success) {
    return await getInspectionOrderById(id);
  }

  console.warn('更新工单失败，使用本地存储:', result.error);
  const orders = loadFromStorage();
  const index = orders.findIndex(o => o.id === id);
  if (index === -1) return null;

  mockDatabase[index] = {
    ...orders[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  if (updates.status === 'completed' && !mockDatabase[index].completedAt) {
    mockDatabase[index].completedAt = new Date().toISOString();
  }

  saveToStorage();
  return mockDatabase[index];
}

// 删除工单
export async function deleteInspectionOrder(id: string): Promise<boolean> {
  const result = await callFunction(FUNCTION_NAME, {
    action: 'delete',
    data: { id }
  });

  if (result.success) {
    return true;
  }

  console.warn('删除工单失败，使用本地存储:', result.error);
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

// 同步本地数据到云数据库（管理员功能）
export async function syncLocalToCloud(): Promise<{ success: number; failed: number }> {
  const localOrders = loadFromStorage();
  let success = 0;
  let failed = 0;

  for (const order of localOrders) {
    const cloudData = convertOrderToCloudData(order);
    const result = await callFunction(FUNCTION_NAME, {
      action: 'create',
      data: cloudData
    });

    if (result.success) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
}

// 获取用户列表
export async function getUsers(): Promise<any[]> {
  const result = await callFunction(FUNCTION_NAME, {
    action: 'getUsers',
    data: {}
  });

  if (result.success && result.data) {
    return result.data as any[];
  }

  return [];
}

// 获取分类列表
export async function getCategories(): Promise<any[]> {
  const result = await callFunction(FUNCTION_NAME, {
    action: 'getCategories',
    data: {}
  });

  if (result.success && result.data) {
    return result.data as any[];
  }

  return [];
}

// 保存分类列表
export async function saveCategories(categories: any[]): Promise<boolean> {
  const result = await callFunction(FUNCTION_NAME, {
    action: 'saveCategories',
    data: { categories }
  });

  return result.success;
}
