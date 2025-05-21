const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { verifyToken } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();

// Proxy middleware options for user service
const userServiceProxy = createProxyMiddleware({
  target: process.env.USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/user-service': '/api', // rewrite path
  },
  // Tăng timeout để xử lý các request lâu hơn
  proxyTimeout: 30000, // 30 giây
  // Tối ưu hóa buffer để tăng hiệu suất
  buffer: {
    enabled: true,
    maxBodySize: 10 * 1024 * 1024, // 10MB
  },
  onProxyReq: (_proxyReq, req, _res) => {
    // Luôn ghi lại thời gian bắt đầu để tính thời gian xử lý
    req.startTime = Date.now();

    // Chỉ log trong môi trường phát triển và không phải OPTIONS hoặc health check
    if (process.env.NODE_ENV === 'development' &&
        req.method !== 'OPTIONS' &&
        !req.originalUrl.includes('/health')) {
      console.log(`[${new Date().toISOString()}] Proxying request to user service: ${req.method} ${req.originalUrl}`);
    }
  },
  onProxyRes: (proxyRes, req, _res) => {
    // Tính thời gian xử lý
    const duration = Date.now() - (req.startTime || Date.now());

    // Chỉ log các response chậm (> 1000ms) hoặc lỗi
    if (duration > 1000 || proxyRes.statusCode >= 400) {
      console.log(`[${new Date().toISOString()}] Response from user service: ${proxyRes.statusCode} (${duration}ms) for ${req.method} ${req.originalUrl}`);
    }
    // Trong môi trường phát triển, log thêm các request không phải OPTIONS và health check
    else if (process.env.NODE_ENV === 'development' &&
             req.method !== 'OPTIONS' &&
             !req.originalUrl.includes('/health')) {
      console.log(`[${new Date().toISOString()}] Response from user service: ${proxyRes.statusCode} (${duration}ms) for ${req.method} ${req.originalUrl}`);
    }
  },
  onError: (err, req, res) => {
    console.error(`[${new Date().toISOString()}] Proxy error: ${err.message} for ${req.method} ${req.originalUrl}`);
    res.status(500).json({ error: 'Proxy error', message: err.message });
  }
});

// Proxy middleware options for chat service
const chatServiceProxy = createProxyMiddleware({
  target: process.env.CHAT_SERVICE_URL || 'http://localhost:3004',
  changeOrigin: true,
  pathRewrite: {
    '^/api/chat-service': '/api', // rewrite path
  },
  // Tăng timeout để xử lý các request lâu hơn, đặc biệt là gọi Gemini API
  proxyTimeout: 60000, // 60 giây
  // Tối ưu hóa buffer để tăng hiệu suất
  buffer: {
    enabled: true,
    maxBodySize: 10 * 1024 * 1024, // 10MB
  },
  onProxyReq: (_proxyReq, req, _res) => {
    // Luôn ghi lại thời gian bắt đầu để tính thời gian xử lý
    req.startTime = Date.now();

    // Chỉ log trong môi trường phát triển và không phải OPTIONS hoặc health check
    if (process.env.NODE_ENV === 'development' &&
        req.method !== 'OPTIONS' &&
        !req.originalUrl.includes('/health')) {
      console.log(`[${new Date().toISOString()}] Proxying request to chat service: ${req.method} ${req.originalUrl}`);
    }
  },
  onProxyRes: (proxyRes, req, _res) => {
    // Tính thời gian xử lý
    const duration = Date.now() - (req.startTime || Date.now());

    // Chỉ log các response chậm (> 1000ms) hoặc lỗi
    if (duration > 1000 || proxyRes.statusCode >= 400) {
      console.log(`[${new Date().toISOString()}] Response from chat service: ${proxyRes.statusCode} (${duration}ms) for ${req.method} ${req.originalUrl}`);
    }
    // Trong môi trường phát triển, log thêm các request không phải OPTIONS và health check
    else if (process.env.NODE_ENV === 'development' &&
             req.method !== 'OPTIONS' &&
             !req.originalUrl.includes('/health')) {
      console.log(`[${new Date().toISOString()}] Response from chat service: ${proxyRes.statusCode} (${duration}ms) for ${req.method} ${req.originalUrl}`);
    }
  },
  onError: (err, req, res) => {
    console.error(`[${new Date().toISOString()}] Proxy error: ${err.message} for ${req.method} ${req.originalUrl}`);
    res.status(500).json({ error: 'Proxy error', message: err.message });
  }
});

// Public routes (không yêu cầu xác thực)
router.use('/api/user-service/auth', userServiceProxy);

// Protected routes (yêu cầu xác thực)
router.use('/api/user-service/users', verifyToken, userServiceProxy);
router.use('/api/user-service/settings', verifyToken, userServiceProxy);

// Chat service routes (yêu cầu xác thực)
router.use('/api/chat-service/chats', verifyToken, chatServiceProxy);

module.exports = router;
