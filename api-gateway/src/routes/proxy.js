const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { verifyToken } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();

// Proxy middleware options
const userServiceProxy = createProxyMiddleware({
  target: process.env.USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/user-service': '/api', // rewrite path
  },
  onProxyReq: (proxyReq, req, res) => {
    // Log the request
    const startTime = Date.now();
    req.startTime = startTime;
    console.log(`[${new Date().toISOString()}] Proxying request to user service: ${req.method} ${req.originalUrl}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    // Log the response
    const duration = Date.now() - (req.startTime || Date.now());
    console.log(`[${new Date().toISOString()}] Response from user service: ${proxyRes.statusCode} (${duration}ms) for ${req.method} ${req.originalUrl}`);
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

module.exports = router;
