// API client for interacting with the backend services via API Gateway

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Helper function to add timeout to fetch
const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(url, {
    ...options,
    signal: controller.signal
  });

  clearTimeout(id);
  return response;
};

// Auth API
export const authAPI = {
  // Đăng ký người dùng mới
  register: async (email: string, password: string, fullName: string) => {
    console.log("Sending registration request to API Gateway...");
    const response = await fetchWithTimeout(`${API_URL}/api/direct-register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, full_name: fullName }),
    }, 15000); // 15 second timeout

    if (!response.ok) {
      const error = await response.json();
      console.error("Registration error response:", error);
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();
    console.log("Registration successful:", data);
    return data;
  },

  // Login
  login: async (email: string, password: string) => {
    console.log("Sending login request to API Gateway...");
    const response = await fetchWithTimeout(`${API_URL}/api/direct-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    }, 15000); // 15 second timeout

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();

    // Store token in localStorage and cookie
    if (data.token) {
      try {
        localStorage.setItem('auth_token', data.token);
      } catch (error) {
        console.error('Error storing token in localStorage:', error);
        // Continue even if localStorage fails
      }

      // Also store in cookie for middleware
      document.cookie = `auth_token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
    }

    return data;
  },

  // Đăng xuất
  logout: async () => {
    // Gọi API đăng xuất
    try {
      await fetchWithTimeout(`${API_URL}/api/user-service/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      }, 5000);
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with logout even if API call fails
    }

    // Remove token from localStorage
    try {
      localStorage.removeItem('auth_token');
    } catch (error) {
      console.error('Error removing token from localStorage:', error);
      // Continue even if localStorage fails
    }

    // Remove token from cookie
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';

    // Redirect to home page
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  },
};

// User API
export const userAPI = {
  // Get user profile
  getProfile: async () => {
    let token = null;

    try {
      token = localStorage.getItem('auth_token');
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      // Continue and try to get token from cookie
    }

    // If no token in localStorage, try to get from cookie
    if (!token) {
      const getCookieValue = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
          const part = parts.pop();
          return part ? part.split(';').shift() : null;
        }
        return null;
      };

      token = getCookieValue('auth_token');
    }

    if (!token) {
      console.log("No authentication token found, redirecting to home page");
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      return { profile: null };
    }

    // Only log that we're getting profile, not the actual token
    console.log("Getting user profile...");

    // Use direct profile endpoint to bypass proxy
    const response = await fetchWithTimeout(`${API_URL}/api/direct-profile`, {
      method: 'GET',
      headers: getAuthHeaders(),
    }, 5000);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch profile');
    }

    return response.json();
  },

  // Update user profile
  updateProfile: async (data: { full_name?: string; avatar_url?: string }) => {
    let token = null;

    try {
      token = localStorage.getItem('auth_token');
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      // Continue and try to get token from cookie
    }

    // If no token in localStorage, try to get from cookie
    if (!token) {
      const getCookieValue = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
          const part = parts.pop();
          return part ? part.split(';').shift() : null;
        }
        return null;
      };

      token = getCookieValue('auth_token');
    }

    if (!token) {
      console.log("No authentication token found, redirecting to home page");
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      return { profile: null };
    }

    const response = await fetchWithTimeout(`${API_URL}/api/user-service/users/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }, 5000);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update profile');
    }

    return response.json();
  },
};

// Helper function to check if user is authenticated
export const isAuthenticated = async () => {
  if (typeof window === 'undefined') return false;

  const token = localStorage.getItem('auth_token');
  if (!token) return false;

  // Verify token by making a request to the profile endpoint
  try {
    const response = await fetch(`${API_URL}/api/direct-profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // If response is not ok, token is invalid
    if (!response.ok) {
      // Clear invalid token
      localStorage.removeItem('auth_token');
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error verifying authentication:', error);
    return false;
  }
};

// Helper function to get the authentication token
export const getAuthToken = () => {
  if (typeof window === 'undefined') return null;

  try {
    return localStorage.getItem('auth_token');
  } catch (error) {
    console.error('Error accessing localStorage:', error);
    return null;
  }
};

// Helper function to add auth token to headers
export const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};
