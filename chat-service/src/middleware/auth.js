const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware để xác thực JWT token
const verifyToken = (req, res, next) => {
  // Lấy thông tin client instance từ header nếu có
  const clientInstance = req.headers['x-client-instance'] || 'unknown-client';
  console.log(`[Client: ${clientInstance}] Verifying token for request to ${req.method} ${req.originalUrl}`);

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.log(`[Client: ${clientInstance}] No authorization header provided`);
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    console.log(`[Client: ${clientInstance}] No token in authorization header`);
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  console.log(`[Client: ${clientInstance}] Token found: ${token.substring(0, 10)}...`);

  try {
    if (!process.env.JWT_SECRET) {
      console.error(`[Client: ${clientInstance}] JWT_SECRET environment variable is not configured`);
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`[Client: ${clientInstance}] Token verified successfully for user: ${verified.id}`);
    req.user = verified;
    next();
  } catch (error) {
    console.error(`[Client: ${clientInstance}] JWT verification error:`, error.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = {
  verifyToken
};
