const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return next(); // อนุญาตให้ผ่านไปโดยไม่บังคับให้ต้องมี token
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user; // เก็บข้อมูลผู้ใช้ใน req.user
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    return next(); // อนุญาตให้ผ่านไปแม้เกิดข้อผิดพลาดในการตรวจสอบ token
  }
};

module.exports = authMiddleware;