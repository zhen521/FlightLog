const express = require('express');
const multer = require('multer');
const database = require('../models/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// 配置文件上传
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('只允许上传 JSON 文件'));
    }
  }
});

// 所有路由都需要认证
router.use(requireAuth);

// 创建飞行记录
router.post('/', async (req, res) => {
  try {
    const userId = req.session.userId;
    const logData = req.body;

    // 验证必填字段
    if (!logData.startTime || !logData.endTime) {
      return res.status(400).json({ error: '起飞时间和降落时间为必填项' });
    }

    // 验证时间逻辑
    if (logData.endTime <= logData.startTime) {
      return res.status(400).json({ error: '降落时间必须晚于起飞时间' });
    }

    // 计算持续时间（秒）
    logData.duration = Math.floor((logData.endTime - logData.startTime) / 1000);

    const newLog = await database.createFlightLog(userId, logData);
    res.status(201).json({
      message: '飞行记录创建成功',
      log: newLog
    });

  } catch (error) {
    console.error('创建飞行记录错误:', error);
    res.status(500).json({ error: '创建记录失败' });
  }
});

// 获取飞行记录列表（支持分页）
router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const logs = await database.getFlightLogsByUser(userId, limit, offset);
    
    res.json({
      logs,
      pagination: {
        page,
        limit,
        hasMore: logs.length === limit
      }
    });

  } catch (error) {
    console.error('获取飞行记录错误:', error);
    res.status(500).json({ error: '获取记录失败' });
  }
});

// 获取所有飞行记录（用于排行榜）
router.get('/all', async (req, res) => {
  try {
    const userId = req.session.userId;
    // 获取所有记录，不分页
    const logs = await database.getFlightLogsByUser(userId, 10000, 0);
    
    res.json({ logs });

  } catch (error) {
    console.error('获取所有飞行记录错误:', error);
    res.status(500).json({ error: '获取所有记录失败' });
  }
});

// 获取单个飞行记录详情
router.get('/:id', async (req, res) => {
  try {
    const userId = req.session.userId;
    const logId = req.params.id;

    const log = await database.getFlightLogById(logId, userId);
    
    if (!log) {
      return res.status(404).json({ error: '记录未找到' });
    }

    res.json({ log });

  } catch (error) {
    console.error('获取飞行记录详情错误:', error);
    res.status(500).json({ error: '获取记录详情失败' });
  }
});

// 更新飞行记录
router.put('/:id', async (req, res) => {
  try {
    const userId = req.session.userId;
    const logId = req.params.id;
    const updateData = req.body;

    console.log('更新记录请求:', {
      userId,
      logId,
      updateData
    });

    // 首先检查记录是否存在且属于当前用户
    const existingLog = await database.getFlightLogById(logId, userId);
    if (!existingLog) {
      console.log('记录未找到:', logId, userId);
      return res.status(404).json({ error: '记录未找到' });
    }

    console.log('现有记录:', existingLog);

    // 更新记录
    const updatedLog = await database.updateFlightLog(logId, userId, updateData);
    
    console.log('更新后记录:', updatedLog);
    
    res.json({
      message: '飞行记录更新成功',
      log: updatedLog
    });

  } catch (error) {
    console.error('更新飞行记录错误:', error);
    res.status(500).json({ error: '更新记录失败: ' + error.message });
  }
});

// 获取单次飞行时长PK榜
router.get('/leaderboard/max-duration', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = await database.getMaxDurationLeaderboard(limit);
    
    res.json({ leaderboard });

  } catch (error) {
    console.error('获取PK榜数据错误:', error);
    res.status(500).json({ error: '获取PK榜数据失败' });
  }
});

// 获取统计数据
router.get('/stats/overview', async (req, res) => {
  try {
    const userId = req.session.userId;
    const stats = await database.getFlightStats(userId);
    res.json({ stats });

  } catch (error) {
    console.error('获取统计数据错误:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// 获取每日飞行次数（用于图表）
router.get('/stats/daily', async (req, res) => {
  try {
    const userId = req.session.userId;
    const days = parseInt(req.query.days) || 30;
    
    console.log(`获取用户 ${userId} 最近 ${days} 天的飞行数据`);
    
    const dailyCounts = await database.getDailyFlightCounts(userId, days);
    console.log('数据库返回的原始数据:', dailyCounts);
    
    // 填充没有记录的日期（显示为0）
    const result = [];
    const today = new Date();
    
    // 从 days-1 天前开始，包含今天，总共 days 天
    for (let i = days - 1; i >= 0; i--) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() - i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      const found = dailyCounts.find(item => item.date === dateStr);
      result.push({
        date: dateStr,
        count: found ? found.count : 0
      });
    }
    
    console.log('处理后的结果数据:', result);
    console.log('今天的日期:', today.toISOString().split('T')[0]);
    
    res.json({ dailyCounts: result });

  } catch (error) {
    console.error('获取每日统计错误:', error);
    res.status(500).json({ error: '获取每日统计失败' });
  }
});

// 获取日历数据
router.get('/calendar/:year/:month', async (req, res) => {
  try {
    const userId = req.session.userId;
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    // 获取该月的开始和结束时间
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    
    const sql = `
      SELECT 
        DATE(startTime/1000, 'unixepoch') as date,
        COUNT(*) as count,
        GROUP_CONCAT(id) as logIds
      FROM flight_logs 
      WHERE userId = ? AND startTime >= ? AND startTime <= ?
      GROUP BY DATE(startTime/1000, 'unixepoch')
      ORDER BY date ASC
    `;
    
    // 直接使用数据库查询，因为这是特殊的聚合查询
    const database_instance = require('../models/database');
    const calendarData = await new Promise((resolve, reject) => {
      database_instance.db.all(sql, [userId, startDate.getTime(), endDate.getTime()], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    res.json({ calendarData });

  } catch (error) {
    console.error('获取日历数据错误:', error);
    res.status(500).json({ error: '获取日历数据失败' });
  }
});

// 导出数据为 JSON
router.get('/export/json', async (req, res) => {
  try {
    const userId = req.session.userId;
    const logs = await database.getFlightLogsByUser(userId);
    
    // 清理数据（移除内部字段）
    const exportData = logs.map(log => {
      const { id, userId, createdAt, ...exportLog } = log;
      return exportLog;
    });
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="flight-logs.json"');
    res.json(exportData);

  } catch (error) {
    console.error('导出 JSON 错误:', error);
    res.status(500).json({ error: '导出失败' });
  }
});

// 导出数据为 CSV
router.get('/export/csv', async (req, res) => {
  try {
    const userId = req.session.userId;
    const logs = await database.getFlightLogsByUser(userId);
    
    // CSV 表头
    const headers = [
      '起飞时间', '降落时间', '飞行时长(秒)', '航班号', '燃料消耗', 
      '迫降', '空雾', '空姐', '副机长', '机库', '舱压', '备注'
    ];
    
    // 转换数据为 CSV 格式
    const csvRows = [headers.join(',')];
    
    logs.forEach(log => {
      const row = [
        new Date(log.startTime).toLocaleString(),
        new Date(log.endTime).toLocaleString(),
        log.duration,
        log.flightNumber || '',
        log.fuelConsumption || 0,
        log.forcedLanding ? '是' : '否',
        log.airCrash ? '是' : '否',
        log.flightAttendant || '',
        log.copilot || '',
        log.hangar || '',
        log.cabinPressure || '',
        (log.remarks || '').replace(/,/g, '，') // 替换逗号避免CSV格式问题
      ];
      csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="flight-logs.csv"');
    res.send('\uFEFF' + csvContent); // 添加 BOM 以正确显示中文

  } catch (error) {
    console.error('导出 CSV 错误:', error);
    res.status(500).json({ error: '导出失败' });
  }
});

// 导入数据
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (!req.file) {
      return res.status(400).json({ error: '请选择要导入的文件' });
    }
    
    const fs = require('fs');
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    
    let importData;
    try {
      importData = JSON.parse(fileContent);
    } catch (parseError) {
      return res.status(400).json({ error: 'JSON 文件格式错误' });
    }
    
    if (!Array.isArray(importData)) {
      return res.status(400).json({ error: '导入数据必须是数组格式' });
    }
    
    // 验证数据格式
    for (let i = 0; i < importData.length; i++) {
      const log = importData[i];
      if (!log.startTime || !log.endTime || typeof log.startTime !== 'number' || typeof log.endTime !== 'number') {
        return res.status(400).json({ error: `第 ${i + 1} 条记录的时间格式错误` });
      }
      if (log.endTime <= log.startTime) {
        return res.status(400).json({ error: `第 ${i + 1} 条记录的时间逻辑错误` });
      }
    }
    
    // 清空现有数据（覆盖模式）
    await database.deleteAllFlightLogs(userId);
    
    // 导入新数据
    let importedCount = 0;
    for (const logData of importData) {
      // 重新计算持续时间
      logData.duration = Math.floor((logData.endTime - logData.startTime) / 1000);
      
      await database.createFlightLog(userId, logData);
      importedCount++;
    }
    
    // 清理临时文件
    fs.unlinkSync(req.file.path);
    
    res.json({
      message: '数据导入成功',
      importedCount
    });

  } catch (error) {
    console.error('导入数据错误:', error);
    
    // 清理临时文件
    if (req.file && req.file.path) {
      const fs = require('fs');
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('清理临时文件失败:', cleanupError);
      }
    }
    
    res.status(500).json({ error: '导入失败' });
  }
});

module.exports = router;