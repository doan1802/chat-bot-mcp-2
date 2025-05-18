const express = require('express');
const cors = require('cors');
require('dotenv').config();

const proxyRoutes = require('./routes/proxy');

const app = express();

// Middleware
// Only log requests in development environment
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    // Skip logging for OPTIONS requests
    if (req.method !== 'OPTIONS') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    next();
  });
} else {
  app.use((req, res, next) => next());
}

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use(proxyRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  // Only log health checks in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${new Date().toISOString()}] Health check requested`);
  }
  res.status(200).json({ status: 'ok', service: 'api-gateway' });
});



// Direct endpoints (bypass proxy)
app.post('/api/direct-register', async (req, res) => {
  try {
    const startTime = Date.now();

    // Always log registration attempts with masked email
    const regMaskedEmail = req.body.email ?
      `${req.body.email.substring(0, 3)}***@${req.body.email.split('@')[1]}` :
      'unknown';
    console.log(`[${new Date().toISOString()}] Registration attempt for: ${regMaskedEmail}`);

    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    // Call User Service directly
    const fetch = require('node-fetch');
    const userServiceUrl = process.env.USER_SERVICE_URL;

    if (!userServiceUrl) {
      return res.status(500).json({ error: 'USER_SERVICE_URL not configured' });
    }

    // Always log forwarded registration requests
    console.log(`[${new Date().toISOString()}] Forwarding registration to User Service for: ${regMaskedEmail}`);

    const response = await fetch(`${userServiceUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password, full_name }),
      timeout: 10000
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json();
      // Always log registration failures
      console.error(`[${new Date().toISOString()}] Registration failed for: ${regMaskedEmail} (${duration}ms)`);
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();

    // Always log successful registrations
    console.log(`[${new Date().toISOString()}] Registration successful for: ${regMaskedEmail} (${duration}ms)`);

    return res.status(201).json(data);
  } catch (error) {
    // Always log internal server errors
    console.error(`[${new Date().toISOString()}] Internal server error in registration endpoint:`, error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/direct-login', async (req, res) => {
  try {
    const startTime = Date.now();

    // Always log login attempts with masked email for security
    const maskedEmail = req.body.email ?
      `${req.body.email.substring(0, 3)}***@${req.body.email.split('@')[1]}` :
      'unknown';
    console.log(`[${new Date().toISOString()}] Login attempt for: ${maskedEmail}`);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // For test user in development environment only
    if (process.env.NODE_ENV === 'development' && email === 'test@example.com' && password === 'password123') {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        {
          id: '123456',
          email: email,
          aud: 'authenticated'
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      const duration = Date.now() - startTime;

      // Always log successful logins for test user
      console.log(`[${new Date().toISOString()}] Login successful for test user (${duration}ms)`);

      return res.status(200).json({
        message: 'Login successful',
        user: {
          id: '123456',
          email: email,
          full_name: 'Test User',
          avatar_url: null
        },
        token
      });
    }

    // For other users, call User Service directly
    const fetch = require('node-fetch');
    const userServiceUrl = process.env.USER_SERVICE_URL;

    if (!userServiceUrl) {
      return res.status(500).json({ error: 'USER_SERVICE_URL not configured' });
    }

    console.log(`[${new Date().toISOString()}] Calling User Service login endpoint directly...`);

    const response = await fetch(`${userServiceUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password }),
      timeout: 5000
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json();
      // Only log error details in development
      if (process.env.NODE_ENV === 'development') {
        console.error(`[${new Date().toISOString()}] Login failed (${duration}ms)`);
      }
      return res.status(response.status).json(errorData);
    }

    const loginData = await response.json();

    // Always log successful logins with masked email
    const loginMaskedEmail = loginData.user && loginData.user.email ?
      `${loginData.user.email.substring(0, 3)}***@${loginData.user.email.split('@')[1]}` :
      'unknown';
    console.log(`[${new Date().toISOString()}] Login successful for user: ${loginMaskedEmail} (${duration}ms)`);

    // Get user profile in the same request to avoid multiple API calls from frontend
    try {
      // Call User Service profile endpoint
      const profileResponse = await fetch(`${userServiceUrl}/api/users/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        },
        timeout: 5000
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();

        // Merge profile data with user data
        if (profileData.profile) {
          loginData.user = {
            ...loginData.user,
            full_name: profileData.profile.full_name,
            avatar_url: profileData.profile.avatar_url
          };
        }
      }
    } catch (profileError) {
      // Continue even if profile fetch fails
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${new Date().toISOString()}] Could not fetch profile, continuing with basic user data`);
      }
    }

    return res.status(200).json(loginData);
  } catch (error) {
    // Always log internal server errors
    console.error(`[${new Date().toISOString()}] Internal server error in login endpoint:`, error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Direct profile endpoint (bypasses proxy)
app.get('/api/direct-profile', async (req, res) => {
  try {
    const startTime = Date.now();
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Always log profile requests
    console.log(`[${new Date().toISOString()}] Profile request received`);

    // Verify token
    const jwt = require('jsonwebtoken');
    const token = authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET);

      // Always log verified tokens with masked email
      const profileMaskedEmail = verified.email ?
        `${verified.email.substring(0, 3)}***@${verified.email.split('@')[1]}` :
        'unknown';
      console.log(`[${new Date().toISOString()}] Token verified for user: ${profileMaskedEmail}`);

      // For test user in development environment only
      if (process.env.NODE_ENV === 'development' && verified.email === 'test@example.com') {
        // Always log test user profile responses
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] Returning test user profile (${duration}ms)`);

        return res.status(200).json({
          profile: {
            id: verified.id,
            email: verified.email,
            full_name: 'Test User',
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        });
      }

      // For other users, call User Service directly
      const fetch = require('node-fetch');
      const userServiceUrl = process.env.USER_SERVICE_URL;

      if (!userServiceUrl) {
        return res.status(500).json({ error: 'USER_SERVICE_URL not configured' });
      }

      // Always log forwarded requests
      console.log(`[${new Date().toISOString()}] Forwarding profile request to User Service for: ${profileMaskedEmail}`);

      const response = await fetch(`${userServiceUrl}/api/users/profile`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader
        },
        timeout: 5000
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json();
        // Always log profile request failures
        console.error(`[${new Date().toISOString()}] Profile request failed for user: ${profileMaskedEmail} (${duration}ms)`);
        return res.status(response.status).json(errorData);
      }

      const data = await response.json();

      // Always log successful profile requests
      console.log(`[${new Date().toISOString()}] Profile request successful for user: ${profileMaskedEmail} (${duration}ms)`);

      return res.status(200).json(data);
    } catch (jwtError) {
      // Always log JWT verification failures
      console.error(`[${new Date().toISOString()}] JWT verification failed for token: ${token.substring(0, 10)}...`);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    // Always log internal server errors
    console.error(`[${new Date().toISOString()}] Internal server error in profile endpoint:`, error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});



// Error handling middleware
app.use((err, _req, res, _next) => {
  // Always log errors, but with different detail levels based on environment
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${new Date().toISOString()}] Error:`, err.message, err.stack);
  } else {
    // In production, just log the error message without the stack trace
    console.error(`[${new Date().toISOString()}] Server error:`, err.message);
  }

  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
