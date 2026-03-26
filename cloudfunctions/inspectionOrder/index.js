const cloudbase = require('@cloudbase/node-sdk');
const axios = require('axios');

exports.main = async (event, context) => {
  const app = cloudbase.init({});
  
  // 获取 API Key（从环境变量）
  const apiKey = process.env.CLOUDBASE_API_KEY || '';
  
  const { action, data, envId } = event;
  const baseUrl = `https://${envId || process.env.TCB_ENV || 'test-9gxg636q2a60a065'}.api.tcloudbasegateway.com`;
  
  // 执行 HTTP 请求的辅助函数
  async function httpRequest(method, path, body = null) {
    const url = `${baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    try {
      const res = await axios({
        method,
        url,
        headers,
        data: body,
        timeout: 10000
      });
      return res.data;
    } catch (error) {
      if (error.response) {
        return { error: error.response.data, status: error.response.status };
      }
      throw error;
    }
  }
  
  try {
    switch (action) {
      case 'create': {
        await httpRequest('POST', `/v1/rdb/rest/inspection_orders`, {
          id: data.id,
          order_no: data.order_no,
          project_name: data.project_name,
          inspection_date: data.inspection_date,
          inspector: data.inspector,
          inspector_phone: data.inspector_phone || '',
          weather: data.weather || '晴',
          inverter_no: data.inverter_no || '',
          farmer_name: data.farmer_name || '',
          farmer_phone: data.farmer_phone || '',
          address: data.address || '',
          installed_capacity: data.installed_capacity || '',
          grid_connection_date: data.grid_connection_date || null,
          inspections: JSON.stringify(data.inspections || []),
          photos: JSON.stringify(data.photos || []),
          conclusion: data.conclusion || '',
          signature: data.signature || '',
          status: data.status || 'pending',
          assigned_to: data.assigned_to || '',
          priority: data.priority || 'medium',
          created_by: data.created_by || ''
        });
        return { success: true, id: data.id };
      }
      
      case 'getById': {
        const result = await httpRequest('GET', `/v1/rdb/rest/inspection_orders?id=eq.${data.id}`);
        if (result.error) {
          return { success: false, error: result.error };
        }
        let order = result[0] || null;
        if (order) {
          if (order.inspections) try { order.inspections = JSON.parse(order.inspections); } catch {}
          if (order.photos) try { order.photos = JSON.parse(order.photos); } catch {}
        }
        return { success: true, data: order };
      }
      
      case 'list': {
        const { page = 1, pageSize = 20, status, inspector } = data;
        let query = `/v1/rdb/rest/inspection_orders?order=created_at.desc&limit=${pageSize}&offset=${(page - 1) * pageSize}`;
        
        if (status) {
          query += `&status=eq.${status}`;
        }
        if (inspector) {
          query += `&assigned_to=eq.${inspector}`;
        }
        
        const result = await httpRequest('GET', query);
        if (result.error) {
          return { success: false, error: result.error };
        }
        const orders = (result || []).map(row => {
          if (row.inspections) try { row.inspections = JSON.parse(row.inspections); } catch {}
          if (row.photos) try { row.photos = JSON.parse(row.photos); } catch {}
          return row;
        });
        return { success: true, data: orders };
      }
      
      case 'update': {
        const { id, updateData } = data;
        const sqlData = { ...updateData };
        if (sqlData.inspections) sqlData.inspections = JSON.stringify(sqlData.inspections);
        if (sqlData.photos) sqlData.photos = JSON.stringify(sqlData.photos);
        
        await httpRequest('PATCH', `/v1/rdb/rest/inspection_orders?id=eq.${id}`, sqlData);
        return { success: true };
      }
      
      case 'delete': {
        await httpRequest('DELETE', `/v1/rdb/rest/inspection_orders?id=eq.${data.id}`);
        return { success: true };
      }
      
      case 'getUsers': {
        const result = await httpRequest('GET', `/v1/rdb/rest/users?status=eq.active&order=created_at.asc`);
        if (result.error) {
          return { success: false, error: result.error };
        }
        return { success: true, data: result || [] };
      }
      
      case 'createUser': {
        await httpRequest('POST', `/v1/rdb/rest/users`, data);
        return { success: true, id: data.id };
      }
      
      case 'getCategories': {
        const result = await httpRequest('GET', `/v1/rdb/rest/inspection_categories?is_active=eq.1&order=sort_order.asc`);
        if (result.error) {
          return { success: false, error: result.error };
        }
        return { success: true, data: result || [] };
      }
      
      case 'saveCategories': {
        const { categories } = data;
        // 先删除所有旧类别
        await httpRequest('DELETE', `/v1/rdb/rest/inspection_categories`);
        // 批量添加
        for (let catIndex = 0; catIndex < categories.length; catIndex++) {
          const cat = categories[catIndex];
          for (let itemIndex = 0; itemIndex < cat.items.length; itemIndex++) {
            const item = cat.items[itemIndex];
            await httpRequest('POST', `/v1/rdb/rest/inspection_categories`, {
              id: `${Date.now()}_${catIndex}_${itemIndex}`,
              name: cat.name,
              category: cat.category,
              sort_order: catIndex * 100 + itemIndex,
              is_active: 1
            });
          }
        }
        return { success: true };
      }
      
      default:
        return { success: false, error: 'Unknown action: ' + action };
    }
  } catch (error) {
    console.error('Function error:', error);
    return { success: false, error: error.message || String(error) };
  }
};