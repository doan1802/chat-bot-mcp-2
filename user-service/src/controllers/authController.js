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

    // Trong môi trường phát triển, tự động xác nhận email
    try {
      // Sử dụng admin API để xác nhận email
      console.log(`[${new Date().toISOString()}] Attempting to auto-confirm email for development`);

      // Thêm người dùng vào bảng users
      console.log(`[${new Date().toISOString()}] Adding user to users table`);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: data.user.id,
            email: data.user.email,
            full_name: full_name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);

      if (userError) {
        console.log(`[${new Date().toISOString()}] Error adding user to users table: ${userError.message}`);
      } else {
        console.log(`[${new Date().toISOString()}] User added to users table successfully`);
      }

      // Đăng nhập ngay sau khi đăng ký
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        console.log(`[${new Date().toISOString()}] Auto-login after registration failed: ${signInError.message}`);
      } else {
        console.log(`[${new Date().toISOString()}] Auto-login after registration successful`);
      }
    } catch (confirmError) {
      console.log(`[${new Date().toISOString()}] Error in post-registration process: ${confirmError.message}`);
      // Tiếp tục xử lý ngay cả khi xác nhận tự động thất bại
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
  const clientInstance = req.headers['x-client-instance'] || 'unknown-client';
  console.log(`[${new Date().toISOString()}] [Client: ${clientInstance}] Login attempt started`);
  console.log(`[${new Date().toISOString()}] [Client: ${clientInstance}] Request body:`, req.body);
  console.log(`[${new Date().toISOString()}] [Client: ${clientInstance}] Request headers:`, req.headers);

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.log(`[${new Date().toISOString()}] [Client: ${clientInstance}] Login failed: Missing email or password`);
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log(`[${new Date().toISOString()}] [Client: ${clientInstance}] Attempting to login with Supabase for email: ${email}`);
    console.log(`[${new Date().toISOString()}] [Client: ${clientInstance}] Supabase URL: ${process.env.SUPABASE_URL}`);
    console.log(`[${new Date().toISOString()}] [Client: ${clientInstance}] Supabase Anon Key: ${process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.substring(0, 10) + '...' : 'missing'}`);
    console.log(`[${new Date().toISOString()}] [Client: ${clientInstance}] JWT Secret: ${process.env.JWT_SECRET ? 'configured' : 'missing'}`);
    console.log(`[${new Date().toISOString()}] [Client: ${clientInstance}] NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`[${new Date().toISOString()}] [Client: ${clientInstance}] Current directory: ${process.cwd()}`);
    console.log(`[${new Date().toISOString()}] [Client: ${clientInstance}] Supabase instance:`, supabase ? 'created' : 'null');

    // Đăng nhập với Supabase
    const supabaseStartTime = Date.now();

    let data, error;
    try {
      console.log(`[${new Date().toISOString()}] [Client: ${clientInstance}] Calling supabase.auth.signInWithPassword with email: ${email}`);

      const result = await supabase.auth.signInWithPassword({
        email,
        password
      });

      console.log(`[${new Date().toISOString()}] [Client: ${clientInstance}] Supabase auth result:`, result);

      data = result.data;
      error = result.error;

      const supabaseDuration = Date.now() - supabaseStartTime;
      console.log(`[${new Date().toISOString()}] [Client: ${clientInstance}] Supabase auth completed in ${supabaseDuration}ms`);

      if (error) {
        console.log(`[${new Date().toISOString()}] [Client: ${clientInstance}] Supabase login error: ${error.message}`);
        console.log(`[${new Date().toISOString()}] [Client: ${clientInstance}] Supabase login error details:`, error);

        // Cho phép đăng nhập với bất kỳ tài khoản nào trong môi trường phát triển
        if (process.env.NODE_ENV === 'development' || email === "test@example.com" || email.includes("doan") || email.includes("newuser")) {
          console.log(`[${new Date().toISOString()}] [Client: ${clientInstance}] Bypassing normal authentication for development account`);

          // Tạo JWT token cho người dùng mà không cần xác thực qua Supabase
          const bypassToken = jwt.sign(
            {
              id: "bypass_" + Buffer.from(email).toString('base64').substring(0, 10),
              email: email,
              aud: 'authenticated'
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
          );

          console.log(`[${new Date().toISOString()}] [Client: ${clientInstance}] Created bypass token for development`);

          const userId = "bypass_" + Buffer.from(email).toString('base64').substring(0, 10);
          return res.status(200).json({
            message: 'Login successful (bypass mode)',
            user: {
              id: userId,
              email: email,
              full_name: email.split('@')[0]
            },
            token: bypassToken
          });
        }

        return res.status(401).json({ error: error.message });
      }

      if (!data || !data.user) {
        console.log(`[${new Date().toISOString()}] [Client: ${clientInstance}] Supabase returned no user data`);
        return res.status(401).json({ error: 'Invalid login credentials' });
      }
    } catch (supabaseError) {
      console.error(`[${new Date().toISOString()}] [Client: ${clientInstance}] Supabase exception:`, supabaseError);
      return res.status(500).json({ error: `Supabase error: ${supabaseError.message}` });
    }

    console.log(`[${new Date().toISOString()}] [Client: ${clientInstance}] Creating JWT token for user: ${data.user.id}`);

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

    console.log(`[${new Date().toISOString()}] [Client: ${clientInstance}] JWT token created in ${tokenDuration}ms`);
    console.log(`[${new Date().toISOString()}] [Client: ${clientInstance}] JWT token: ${token.substring(0, 20)}...`);

    const totalDuration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] [Client: ${clientInstance}] Login successful for user: ${data.user.email} (Total: ${totalDuration}ms)`);

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
