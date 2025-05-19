/**
 * Middleware để xác thực token admin
 * Token admin được cấu hình trong file .env
 */
const verifyAdminToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    const token = authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    // Kiểm tra token với ADMIN_SECRET_KEY trong .env
    if (token !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({ error: 'Access denied. Invalid admin token.' });
    }
    
    // Token hợp lệ, cho phép tiếp tục
    next();
  } catch (error) {
    console.error('Admin token verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = verifyAdminToken;
