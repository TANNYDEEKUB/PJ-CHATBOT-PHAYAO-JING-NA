const express = require('express');
const { registerUser, loginUser } = require('../controllers/authController');
const { getUserInfo } = require('../controllers/authController'); // นำเข้า controller ที่จะใช้สำหรับดึงข้อมูลผู้ใช้
const authenticateToken = require('../middleware/authenticateToken'); // นำเข้า middleware สำหรับตรวจสอบ token

const router = express.Router();

// เส้นทางสำหรับการลงทะเบียนและเข้าสู่ระบบ
router.post('/register', registerUser);
router.post('/login', loginUser);

// เส้นทางสำหรับการดึงข้อมูลผู้ใช้
router.get('/account', authenticateToken, getUserInfo);

module.exports = router;
