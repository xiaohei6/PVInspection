import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function exportOrderToPDF(order: any): Promise<void> {
  // 按类别分组巡检项
  const groupedInspections: Record<string, any[]> = {};
  if (order.inspections && order.inspections.length > 0) {
    order.inspections.forEach((item: any) => {
      if (!groupedInspections[item.category]) {
        groupedInspections[item.category] = [];
      }
      groupedInspections[item.category].push(item);
    });
  }

  // 计算统计数据
  const stats = {
    total: order.inspections?.length || 0,
    normal: order.inspections?.filter((i: any) => i.result === '正常').length || 0,
    abnormal: order.inspections?.filter((i: any) => i.result === '异常').length || 0,
    pending: order.inspections?.filter((i: any) => i.result === '待复查').length || 0
  };

  // 类别对应的子标题（与模板一致）
  const categoryTitles: Record<string, string> = {
    '光伏组件': '1',
    '支架': '2',
    '逆变器': '3',
    '配电箱': '4',
    '接地与防雷系统': '5',
    '采集装置及电缆': '6'
  };

  // 照片分类映射
  const photoCategoryMap: Record<string, string> = {
    '光伏组件': 'component',
    '支架': 'bracket',
    '逆变器': 'inverter',
    '配电箱': 'distribution',
    '接地与防雷系统': 'grounding',
    '采集装置及电缆': 'cable'
  };

  // 照片标题配置
  const photoTitles: Record<string, string[]> = {
    '光伏组件': ['组件航拍图', '电站整体照片', '组件间接地方式附照片（刺破垫片或短接黄绿线）', '组件洁净度是否正常异常整改前后'],
    '支架': ['支架照片（背拉部位照片、预制墩、膨胀螺栓细节照片、支架螺栓）', '标识牌照片'],
    '逆变器': ['逆变器运行正常的照片', '逆变器和配电箱的整体照片', '检测各支路电流的照片'],
    '配电箱': ['配电箱内外部照片'],
    '接地与防雷系统': ['引下线与垂直接地体衔接近照', '支架与引下线衔接近照'],
    '采集装置及电缆': ['采集器、物联卡正常运行照片']
  };

  // 生成巡检内容表格HTML
  const generateInspectionTable = (category: string, items: any[]) => {
    const categoryNum = categoryTitles[category] || '';
    const subTitle = categoryNum ? `、${category}` : '';

    let rows = '';
    items.forEach((item, i) => {
      const resultColor = item.result === '正常' ? '#10b981' : item.result === '异常' ? '#ef4444' : '#f59e0b';
      rows += `
        <tr>
          <td style="text-align:center;border:1px solid #2d2d2d;padding:8px;height:38px;">${i + 1}</td>
          <td style="border:1px solid #2d2d2d;padding:8px;height:38px;">${item.name || '-'}</td>
          <td style="text-align:center;border:1px solid #2d2d2d;padding:8px;height:38px;color:${resultColor};font-weight:bold;">${item.result || '-'}</td>
          <td style="border:1px solid #2d2d2d;padding:8px;height:38px;">${item.description || '-'}</td>
        </tr>
      `;
    });

    return `
      <h2 style="font-size:18px;font-weight:700;margin:15px 0 10px;">${categoryNum}${subTitle}</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:12px;">
        <thead>
          <tr>
            <th style="background:#5b9bd5;color:#fff;font-weight:700;text-align:center;padding:8px;border:1px solid #2d2d2d;">序号</th>
            <th style="background:#5b9bd5;color:#fff;font-weight:700;text-align:center;padding:8px;border:1px solid #2d2d2d;">巡检内容</th>
            <th style="background:#5b9bd5;color:#fff;font-weight:700;text-align:center;padding:8px;border:1px solid #2d2d2d;">巡检结果</th>
            <th style="background:#5b9bd5;color:#fff;font-weight:700;text-align:center;padding:8px;border:1px solid #2d2d2d;">异常情况说明</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  };

  // 生成照片区域HTML
  const generatePhotoSection = (category: string) => {
    const titles = photoTitles[category] || ['现场照片'];
    const photoKey = photoCategoryMap[category];
    const categoryPhotos = order.photos?.filter((p: any) => p.category === photoKey) || [];

    let html = '';
    titles.forEach((title, i) => {
      const photo = categoryPhotos[i];
      if (photo && photo.url) {
        html += `
          <div style="font-size:12px;font-weight:600;margin:8px 0 4px;">${title}</div>
          <div style="height:80px;border:1px dashed #ccc;display:flex;align-items:center;justify-content:center;background:#fafafa;margin-bottom:8px;overflow:hidden;">
            <img src="${photo.url}" style="max-width:100%;max-height:100%;object-fit:contain;" crossorigin="anonymous" />
          </div>
        `;
      } else {
        html += `
          <div style="font-size:12px;font-weight:600;margin:8px 0 4px;">${title}</div>
          <div style="height:80px;border:1px dashed #ccc;display:flex;align-items:center;justify-content:center;color:#999;background:#fafafa;margin-bottom:8px;">图片占位</div>
        `;
      }
    });

    return html;
  };

  // 构建HTML内容 - 全部使用内联样式，无外部样式表
  const fullHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
    </head>
    <body style="font-family:'Microsoft YaHei',sans-serif;font-size:12px;color:rgb(51,51,51);padding:20px;background:rgb(255,255,255);">
      <div style="text-align:center;padding:40px 0;">
        <div style="font-size:18px;font-weight:600;margin-bottom:30px;">山东龙源农信通新能源开发有限公司</div>
        <div style="font-size:28px;font-weight:700;margin-bottom:40px;">分布式光伏电站巡检维护报告</div>
        <div style="width:60%;margin:0 auto;text-align:left;">
          <div style="display:flex;padding:10px 0;border-bottom:1px solid rgb(153,153,153);">
            <div style="width:80px;">项目名称：</div>
            <div style="flex:1;">${order.projectName || ''}</div>
          </div>
          <div style="display:flex;padding:10px 0;border-bottom:1px solid rgb(153,153,153);">
            <div style="width:80px;">巡检时间：</div>
            <div style="flex:1;">${order.inspectionDate || ''}</div>
          </div>
          <div style="display:flex;padding:10px 0;border-bottom:1px solid rgb(153,153,153);">
            <div style="width:80px;">巡检人：</div>
            <div style="flex:1;">${order.inspector || ''}</div>
          </div>
          <div style="display:flex;padding:10px 0;border-bottom:1px solid rgb(153,153,153);">
            <div style="width:80px;">天气：</div>
            <div style="flex:1;">${order.weather || ''}</div>
          </div>
        </div>
      </div>

      <h1 style="font-size:18px;font-weight:700;margin:20px 0 10px;color:rgb(30,58,95);">一、电站基础信息</h1>
      <table>
        <tr><td style="width:15%;text-align:center;">逆变器编号</td><td>${order.inverterNo || ''}</td></tr>
        <tr><td style="text-align:center;">农户姓名</td><td>${order.farmerName || ''}</td></tr>
        <tr><td style="text-align:center;">装机地址</td><td>${order.address || ''}</td></tr>
        <tr><td style="text-align:center;">装机容量</td><td>${order.installedCapacity ? order.installedCapacity + ' kWp' : ''}</td></tr>
      </table>

      <h1 style="font-size:18px;font-weight:700;margin:20px 0 10px;color:rgb(30,58,95);">二、巡检内容</h1>
      ${Object.entries(groupedInspections).map(([category, items]) =>
        generateInspectionTable(category, items) + generatePhotoSection(category)
      ).join('')}

      <h1 style="font-size:18px;font-weight:700;margin:20px 0 10px;color:rgb(30,58,95);">三、巡检统计</h1>
      <div style="background:rgb(245,245,245);padding:15px;margin:20px 0;border-radius:4px;">
        共检查 <strong>${stats.total}</strong> 项，其中正常 ${stats.normal} 项，异常 ${stats.abnormal} 项，待复查 ${stats.pending} 项
      </div>

      <h1 style="font-size:18px;font-weight:700;margin:20px 0 10px;color:rgb(30,58,95);">四、巡检结论</h1>
      <div style="background:rgb(249,249,249);padding:15px;min-height:80px;margin-bottom:15px;">
        ${order.conclusion || '无'}
      </div>

      <div style="margin-top:60px;">
        <p>巡检员签名：________________</p>
        <p style="margin-top:10px;">日  期：________________</p>
      </div>

      <div style="margin-top:40px;text-align:center;font-size:10px;color:rgb(153,153,153);border-top:1px solid rgb(238,238,238);padding-top:10px;">
        工单编号：${order.orderNo || '-'} | 导出时间：${new Date().toLocaleString('zh-CN')}
      </div>
    </body>
    </html>
  `;

  // 创建隐藏的容器
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:700px;background:#fff;';
  container.innerHTML = fullHTML;
  document.body.appendChild(container);

  try {
    // 等待内容渲染
    await new Promise(resolve => setTimeout(resolve, 300));

    // 使用html2canvas转换
    const canvas = await html2canvas(container, {
      scale: 1.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        // 遍历克隆文档中的所有元素，移除 oklch 颜色
        const allElements = clonedDoc.getElementsByTagName('*');
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i] as HTMLElement;
          const computedStyle = el.style;

          // 清理特定的可能包含 oklch 的属性
          const colorProps = ['background-color', 'color', 'border-color', 'border-bottom-color', 'border-top-color', 'border-left-color', 'border-right-color'];
          colorProps.forEach(prop => {
            const value = computedStyle.getPropertyValue(prop);
            if (value && value.includes('oklch')) {
              computedStyle.setProperty(prop, 'rgb(255, 255, 255)');
            }
          });
        }

        // 处理 body 元素
        if (clonedDoc.body) {
          clonedDoc.body.style.backgroundColor = 'rgb(255, 255, 255)';
        }
      }
    });

    // 直接将整个canvas转为图片添加到PDF（不分页）
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, 297));

    const fileName = (order.orderNo || '巡检报告') + '_巡检报告.pdf';
    pdf.save(fileName);
  } finally {
    document.body.removeChild(container);
  }
}