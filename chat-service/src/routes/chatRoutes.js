const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { verifyToken } = require('../middleware/auth');

// Tất cả các routes đều yêu cầu xác thực
router.use(verifyToken);

// Lấy danh sách cuộc trò chuyện của người dùng
router.get('/', chatController.getUserChats);

// Tạo cuộc trò chuyện mới
router.post('/', chatController.createChat);

// Lấy thông tin cuộc trò chuyện và tin nhắn
router.get('/:chatId', chatController.getChatById);

// Gửi tin nhắn và nhận phản hồi từ Gemini
router.post('/:chatId/messages', chatController.sendMessage);

// Cập nhật tiêu đề cuộc trò chuyện
router.put('/:chatId', chatController.updateChatTitle);

// Xóa cuộc trò chuyện
router.delete('/:chatId', chatController.deleteChat);

module.exports = router;
