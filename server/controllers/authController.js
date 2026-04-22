const jwt = require('jsonwebtoken');
const { User } = require('../models');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

exports.register = async (req, res) => {
  try {
    const { name, email, password, student_id, phone } = req.body;
    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(400).json({ success: false, message: 'Email đã được sử dụng' });
    const user = await User.create({ name, email, password, student_id, phone });
    res.status(201).json({ success: true, token: signToken(user.id), user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    if (!user.is_active)
      return res.status(401).json({ success: false, message: 'Tài khoản đã bị khóa' });
    if (!process.env.JWT_SECRET)
      return res.status(500).json({ success: false, message: 'JWT_SECRET is not configured' });
    res.json({ success: true, token: signToken(user.id), user });
  } catch (err) {
    console.error('Auth login error:', err);
    res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
};

exports.getMe = (req, res) => res.json({ success: true, user: req.user });

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!(await user.matchPassword(oldPassword)))
      return res.status(400).json({ success: false, message: 'Mật khẩu cũ không đúng' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
