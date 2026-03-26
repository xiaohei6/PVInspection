import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Edit2, X, GripVertical, Settings, ChevronUp, ChevronDown
} from 'lucide-react';

type InspectionCategory = {
  name: string;
  items: string[];
};

export default function AdminInspectionItemsPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<InspectionCategory[]>([]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ category: string; item: string; index: number } | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = () => {
    const stored = localStorage.getItem('inspection_categories');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // 兼容对象格式和数组格式
        if (Array.isArray(parsed)) {
          setCategories(parsed);
        } else if (parsed && typeof parsed === 'object') {
          // 从对象格式转换为数组格式
          const arrayFormat: InspectionCategory[] = Object.entries(parsed).map(([name, items]) => ({
            name,
            items: Array.isArray(items) ? items : []
          }));
          setCategories(arrayFormat);
          // 更新为数组格式存储
          localStorage.setItem('inspection_categories', JSON.stringify(arrayFormat));
        } else {
          setCategories(getDefaultCategories());
        }
      } catch (e) {
        console.error('解析巡检类别失败:', e);
        setCategories(getDefaultCategories());
      }
    } else {
      setCategories(getDefaultCategories());
    }
  };

  const getDefaultCategories = (): InspectionCategory[] => [
    { name: '光伏组件', items: ['组件表面清洁度', '组件有无破损', '组件隐裂检测', '组件连接线紧固', '组件接地可靠', '组件朝向角度'] },
    { name: '支架', items: ['支架整体稳固', '支架防腐处理', '支架垂直度', '支架连接件紧固', '支架接地可靠'] },
    { name: '逆变器', items: ['逆变器运行状态', '逆变器输入电压', '逆变器输出功率', '逆变器温度', '逆变器风扇运转'] },
    { name: '配电箱', items: ['配电箱门锁完好', '配电箱防水密封', '配电箱内部清洁', '断路器状态', '漏电保护器'] },
    { name: '接地防雷', items: ['接地电阻测试', '接地线完好', '避雷针安装', '防雷模块状态'] },
    { name: '采集装置', items: ['数据采集器运行', '通讯模块状态', '传感器校准', '电缆接头密封'] }
  ];

  const saveCategories = (newCategories: InspectionCategory[]) => {
    setCategories(newCategories);
    // 保存为数组格式（供管理页面使用）
    localStorage.setItem('inspection_categories', JSON.stringify(newCategories));
    // 同时保存为对象格式（供 WorkOrderFormPage 使用）
    const objectFormat: Record<string, string[]> = {};
    newCategories.forEach(c => {
      objectFormat[c.name] = c.items;
    });
    localStorage.setItem('inspection_categories_obj', JSON.stringify(objectFormat));
  };

  // 添加类别
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCategories = [...categories, { name: newCategoryName.trim(), items: [] }];
    saveCategories(newCategories);
    setNewCategoryName('');
    setShowAddCategory(false);
  };

  // 删除类别
  const handleDeleteCategory = (name: string) => {
    if (confirm(`确定删除类别"${name}"吗？`)) {
      const newCategories = categories.filter(c => c.name !== name);
      saveCategories(newCategories);
    }
  };

  // 重命名类别
  const handleRenameCategory = (oldName: string, newName: string) => {
    if (!newName.trim()) return;
    const newCategories = categories.map(c =>
      c.name === oldName ? { ...c, name: newName.trim() } : c
    );
    saveCategories(newCategories);
    setEditingCategory(null);
  };

  // 添加巡检项
  const handleAddItem = (categoryName: string) => {
    if (!newItemName.trim()) return;
    const newCategories = categories.map(c =>
      c.name === categoryName
        ? { ...c, items: [...c.items, newItemName.trim()] }
        : c
    );
    saveCategories(newCategories);
    setNewItemName('');
  };

  // 删除巡检项
  const handleDeleteItem = (categoryName: string, index: number) => {
    const newCategories = categories.map(c =>
      c.name === categoryName
        ? { ...c, items: c.items.filter((_, i) => i !== index) }
        : c
    );
    saveCategories(newCategories);
  };

  // 编辑巡检项
  const handleEditItem = (categoryName: string, index: number, newName: string) => {
    if (!newName.trim()) return;
    const newCategories = categories.map(c =>
      c.name === categoryName
        ? { ...c, items: c.items.map((item, i) => i === index ? newName.trim() : item) }
        : c
    );
    saveCategories(newCategories);
    setEditingItem(null);
  };

  // 移动巡检项
  const handleMoveItem = (categoryName: string, index: number, direction: 'up' | 'down') => {
    const category = categories.find(c => c.name === categoryName);
    if (!category) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= category.items.length) return;

    const newItems = [...category.items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];

    const newCategories = categories.map(c =>
      c.name === categoryName ? { ...c, items: newItems } : c
    );
    saveCategories(newCategories);
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
              <h1 className="font-semibold text-slate-800">巡检项管理</h1>
            </div>
            <button
              onClick={() => setShowAddCategory(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              添加类别
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-4">
        <div className="bg-amber-50 rounded-xl p-4 mb-4">
          <p className="text-sm text-amber-800">
            <Settings className="w-4 h-4 inline mr-1" />
            提示：修改巡检项后，新创建的工单将使用新的巡检项模板。已创建的工单不受影响。
          </p>
        </div>

        {/* 添加类别弹窗 */}
        {showAddCategory && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-4">
            <h3 className="font-medium text-slate-800 mb-3">添加巡检类别</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="请输入类别名称"
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <button
                onClick={handleAddCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
              >
                添加
              </button>
              <button
                onClick={() => { setShowAddCategory(false); setNewCategoryName(''); }}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 类别列表 */}
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category.name} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              {/* 类别头部 */}
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                {editingCategory === category.name ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      defaultValue={category.name}
                      onBlur={(e) => handleRenameCategory(category.name, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameCategory(category.name, (e.target as HTMLInputElement).value);
                        if (e.key === 'Escape') setEditingCategory(null);
                      }}
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => setEditingCategory(null)}
                      className="p-1.5 text-slate-500 hover:bg-slate-200 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-slate-400" />
                      <h3 className="font-semibold text-slate-800">{category.name}</h3>
                      <span className="text-xs text-slate-500">({category.items.length}项)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingCategory(category.name)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.name)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 巡检项列表 */}
              <div className="divide-y divide-slate-100">
                {category.items.map((item, index) => (
                  <div key={index} className="px-4 py-3 flex items-center gap-3">
                    {editingItem?.category === category.name && editingItem?.index === index ? (
                      <>
                        <input
                          type="text"
                          defaultValue={item}
                          onBlur={(e) => handleEditItem(category.name, index, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditItem(category.name, index, (e.target as HTMLInputElement).value);
                            if (e.key === 'Escape') setEditingItem(null);
                          }}
                          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => setEditingItem(null)}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="w-6 text-xs text-slate-400 text-center">{index + 1}</span>
                        <span className="flex-1 text-sm text-slate-700">{item}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 hover:opacity-100">
                          <button
                            onClick={() => handleMoveItem(category.name, index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMoveItem(category.name, index, 'down')}
                            disabled={index === category.items.length - 1}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingItem({ category: category.name, item, index })}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(category.name, index)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {/* 添加巡检项 */}
                <div className="px-4 py-3 bg-slate-50">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder={`在"${category.name}"中添加巡检项...`}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddItem(category.name);
                      }}
                    />
                    <button
                      onClick={() => handleAddItem(category.name)}
                      disabled={!newItemName.trim()}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="text-center py-12">
              <Settings className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">暂无巡检类别，点击右上角添加</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}