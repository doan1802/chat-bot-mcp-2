const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Đăng ký người dùng mới
const register = async (req, res) => {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Registration attempt started`);

  try {
    const { email, password, full_name } = req.body;

    console.log(`[${new Date().toISOString()}] Registration request received for email: ${email}`);

    if (!email || !password || !full_name) {
      console.log(`[${new Date().toISOString()}] Registration failed: Missing required fields`);
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    // Đăng ký người dùng với Supabase
    console.log(`[${new Date().toISOString()}] Attempting to register with Supabase for email: ${email}`);
    const supabaseStartTime = Date.now();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name
        }
      }
    });

    const supabaseDuration = Date.now() - supabaseStartTime;
    console.log(`[${new Date().toISOString()}] Supabase registration completed in ${supabaseDuration}ms`);

    if (error) {
      console.log(`[${new Date().toISOString()}] Supabase registration error: ${error.message}`);
      return res.status(400).json({ error: error.message });
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Registration successful for user: ${data.user.email} (Total: ${totalDuration}ms)`);

    return res.status(201).json({
      message: 'Registration successful! Please check your email for confirmation.',
      user: {
        id: data.user.id,
        email: data.user.email
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${new Date().toISOString()}] Registration error after ${duration}ms:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Đăng nhập người dùng
const login = async (req, res) => {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Login attempt started`);

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.log(`[${new Date().toISOString()}] Login failed: Missing email or password`);
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log(`[${new Date().toISOString()}] Attempting to login with Supabase for email: ${email}`);

    // Đăng nhập với Supabase
    const supabaseStartTime = Date.now();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    const supabaseDuration = Date.now() - supabaseStartTime;

    console.log(`[${new Date().toISOString()}] Supabase auth completed in ${supabaseDuration}ms`);

    if (error) {
      console.log(`[${new Date().toISOString()}] Supabase login error: ${error.message}`);
      return res.status(401).json({ error: error.message });
    }

    console.log(`[${new Date().toISOString()}] Creating JWT token for user: ${data.user.id}`);

    // Tạo JWT token
    const tokenStartTime = Date.now();
    const token = jwt.sign(
      {
        id: data.user.id,
        email: data.user.email,
        aud: 'authenticated'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    const tokenDuration = Date.now() - tokenStartTime;

    console.log(`[${new Date().toISOString()}] JWT token created in ${tokenDuration}ms`);

    const totalDuration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Login successful for user: ${data.user.email} (Total: ${totalDuration}ms)`);

    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email
      },
      token
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${new Date().toISOString()}] Login error after ${duration}ms:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Đăng xuất người dùng
const logout = async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  register,
  login,
  logout
};
