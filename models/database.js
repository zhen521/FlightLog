const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database.db');

class Database {
  constructor() {
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('数据库连接失败:', err.message);
      } else {
        console.log('已连接到 SQLite 数据库');
        this.initTables();
      }
    });
  }

  initTables() {
    // 创建用户表
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        passwordHash TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 创建飞行日志表
    const createFlightLogsTable = `
      CREATE TABLE IF NOT EXISTS flight_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        startTime INTEGER NOT NULL,
        endTime INTEGER NOT NULL,
        duration INTEGER NOT NULL,
        flightNumber TEXT,
        fuelConsumption INTEGER DEFAULT 0,
        forcedLanding BOOLEAN NOT NULL DEFAULT 0,
        airCrash BOOLEAN NOT NULL DEFAULT 0,
        flightAttendant TEXT,
        copilot TEXT,
        hangar TEXT,
        cabinPressure TEXT,
        remarks TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id)
      )
    `;

    this.db.run(createUsersTable, (err) => {
      if (err) {
        console.error('创建用户表失败:', err.message);
      } else {
        console.log('用户表创建成功');
      }
    });

    this.db.run(createFlightLogsTable, (err) => {
      if (err) {
        console.error('创建飞行日志表失败:', err.message);
      } else {
        console.log('飞行日志表创建成功');
        // 添加新列（如果表已存在但缺少cabinPressure列）
        this.addCabinPressureColumn();
      }
    });
  }

  // 为现有表添加cabinPressure列
  addCabinPressureColumn() {
    this.db.run('ALTER TABLE flight_logs ADD COLUMN cabinPressure TEXT', (err) => {
      if (err) {
        // 如果列已存在，这里会报错，但这是正常的
        if (!err.message.includes('duplicate column name')) {
          console.error('添加cabinPressure列失败:', err.message);
        } else {
          console.log('cabinPressure列已存在');
        }
      } else {
        console.log('成功添加cabinPressure列');
      }
    });
  }

  // 用户相关操作
  createUser(username, passwordHash) {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO users (username, passwordHash) VALUES (?, ?)';
      this.db.run(sql, [username, passwordHash], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, username });
        }
      });
    });
  }

  getUserByUsername(username) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE username = ?';
      this.db.get(sql, [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // 飞行日志相关操作
  createFlightLog(userId, logData) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO flight_logs 
        (userId, startTime, endTime, duration, flightNumber, fuelConsumption, 
         forcedLanding, airCrash, flightAttendant, copilot, hangar, cabinPressure, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        userId,
        logData.startTime,
        logData.endTime,
        logData.duration,
        logData.flightNumber || null,
        logData.fuelConsumption || 0,
        logData.forcedLanding ? 1 : 0,
        logData.airCrash ? 1 : 0,
        logData.flightAttendant || null,
        logData.copilot || null,
        logData.hangar || null,
        logData.cabinPressure || null,
        logData.remarks || null
      ];

      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, ...logData });
        }
      });
    });
  }

  getFlightLogsByUser(userId, limit = null, offset = null) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM flight_logs WHERE userId = ? ORDER BY startTime DESC';
      const params = [userId];
      
      if (limit !== null) {
        sql += ' LIMIT ?';
        params.push(limit);
        
        if (offset !== null) {
          sql += ' OFFSET ?';
          params.push(offset);
        }
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  getFlightLogById(id, userId) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM flight_logs WHERE id = ? AND userId = ?';
      this.db.get(sql, [id, userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // 更新飞行记录
  updateFlightLog(id, userId, updateData) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE flight_logs 
        SET flightNumber = ?, fuelConsumption = ?, forcedLanding = ?, 
            airCrash = ?, flightAttendant = ?, copilot = ?, hangar = ?, cabinPressure = ?, remarks = ?
        WHERE id = ? AND userId = ?
      `;
      
      console.log('数据库更新数据:', updateData);
      
      const params = [
        updateData.flightNumber || null,
        parseInt(updateData.fuelConsumption) || 0,
        updateData.forcedLanding ? 1 : 0,
        updateData.airCrash ? 1 : 0,
        updateData.flightAttendant || null,
        updateData.copilot || null,
        updateData.hangar || null,
        updateData.cabinPressure || null,
        updateData.remarks || null,
        parseInt(id),
        parseInt(userId)
      ];

      console.log('数据库更新参数:', params);

      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('数据库更新错误:', err);
          reject(err);
        } else if (this.changes === 0) {
          console.log('没有记录被更新, changes:', this.changes);
          reject(new Error('记录未找到或无权限更新'));
        } else {
          console.log('更新成功, changes:', this.changes);
          resolve({ id, userId, ...updateData });
        }
      });
    });
  }

  // 统计相关方法
  getFlightStats(userId) {
    return new Promise((resolve, reject) => {
      // 获取总次数和平均时长
      const totalSql = `
        SELECT 
          COUNT(*) as totalFlights,
          AVG(duration) as avgDuration,
          SUM(duration) as totalDuration
        FROM flight_logs 
        WHERE userId = ?
      `;

      this.db.get(totalSql, [userId], (err, totalStats) => {
        if (err) {
          reject(err);
          return;
        }

        // 获取本周次数
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // 本周一
        weekStart.setHours(0, 0, 0, 0);

        const weekSql = `
          SELECT COUNT(*) as weekFlights 
          FROM flight_logs 
          WHERE userId = ? AND startTime >= ?
        `;

        this.db.get(weekSql, [userId, weekStart.getTime()], (err, weekStats) => {
          if (err) {
            reject(err);
            return;
          }

          // 获取本月次数
          const monthStart = new Date();
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);

          const monthSql = `
            SELECT COUNT(*) as monthFlights 
            FROM flight_logs 
            WHERE userId = ? AND startTime >= ?
          `;

          this.db.get(monthSql, [userId, monthStart.getTime()], (err, monthStats) => {
            if (err) {
              reject(err);
            } else {
              resolve({
                totalFlights: totalStats.totalFlights,
                avgDuration: totalStats.avgDuration ? Math.round(totalStats.avgDuration) : 0,
                totalDuration: totalStats.totalDuration || 0,
                weekFlights: weekStats.weekFlights,
                monthFlights: monthStats.monthFlights
              });
            }
          });
        });
      });
    });
  }

  // 获取最近30天的每日飞行次数
  getDailyFlightCounts(userId, days = 30) {
    return new Promise((resolve, reject) => {
      // 计算开始日期：从 days-1 天前开始，包含今天
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (days - 1));
      startDate.setHours(0, 0, 0, 0);
      
      // 结束日期：今天的末尾
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      const sql = `
        SELECT 
          DATE(startTime/1000, 'unixepoch') as date,
          COUNT(*) as count
        FROM flight_logs 
        WHERE userId = ? AND startTime >= ? AND startTime <= ?
        GROUP BY DATE(startTime/1000, 'unixepoch')
        ORDER BY date ASC
      `;

      this.db.all(sql, [userId, startDate.getTime(), endDate.getTime()], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // 删除用户所有飞行记录
  deleteAllFlightLogs(userId) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM flight_logs WHERE userId = ?';
      this.db.run(sql, [userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ deletedCount: this.changes });
        }
      });
    });
  }

  // 获取单次飞行时长PK榜
  getMaxDurationLeaderboard(limit = 10) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          u.username,
          f1.duration as maxDuration,
          f1.flightNumber,
          f1.startTime,
          f1.flightAttendant
        FROM users u
        JOIN flight_logs f1 ON f1.userId = u.id
        WHERE f1.duration = (
          SELECT MAX(f2.duration) 
          FROM flight_logs f2 
          WHERE f2.userId = u.id
        )
        ORDER BY f1.duration DESC
        LIMIT ?
      `;
      
      this.db.all(sql, [limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  close() {
    this.db.close((err) => {
      if (err) {
        console.error('关闭数据库失败:', err.message);
      } else {
        console.log('数据库连接已关闭');
      }
    });
  }
}

// 创建单例实例
const database = new Database();

module.exports = database;