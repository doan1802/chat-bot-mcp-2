const jwt = require('jsonwebtoken');
require('dotenv').config();

// Lưu trữ các phiên đăng nhập đang hoạt động
// Key: clientInstanceId, Value: { userId, lastActivity }
const activeSessions = new Map();

// Hàm dọn dẹp các phiên không hoạt động
const cleanupInactiveSessions = () => {
  const now = Date.now();
  const inactivityThreshold = 30 * 60 * 1000; // 30 phút

  for (const [clientId, session] of activeSessions.entries()) {
    if (now - session.lastActivity > inactivityThreshold) {
      console.log(`Removing inactive session for client: ${clientId}, user: ${session.userId}`);
      activeSessions.delete(clientId);
    }
  }
};

// Thiết lập dọn dẹp định kỳ
setInterval(cleanupInactiveSessions, 5 * 60 * 1000); // Mỗi 5 phút

// Middleware để xác thực JWT token
const verifyToken = (req, res, next) => {
  // Lấy thông tin client instance từ header nếu có
  const clientInstance = req.headers['x-client-instance'] || 'unknown-client';

  // Chỉ log trong môi trường phát triển
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Client: ${clientInstance}] Verifying token for request to ${req.method} ${req.originalUrl}`);
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // Luôn log lỗi xác thực
    console.log(`[Client: ${clientInstance}] No authorization header provided`);
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    // Luôn log lỗi xác thực
    console.log(`[Client: ${clientInstance}] No token in authorization header`);
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  // Không log token vì lý do bảo mật
  // Chỉ log trong môi trường phát triển
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Client: ${clientInstance}] Token found and being verified`);
  }

  try {
    if (!process.env.JWT_SECRET) {
      // Luôn log lỗi cấu hình
      console.error(`[Client: ${clientInstance}] JWT_SECRET environment variable is not configured`);
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET);

    // Đảm bảo rằng id người dùng luôn là chuỗi
    if (verified && verified.id) {
      // Chỉ log trong môi trường phát triển
      if (process.env.NODE_ENV === 'development') {
        // Nếu id bắt đầu bằng "bypass_", đây là id từ môi trường phát triển
        if (typeof verified.id === 'string' && verified.id.startsWith('bypass_')) {
          console.log(`[Client: ${clientInstance}] Development user detected with ID: ${verified.id}`);
        } else {
          console.log(`[Client: ${clientInstance}] Token verified successfully for user: ${verified.id}`);
        }
      }

      // Đảm bảo id luôn là chuỗi để tránh vấn đề so sánh kiểu dữ liệu
      verified.id = String(verified.id);

      // Cập nhật thông tin phiên đăng nhập
      activeSessions.set(clientInstance, {
        userId: verified.id,
        lastActivity: Date.now()
      });

      // Chỉ log số lượng phiên trong môi trường phát triển
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Client: ${clientInstance}] Active sessions: ${activeSessions.size}`);
      }
    } else {
      // Luôn log lỗi xác thực
      console.error(`[Client: ${clientInstance}] Token does not contain user ID`);
      return res.status(401).json({ error: 'Invalid token: missing user ID' });
    }

    req.user = verified;
    next();
  } catch (error) {
    // Luôn log lỗi xác thực
    console.error(`[Client: ${clientInstance}] JWT verification error:`, error.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = {
  verifyToken
};
