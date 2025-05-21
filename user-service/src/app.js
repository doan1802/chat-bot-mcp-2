const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Khởi tạo cache để lưu trữ thông tin người dùng và cài đặt
const userCache = new NodeCache({
  stdTTL: 600,       // TTL 10 phút
  checkperiod: 120,  // Kiểm tra mỗi 2 phút
  useClones: false,  // Không sử dụng clone để tăng hiệu suất
  deleteOnExpire: true // Xóa key khi hết hạn
});

const settingsCache = new NodeCache({
  stdTTL: 600,       // TTL 10 phút
  checkperiod: 120,  // Kiểm tra mỗi 2 phút
  useClones: false,  // Không sử dụng clone để tăng hiệu suất
  deleteOnExpire: true // Xóa key khi hết hạn
});

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Instance', 'X-Request-ID'],
  credentials: true
}));
app.use(express.json());

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
app.use('/api/users/profile', (req, res, next) => {
  if (req.method === 'GET') {
    // Đảm bảo req.user đã được xác thực
    if (!req.user) {
      return next();
    }

    // Đảm bảo userId là chuỗi
    const userId = String(req.user.id);

    // Kiểm tra cache
    if (userId && userCache.has(userId)) {
      // Lấy dữ liệu từ cache
      const cachedProfile = userCache.get(userId);

      // Chỉ log cache hit trong môi trường phát triển
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${new Date().toISOString()}] Cache hit for user profile: ${userId}`);
      }

      // Thêm header để biết dữ liệu đến từ cache
      res.setHeader('X-Cache', 'HIT');

      return res.status(200).json({ profile: cachedProfile });
    } else {
      // Thêm header để biết dữ liệu không đến từ cache
      res.setHeader('X-Cache', 'MISS');

      // Log cache miss trong môi trường phát triển
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${new Date().toISOString()}] Cache miss for user profile: ${userId}`);
      }
    }
  }
  next();
});

app.use('/api/settings', (req, res, next) => {
  if (req.method === 'GET') {
    // Đảm bảo req.user đã được xác thực
    if (!req.user) {
      return next();
    }

    // Đảm bảo userId là chuỗi
    const userId = String(req.user.id);

    // Kiểm tra cache
    if (userId && settingsCache.has(userId)) {
      // Lấy dữ liệu từ cache
      const cachedSettings = settingsCache.get(userId);

      // Chỉ log cache hit trong môi trường phát triển
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${new Date().toISOString()}] Cache hit for user settings: ${userId}`);
      }

      // Thêm header để biết dữ liệu đến từ cache
      res.setHeader('X-Cache', 'HIT');

      return res.status(200).json({ settings: cachedSettings });
    } else {
      // Thêm header để biết dữ liệu không đến từ cache
      res.setHeader('X-Cache', 'MISS');

      // Log cache miss trong môi trường phát triển
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${new Date().toISOString()}] Cache miss for user settings: ${userId}`);
      }
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
