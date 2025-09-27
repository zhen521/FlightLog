const express = require('express');
const bcrypt = require('bcryptjs');
const database = require('../models/database');

const router = express.Router();

// 注册接口
router.post('/register', async (req, res) => {
  try {
    const { username, password, inviteCode } = req.body;

    // 验证输入
    if (!username || !password || !inviteCode) {
      return res.status(400).json({ error: '请填写所有必填字段' });
    }

    // 验证邀请码
    if (inviteCode !== '我要飞') {
      return res.status(400).json({ error: '邀请码错误' });
    }

    // 检查用户名长度
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: '用户名长度应为3-20个字符' });
    }

    // 检查密码长度
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6个字符' });
    }

    // 检查用户名是否已存在
    const existingUser = await database.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    // 加盐哈希密码
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 创建用户
    const newUser = await database.createUser(username, passwordHash);

    // 自动登录
    req.session.userId = newUser.id;
    req.session.username = newUser.username;

    res.status(201).json({
      message: '注册成功',
      user: {
        id: newUser.id,
        username: newUser.username
      }
    });

  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// 登录接口
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证输入
    if (!username || !password) {
      return res.status(400).json({ error: '请输入用户名和密码' });
    }

    // 查找用户
    const user = await database.getUserByUsername(username);
    if (!user) {
      return res.status(400).json({ error: '用户名或密码错误' });
    }

    // 验证密码
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(400).json({ error: '用户名或密码错误' });
    }

    // 创建会话
    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username
      }
    });

  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// 登出接口
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('登出错误:', err);
      return res.status(500).json({ error: '登出失败' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: '登出成功' });
  });
});

// 检查登录状态
router.get('/status', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({
      isLoggedIn: true,
      user: {
        id: req.session.userId,
        username: req.session.username
      }
    });
  } else {
    res.json({ isLoggedIn: false });
  }
});

module.exports = router;