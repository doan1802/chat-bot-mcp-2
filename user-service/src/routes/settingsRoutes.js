const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { verifyToken } = require('../middleware/auth');

// Lấy thông tin cài đặt người dùng - yêu cầu xác thực
router.get('/', verifyToken, settingsController.getUserSettings);

// Cập nhật thông tin cài đặt người dùng - yêu cầu xác thực
router.put('/', verifyToken, settingsController.updateUserSettings);

module.exports = router;
