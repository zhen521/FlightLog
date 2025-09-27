// 认证中间件
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: '请先登录' });
  }
};

module.exports = {
  requireAuth
};