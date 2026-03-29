const mysql = require('mysql2/promise');

let pool = null;

// 获取数据库连接池
async function getPool() {
  if (pool) return pool;

  pool = mysql.createPool({
    host: '119.45.0.31',
    port: 9850,
    user: 'root',
    password: 'mao123456',
    database: 'inspection_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  return pool;
}

// 初始化数据库表
async function initTables() {
  const pool = await getPool();

  // 创建 inspection_orders 表（如果不存在）
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS inspection_orders (
      id VARCHAR(64) PRIMARY KEY,
      order_no VARCHAR(32) NOT NULL,
      project_name VARCHAR(255) DEFAULT '',
      inspection_date DATE,
      inspector VARCHAR(64) DEFAULT '',
      inspector_phone VARCHAR(32) DEFAULT '',
      weather VARCHAR(32) DEFAULT '',
      inverter_no VARCHAR(64) DEFAULT '',
      farmer_name VARCHAR(64) DEFAULT '',
      farmer_phone VARCHAR(32) DEFAULT '',
      address VARCHAR(255) DEFAULT '',
      installed_capacity VARCHAR(32) DEFAULT '',
      grid_connection_date DATE,
      inspections JSON,
      photos JSON,
      conclusion TEXT,
      signature TEXT,
      status VARCHAR(32) DEFAULT 'pending',
      assigned_to VARCHAR(64) DEFAULT '',
      priority VARCHAR(32) DEFAULT 'medium',
      created_by VARCHAR(64) DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      completed_at DATETIME,
      INDEX idx_status (status),
      INDEX idx_inspector (inspector),
      INDEX idx_order_no (order_no)
    )
  `);

  // 创建 users 表（如果不存在）
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      username VARCHAR(64) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(64) DEFAULT '',
      phone VARCHAR(32) DEFAULT '',
      role VARCHAR(32) DEFAULT 'inspector',
      status VARCHAR(32) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // 创建 inspection_categories 表（如果不存在）
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS inspection_categories (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(64) NOT NULL,
      category VARCHAR(64) DEFAULT '',
      sort_order INT DEFAULT 0,
      is_active INT DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

exports.main = async (event, context) => {
  // 初始化表
  await initTables();

  const { action, data } = event;
  const pool = await getPool();

  try {
    switch (action) {
      case 'create': {
        const {
          id, order_no, project_name, inspection_date, inspector,
          inspector_phone, weather, inverter_no, farmer_name,
          farmer_phone, address, installed_capacity, grid_connection_date,
          inspections, photos, conclusion, signature, status,
          assigned_to, priority, created_by
        } = data;

        await pool.query(
          `INSERT INTO inspection_orders
          (id, order_no, project_name, inspection_date, inspector, inspector_phone,
           weather, inverter_no, farmer_name, farmer_phone, address, installed_capacity,
           grid_connection_date, inspections, photos, conclusion, signature, status,
           assigned_to, priority, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, order_no || '', project_name || '', inspection_date || null,
            inspector || '', inspector_phone || '', weather || '晴', inverter_no || '',
            farmer_name || '', farmer_phone || '', address || '', installed_capacity || '',
            grid_connection_date || null,
            JSON.stringify(inspections || []),
            JSON.stringify(photos || []),
            conclusion || '', signature || '', status || 'pending',
            assigned_to || '', priority || 'medium', created_by || ''
          ]
        );
        return { success: true, id };
      }

      case 'getById': {
        const [rows] = await pool.query(
          'SELECT * FROM inspection_orders WHERE id = ?',
          [data.id]
        );
        const order = rows[0] || null;
        if (order) {
          order.inspections = typeof order.inspections === 'string' ? JSON.parse(order.inspections) : order.inspections;
          order.photos = typeof order.photos === 'string' ? JSON.parse(order.photos) : order.photos;
        }
        return { success: true, data: order };
      }

      case 'list': {
        const page = parseInt(data.page) || 1;
        const pageSize = parseInt(data.pageSize) || 20;
        const { status, inspector } = data;
        let sql = 'SELECT * FROM inspection_orders WHERE 1=1';
        let countSql = 'SELECT COUNT(*) as total FROM inspection_orders WHERE 1=1';
        const params = [];
        const countParams = [];

        if (status) {
          sql += ' AND status = ?';
          countSql += ' AND status = ?';
          params.push(status);
          countParams.push(status);
        }
        if (inspector) {
          sql += ' AND assigned_to = ?';
          countSql += ' AND assigned_to = ?';
          params.push(inspector);
          countParams.push(inspector);
        }

        sql += ` ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;

        const [rows] = await pool.query(sql, params);
        const [countResult] = await pool.query(countSql, countParams);

        // 解析 JSON 字段
        const orders = (rows || []).map(order => {
          order.inspections = typeof order.inspections === 'string' ? JSON.parse(order.inspections) : order.inspections;
          order.photos = typeof order.photos === 'string' ? JSON.parse(order.photos) : order.photos;
          return order;
        });

        return { success: true, data: orders, total: countResult[0].total };
      }

      case 'update': {
        const { id, updateData } = data;
        const fields = [];
        const values = [];

        const fieldMap = {
          order_no: 'order_no', project_name: 'project_name', inspection_date: 'inspection_date',
          inspector: 'inspector', inspector_phone: 'inspector_phone', weather: 'weather',
          inverter_no: 'inverter_no', farmer_name: 'farmer_name', farmer_phone: 'farmer_phone',
          address: 'address', installed_capacity: 'installed_capacity', grid_connection_date: 'grid_connection_date',
          inspections: 'inspections', photos: 'photos', conclusion: 'conclusion',
          signature: 'signature', status: 'status', assigned_to: 'assigned_to',
          priority: 'priority', completed_at: 'completed_at'
        };

        for (const [key, dbField] of Object.entries(fieldMap)) {
          if (updateData[key] !== undefined) {
            fields.push(`${dbField} = ?`);
            let value = updateData[key];
            if (key === 'inspections' || key === 'photos') {
              value = JSON.stringify(value);
            }
            values.push(value);
          }
        }

        if (fields.length === 0) {
          return { success: false, error: '没有需要更新的字段' };
        }

        values.push(id);
        await pool.query(
          `UPDATE inspection_orders SET ${fields.join(', ')} WHERE id = ?`,
          values
        );
        return { success: true };
      }

      case 'delete': {
        await pool.query(
          'DELETE FROM inspection_orders WHERE id = ?',
          [data.id]
        );
        return { success: true };
      }

      case 'getUsers': {
        const [rows] = await pool.query(
          'SELECT * FROM users WHERE status = ? ORDER BY created_at ASC',
          ['active']
        );
        return { success: true, data: rows || [] };
      }

      case 'createUser': {
        const { id, username, password, name, phone, role } = data;
        await pool.query(
          `INSERT INTO users (id, username, password, name, phone, role) VALUES (?, ?, ?, ?, ?, ?)`,
          [id, username, password, name || '', phone || '', role || 'inspector']
        );
        return { success: true, id };
      }

      case 'getCategories': {
        const [rows] = await pool.query(
          'SELECT * FROM inspection_categories WHERE is_active = 1 ORDER BY sort_order ASC'
        );
        return { success: true, data: rows || [] };
      }

      case 'saveCategories': {
        const { categories } = data;
        // 先删除所有旧类别
        await pool.query('DELETE FROM inspection_categories');

        // 批量添加
        for (let catIndex = 0; catIndex < categories.length; catIndex++) {
          const cat = categories[catIndex];
          for (let itemIndex = 0; itemIndex < cat.items.length; itemIndex++) {
            const item = cat.items[itemIndex];
            const id = `${Date.now()}_${catIndex}_${itemIndex}`;
            await pool.query(
              `INSERT INTO inspection_categories (id, name, category, sort_order, is_active) VALUES (?, ?, ?, ?, 1)`,
              [id, cat.name, cat.category, catIndex * 100 + itemIndex]
            );
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