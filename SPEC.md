# 报警工单管理系统 - 设计规范

## 1. 概念与愿景

一个专业的**报警工单管理系统**，用于光伏电站的故障报警、巡检维护和工单指派。界面简洁高效，支持工单创建、指派、处理、导出 PDF 等完整流程，专为电站运维人员和管理员设计。

## 2. 设计语言

### 美学方向
Professional/Business - 专业商务风格，简洁高效，信息密集度高，适合桌面端和移动端。

### 色彩系统
| Token | Hex | 用途 |
|-------|-----|------|
| primary | #2563EB | 主色调蓝 |
| success | #10B981 | 完成/成功 |
| warning | #F59E0B | 待处理/警告 |
| error | #EF4444 | 紧急/错误 |
| bg | #F1F5F9 | 页面背景 |
| surface | #FFFFFF | 卡片背景 |
| text-primary | #1F2937 | 主文本 |
| text-secondary | #6B7280 | 次文本 |

### 字体
- 主字体: Noto Sans SC
- 数据字体: JetBrains Mono (编号)

## 3. 页面结构

### 页面列表
1. **登录页** - 测试账号登录
2. **工单列表页** - 表格展示，搜索筛选
3. **新建工单页** - 表单填写
4. **编辑工单页** - 表单编辑
5. **工单详情页** - 查看详情，状态更新，PDF导出

### 功能模块
- 工单 CRUD 操作
- 状态流转（待处理→处理中→已完成→已关闭）
- 指派人员管理
- JSON 导入/导出
- PDF 生成导出

## 4. 数据模型

```typescript
interface AlarmOrder {
  id: string;
  alarmNo: string;           // 报警编号 ALM+日期+序号
  alarmTitle: string;        // 报警标题
  alarmType: string;         // 报警类型
  stationName: string;       // 站点名称
  area: string;              // 区域
  alarmLevel: Priority;      // 紧急/高/中/低
  status: WorkOrderStatus;   // 待处理/处理中/已完成/已关闭
  assignee: string;          // 指派人
  assigneePhone?: string;    // 联系电话
  dueDate: string;          // 截止时间
  description: string;      // 详细描述
  attachments: string[];     // 附件
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
```

## 5. 测试账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | 123456 | 管理员 |
| worker | 123456 | 巡检工人 |
| viewer | 123456 | 访客 |

## 6. 技术栈

- React 18 + TypeScript
- Vite
- Tailwind CSS + DaisyUI
- React Router (Hash Mode)
- jsPDF (PDF生成)
- Lucide Icons
