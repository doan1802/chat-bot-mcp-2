const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');

// Lấy thông tin người dùng - yêu cầu xác thực
router.get('/profile', verifyToken, userController.getUserProfile);

// Cập nhật thông tin người dùng - yêu cầu xác thực
router.put('/profile', verifyToken, userController.updateUserProfile);

module.exports = router;
