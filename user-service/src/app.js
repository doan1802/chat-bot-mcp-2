const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Khởi tạo cache để lưu trữ thông tin người dùng và cài đặt
const userCache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // TTL 5 phút, kiểm tra mỗi 1 phút
const settingsCache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // TTL 5 phút, kiểm tra mỗi 1 phút

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Middleware để xử lý đồng thời
app.use((req, res, next) => {
  // Thêm thông tin worker process vào response header
  res.setHeader('X-Worker-ID', process.pid);

  // Thêm timestamp để theo dõi thời gian xử lý
  req.startTime = Date.now();

  // Log request
  console.log(`[${new Date().toISOString()}] Worker ${process.pid} - ${req.method} ${req.url}`);

  // Middleware để log thời gian xử lý khi request hoàn thành
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    console.log(`[${new Date().toISOString()}] Worker ${process.pid} - ${req.method} ${req.url} completed in ${duration}ms with status ${res.statusCode}`);
  });

  next();
});

// Middleware để sử dụng cache cho các endpoint thường xuyên được gọi
app.use('/api/users/profile', (req, res, next) => {
  if (req.method === 'GET') {
    const userId = req.user?.id;
    if (userId && userCache.has(userId)) {
      console.log(`[${new Date().toISOString()}] Cache hit for user profile: ${userId}`);
      return res.status(200).json({ profile: userCache.get(userId) });
    }
  }
  next();
});

app.use('/api/settings', (req, res, next) => {
  if (req.method === 'GET') {
    const userId = req.user?.id;
    if (userId && settingsCache.has(userId)) {
      console.log(`[${new Date().toISOString()}] Cache hit for user settings: ${userId}`);
      return res.status(200).json({ settings: settingsCache.get(userId) });
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

// Expose cache to routes
app.locals.userCache = userCache;
app.locals.settingsCache = settingsCache;

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);



// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'user-service' });
});



// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
