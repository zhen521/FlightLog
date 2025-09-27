const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session 配置
app.use(session({
  secret: 'flight-log-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // 在生产环境中应设为 true (需要 HTTPS)
    maxAge: 24 * 60 * 60 * 1000 // 24小时
  }
}));

// 路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/flights', require('./routes/flights'));

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({ error: '页面未找到' });
});

app.listen(PORT, () => {
  console.log(`机长飞行日志服务器运行在 http://localhost:${PORT}`);
});

module.exports = app;