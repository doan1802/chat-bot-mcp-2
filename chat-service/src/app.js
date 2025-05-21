const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
require('dotenv').config();

const chatRoutes = require('./routes/chatRoutes');

// Khởi tạo cache để lưu trữ thông tin chat và tin nhắn
// Tăng thời gian cache để giảm số lần truy vấn database
const chatCache = new NodeCache({ stdTTL: 900, checkperiod: 300 }); // TTL 15 phút, kiểm tra mỗi 5 phút
const messageCache = new NodeCache({ stdTTL: 900, checkperiod: 300 }); // TTL 15 phút, kiểm tra mỗi 5 phút

// Lưu trữ các phiên chat đang hoạt động
// Key: chatId, Value: { userId, clientInstance, lastActivity, isProcessing }
const activeChats = new Map();

// Hàm dọn dẹp các phiên chat không hoạt động
const cleanupInactiveChats = () => {
  const now = Date.now();
  const inactivityThreshold = 30 * 60 * 1000; // 30 phút

  for (const [chatId, session] of activeChats.entries()) {
    if (now - session.lastActivity > inactivityThreshold) {
      console.log(`[Worker ${process.pid}] Removing inactive chat session for chat: ${chatId}, user: ${session.userId}`);
      activeChats.delete(chatId);
    }
  }
};

// Thiết lập dọn dẹp định kỳ
setInterval(cleanupInactiveChats, 5 * 60 * 1000); // Mỗi 5 phút

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Instance', 'X-Request-ID'],
  credentials: true
}));
app.use(express.json());

// Middleware để đảm bảo header X-Client-Instance luôn được xử lý đúng
app.use((req, res, next) => {
  // Kiểm tra và xử lý header X-Client-Instance
  const clientInstance = req.headers['x-client-instance'];

  // Nếu không có header X-Client-Instance, log cảnh báo trong môi trường phát triển
  if (!clientInstance && process.env.NODE_ENV === 'development') {
    console.log(`[${new Date().toISOString()}] Warning: Missing X-Client-Instance header for ${req.method} ${req.url}`);
  }

  next();
});

// Middleware để xử lý đồng thời
app.use((req, res, next) => {
  // Thêm thông tin worker process vào response header
  res.setHeader('X-Worker-ID', process.pid);

  // Thêm timestamp để theo dõi thời gian xử lý
  req.startTime = Date.now();

  // Chỉ log request trong môi trường phát triển hoặc không phải OPTIONS/health check
  if ((process.env.NODE_ENV === 'development' || req.method !== 'OPTIONS') &&
      !req.url.includes('/health')) {
    console.log(`[${new Date().toISOString()}] Worker ${process.pid} - ${req.method} ${req.url}`);
  }

  // Middleware để log thời gian xử lý khi request hoàn thành
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;

    // Chỉ log các response chậm (> 1000ms) hoặc lỗi
    if (duration > 1000 || res.statusCode >= 400) {
      console.log(`[${new Date().toISOString()}] Worker ${process.pid} - ${req.method} ${req.url} completed in ${duration}ms with status ${res.statusCode}`);
    }
    // Trong môi trường phát triển, log thêm các request không phải OPTIONS và health check
    else if (process.env.NODE_ENV === 'development' &&
             req.method !== 'OPTIONS' &&
             !req.url.includes('/health')) {
      console.log(`[${new Date().toISOString()}] Worker ${process.pid} - ${req.method} ${req.url} completed in ${duration}ms with status ${res.statusCode}`);
    }
  });

  next();
});

// Middleware để sử dụng cache cho các endpoint thường xuyên được gọi
app.use('/api/chats', (req, res, next) => {
  if (req.method === 'GET' && !req.params.chatId) {
    const userId = req.user?.id;
    const cacheKey = `chats_${userId}`;
    if (userId && chatCache.has(cacheKey)) {
      // Chỉ log cache hit trong môi trường phát triển
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Worker ${process.pid}] Cache hit for user chats: ${userId}`);
      }
      return res.status(200).json({ chats: chatCache.get(cacheKey) });
    }
  }
  next();
});

// Middleware để giới hạn số lượng request đồng thời
const activeRequests = new Map();
const MAX_CONCURRENT_REQUESTS = 100; // Giới hạn số lượng request đồng thời

app.use((req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress;
  const currentRequests = activeRequests.get(clientIp) || 0;

  if (currentRequests >= MAX_CONCURRENT_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  activeRequests.set(clientIp, currentRequests + 1);

  res.on('finish', () => {
    const updatedRequests = activeRequests.get(clientIp) - 1;
    if (updatedRequests <= 0) {
      activeRequests.delete(clientIp);
    } else {
      activeRequests.set(clientIp, updatedRequests);
    }
  });

  next();
});

// Middleware để quản lý phiên chat
app.use('/api/chats/:chatId/messages', (req, res, next) => {
  if (req.method === 'POST') {
    const chatId = req.params.chatId;
    const userId = req.user?.id;
    const clientInstance = req.headers['x-client-instance'] || 'unknown-client';

    // Kiểm tra xem chat này đã đang được xử lý bởi client khác không
    if (activeChats.has(chatId)) {
      const chatSession = activeChats.get(chatId);

      // Nếu chat đang được xử lý bởi client khác
      if (chatSession.isProcessing && chatSession.clientInstance !== clientInstance) {
        // Luôn log xung đột phiên chat vì đây là thông tin quan trọng
        console.log(`[Worker ${process.pid}] Chat ${chatId} is already being processed by client ${chatSession.clientInstance}, requested by ${clientInstance}`);
        return res.status(409).json({
          error: 'This chat is currently being processed by another session. Please try again later.'
        });
      }

      // Cập nhật thông tin phiên chat
      chatSession.lastActivity = Date.now();
      chatSession.clientInstance = clientInstance;
      chatSession.isProcessing = true;
    } else {
      // Tạo phiên chat mới
      activeChats.set(chatId, {
        userId,
        clientInstance,
        lastActivity: Date.now(),
        isProcessing: true
      });
    }

    // Middleware để đánh dấu phiên chat không còn được xử lý khi request hoàn thành
    res.on('finish', () => {
      if (activeChats.has(chatId)) {
        activeChats.get(chatId).isProcessing = false;
        activeChats.get(chatId).lastActivity = Date.now();
      }
    });
  }

  next();
});

// Expose cache and active chats to routes
app.locals.chatCache = chatCache;
app.locals.messageCache = messageCache;
app.locals.activeChats = activeChats;

// Routes
app.use('/api/chats', chatRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'chat-service' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
