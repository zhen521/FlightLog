# 机长飞行日志 (Captain's Flight Log)

一个轻量级、用户友好的单页面 Web 应用，用于记录、统计和管理个人重复性行为或活动。

## 功能特性

### 🔐 用户认证
- 用户注册与登录
- 邀请码机制（邀请码：`我要飞`）
- 会话管理

### ✈️ 飞行记录
- 起飞/降落操作
- 实时飞行计时
- 详细飞行日志填写
- 支持多种状态标记（迫降、空难等）

### 📊 数据统计
- 总飞行次数与平均时长
- 本周/本月飞行统计
- 最近30天飞行频率图表
- 实时数据更新

### 📅 日历视图
- 月度日历展示
- 热力图显示飞行频率
- 点击查看当日详细记录
- 月份导航

### 📋 表格视图
- 完整飞行记录列表
- 分页显示（每页20条）
- 详细信息查看
- 时间排序

### 🏆 排行榜
- 单次飞行时长 Top 10
- 燃料消耗排行榜 Top 10
- 月度飞行统计

### 💾 数据管理
- JSON/CSV 格式数据导出
- JSON 数据导入（覆盖模式）
- 完整数据备份与恢复

## 技术栈

### 前端
- **Alpine.js** - 响应式交互框架
- **Tailwind CSS** - 现代化样式框架
- **Chart.js** - 数据可视化图表

### 后端
- **Node.js** - JavaScript 运行时
- **Express.js** - Web 应用框架
- **SQLite 3** - 轻量级数据库

## 安装与运行

### 1. 安装依赖
```bash
npm install
```

### 2. 启动服务器
```bash
npm start
```

### 3. 开发模式（可选）
```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动。

## 使用说明

### 注册账户
1. 打开应用，点击"立即注册"
2. 填写用户名、密码
3. 输入邀请码：`我要飞`
4. 点击注册，自动登录

### 记录飞行
1. 在主页面点击"起飞"开始计时
2. 完成活动后点击"降落"
3. 填写飞行详情（可选）
4. 点击保存完成记录

### 查看数据
- **主页面**：查看统计数据和趋势图表
- **日历视图**：月度视图查看飞行分布
- **表格视图**：详细记录列表
- **排行榜**：个人最佳记录
- **数据管理**：导入导出数据

## 数据格式

### JSON 导入格式示例
参考项目根目录的 `sample-data.json` 文件。

### 数据字段说明
- `startTime`: 起飞时间戳（毫秒）
- `endTime`: 降落时间戳（毫秒）
- `duration`: 持续时间（秒，自动计算）
- `flightNumber`: 航班号（可选）
- `fuelConsumption`: 燃料消耗（可选）
- `forcedLanding`: 是否迫降（布尔值）
- `airCrash`: 是否空雾（布尔值）
- `flightAttendant`: 空姐（可选）
- `copilot`: 副机长（可选）
- `hangar`: 机库（可选）
- `cabinPressure`: 舱压（可选）
- `remarks`: 备注（可选）

## 开发指南

### 项目结构
```
FlightLog/
├── server.js          # 主服务器文件
├── package.json       # 项目配置
├── models/
│   └── database.js    # 数据库模型
├── routes/
│   ├── auth.js        # 认证路由
│   └── flights.js     # 飞行记录路由
├── middleware/
│   └── auth.js        # 认证中间件
├── public/
│   ├── index.html     # 主页面
│   └── app.js         # 前端 JavaScript
└── sample-data.json   # 示例数据
```

### API 接口

#### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/status` - 检查登录状态

#### 飞行记录接口
- `POST /api/flights` - 创建飞行记录
- `GET /api/flights` - 获取飞行记录列表
- `GET /api/flights/:id` - 获取单个记录详情
- `GET /api/flights/stats/overview` - 获取统计概览
- `GET /api/flights/stats/daily` - 获取每日统计
- `GET /api/flights/calendar/:year/:month` - 获取日历数据
- `GET /api/flights/export/json` - 导出 JSON
- `GET /api/flights/export/csv` - 导出 CSV
- `POST /api/flights/import` - 导入数据

## 注意事项

1. **数据安全**：建议定期导出数据进行备份
2. **邀请码**：注册时必须输入正确的邀请码"我要飞"
3. **数据导入**：导入操作会覆盖现有数据，请谨慎操作
4. **浏览器兼容**：建议使用现代浏览器以获得最佳体验

## 许可证

MIT License

## 更新日志

### v1.0.0 (2025-09-27)
- 首次发布
- 完整的用户认证系统
- 飞行记录与统计功能
- 日历、表格、排行榜视图
- 数据导入导出功能