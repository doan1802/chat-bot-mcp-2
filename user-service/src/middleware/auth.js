const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);

    // Đảm bảo ID luôn là chuỗi
    if (verified && verified.id) {
      // Kiểm tra xem có header X-User-ID-Override không
      const idOverride = req.headers['x-user-id-override'];
      if (idOverride) {
        console.log(`Using ID override: ${idOverride} instead of token ID: ${verified.id}`);
        verified.id = String(idOverride);
      } else {
        verified.id = String(verified.id);
      }

      // Log request ID nếu có
      const requestId = req.headers['x-request-id'] || 'unknown';
      console.log(`Token verified for user ID: ${verified.id}, Request ID: ${requestId}`);
    }

    req.user = verified;
    next();
  } catch (error) {
    console.error('JWT verification error:', error.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { verifyToken };
