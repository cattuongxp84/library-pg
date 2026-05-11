const jwt = require('jsonwebtoken');
const { User } = require('../models');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Không có token xác thực' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Phiên đăng nhập hết hạn' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có quyền thực hiện' });
  }
  next();
};

module.exports = { auth, adminOnly };
