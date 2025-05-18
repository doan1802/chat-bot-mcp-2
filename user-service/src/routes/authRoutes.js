const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Đăng ký người dùng mới
router.post('/register', authController.register);

// Đăng nhập
router.post('/login', authController.login);

// Đăng xuất
router.post('/logout', authController.logout);

module.exports = router;
