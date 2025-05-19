// API client for interacting with the backend services via API Gateway

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Helper function to add timeout to fetch with retry logic
const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 10000, maxRetries = 2) => {
  console.log(`Fetching ${url} with method ${options.method}`);

  let retries = 0;

  const attemptFetch = async (): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => {
      console.log(`Request to ${url} timed out after ${timeout}ms`);
      controller.abort();
    }, timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      console.log(`Response from ${url}: ${response.status}`);

      clearTimeout(id);
      return response;
    } catch (error: any) {
      clearTimeout(id);

      // Check if it's a timeout error (AbortError)
      if (error.name === 'AbortError' && retries < maxRetries) {
        retries++;
        const waitTime = 1000 * retries; // Exponential backoff: 1s, 2s, etc.
        console.log(`Retry ${retries}/${maxRetries} for ${url} after ${waitTime}ms`);

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return attemptFetch();
      }

      console.error(`Fetch error for ${url} after ${retries} retries:`, error);
      throw error;
    }
  };

  return attemptFetch();
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
    }, 10000); // Tăng timeout lên 10 giây

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

// Settings API
export const settingsAPI = {
  // Get user settings
  getSettings: async () => {
    const token = getAuthToken();
    if (!token) {
      console.log("No authentication token found, redirecting to home page");
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      return { settings: null };
    }

    console.log("Getting user settings...");

    // Use direct settings endpoint to bypass proxy
    const response = await fetchWithTimeout(`${API_URL}/api/direct-settings`, {
      method: 'GET',
      headers: getAuthHeaders(),
    }, 5000);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch settings');
    }

    return response.json();
  },

  // Update user settings
  updateSettings: async (data: {
    theme?: string;
    language?: string;
    gemini_api_key?: string;
    vapi_api_key?: string;
    raper_url?: string;
  }) => {
    const token = getAuthToken();
    if (!token) {
      console.log("No authentication token found, redirecting to home page");
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      return { settings: null };
    }

    // Use direct settings endpoint to bypass proxy
    const response = await fetchWithTimeout(`${API_URL}/api/direct-settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }, 5000);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update settings');
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
    console.log("Verifying authentication token...");
    const response = await fetchWithTimeout(`${API_URL}/api/direct-profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, 10000, 2); // 10 second timeout with 2 retries

    // If response is not ok, token is invalid
    if (!response.ok) {
      console.log("Authentication token is invalid, clearing token");
      // Clear invalid token
      localStorage.removeItem('auth_token');
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      return false;
    }

    console.log("Authentication token is valid");
    return true;
  } catch (error: any) {
    console.error('Error verifying authentication:', error);
    // Only clear token if it's not a network error
    if (error && error.name !== 'TypeError' && error.name !== 'NetworkError') {
      localStorage.removeItem('auth_token');
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    }
    return false;
  }
};

// Chat API
export const chatAPI = {
  // Lấy danh sách cuộc trò chuyện
  getChats: async () => {
    const token = getAuthToken();
    if (!token) {
      console.log("No authentication token found, redirecting to home page");
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      return { chats: [] };
    }

    const response = await fetchWithTimeout(`${API_URL}/api/direct-chats`, {
      method: 'GET',
      headers: getAuthHeaders(),
    }, 5000);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch chats');
    }

    return response.json();
  },

  // Tạo cuộc trò chuyện mới
  createChat: async (title?: string) => {
    const token = getAuthToken();
    if (!token) {
      console.log("No authentication token found, redirecting to home page");
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      return { chat: null };
    }

    const response = await fetchWithTimeout(`${API_URL}/api/direct-chats`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title: title || 'New Chat' }),
    }, 5000);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create chat');
    }

    return response.json();
  },

  // Lấy thông tin cuộc trò chuyện và tin nhắn
  getChatById: async (chatId: string) => {
    const token = getAuthToken();
    if (!token) {
      console.log("No authentication token found, redirecting to home page");
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      return { chat: null, messages: [] };
    }

    const response = await fetchWithTimeout(`${API_URL}/api/direct-chats/${chatId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    }, 5000);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch chat');
    }

    return response.json();
  },

  // Gửi tin nhắn và nhận phản hồi
  sendMessage: async (chatId: string, content: string): Promise<{ userMessage: any, assistantMessage: any }> => {
    console.log(`Preparing to send message to chat ID: ${chatId}`);

    const token = getAuthToken();
    if (!token) {
      console.log("No authentication token found, redirecting to home page");
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      return { userMessage: null, assistantMessage: null };
    }

    console.log(`Using auth token: ${token.substring(0, 10)}...`);
    console.log(`Sending message to API: ${API_URL}/api/direct-chats/${chatId}/messages`);

    try {
      const response = await fetchWithTimeout(`${API_URL}/api/direct-chats/${chatId}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content }),
      }, 30000); // Tăng timeout vì có thể mất thời gian để gọi Gemini API

      console.log(`Response status: ${response.status}`);

      if (!response.ok) {
        const error = await response.json();
        console.error(`API error response:`, error);

        // Xử lý lỗi 409 Conflict (chat đang được xử lý bởi phiên khác)
        if (response.status === 409) {
          // Đợi 2 giây và thử lại, tối đa 3 lần
          const maxRetries = 3;
          let retryCount = 0;
          let retryDelay = 2000; // 2 giây

          const retry = async (): Promise<{ userMessage: any, assistantMessage: any }> => {
            retryCount++;
            console.log(`Retry attempt ${retryCount}/${maxRetries}: Chat is being processed by another session. Waiting ${retryDelay/1000} seconds...`);

            await new Promise(resolve => setTimeout(resolve, retryDelay));

            try {
              const retryResponse = await fetchWithTimeout(`${API_URL}/api/direct-chats/${chatId}/messages`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ content }),
              }, 30000);

              if (!retryResponse.ok) {
                const retryError = await retryResponse.json();

                if (retryResponse.status === 409 && retryCount < maxRetries) {
                  // Tăng thời gian chờ mỗi lần thử lại
                  retryDelay = retryDelay * 1.5;
                  return retry();
                }

                throw new Error(retryError.error || 'Failed to send message after retries');
              }

              const retryData = await retryResponse.json();
              console.log(`Message sent successfully after ${retryCount} retries`);
              return retryData;
            } catch (retryError) {
              console.error(`Error in retry attempt ${retryCount}:`, retryError);
              if (retryCount < maxRetries) {
                retryDelay = retryDelay * 1.5;
                return retry();
              }
              throw retryError;
            }
          };

          return retry();
        }

        throw new Error(error.error || 'Failed to send message');
      }

      const data = await response.json();
      console.log(`Message sent successfully, received response with IDs: ${data.userMessage?.id}, ${data.assistantMessage?.id}`);
      return data;
    } catch (error) {
      console.error(`Error in sendMessage:`, error);
      throw error;
    }
  },

  // Cập nhật tiêu đề cuộc trò chuyện
  updateChatTitle: async (chatId: string, title: string) => {
    const token = getAuthToken();
    if (!token) {
      console.log("No authentication token found, redirecting to home page");
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      return { chat: null };
    }

    const response = await fetchWithTimeout(`${API_URL}/api/direct-chats/${chatId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title }),
    }, 5000);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update chat title');
    }

    return response.json();
  },

  // Xóa cuộc trò chuyện
  deleteChat: async (chatId: string) => {
    const token = getAuthToken();
    if (!token) {
      console.log("No authentication token found, redirecting to home page");
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      return { success: false };
    }

    const response = await fetchWithTimeout(`${API_URL}/api/direct-chats/${chatId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }, 5000);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete chat');
    }

    return response.json();
  },
};

// Helper function to get the authentication token
export const getAuthToken = () => {
  if (typeof window === 'undefined') {
    console.log('getAuthToken called in server-side context');
    return null;
  }

  try {
    // Thử lấy token từ localStorage
    const token = localStorage.getItem('auth_token');

    if (token) {
      console.log(`Token found in localStorage: ${token.substring(0, 10)}...`);
      return token;
    }

    // Nếu không có token trong localStorage, thử lấy từ cookie
    console.log('No token in localStorage, checking cookies...');
    const getCookieValue = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        const part = parts.pop();
        return part ? part.split(';').shift() : null;
      }
      return null;
    };

    const cookieToken = getCookieValue('auth_token');

    if (cookieToken) {
      console.log(`Token found in cookie: ${cookieToken.substring(0, 10)}...`);
      // Đồng bộ lại với localStorage
      try {
        localStorage.setItem('auth_token', cookieToken);
        console.log('Token from cookie synchronized to localStorage');
      } catch (syncError) {
        console.error('Error synchronizing token to localStorage:', syncError);
      }
      return cookieToken;
    }

    console.log('No authentication token found in localStorage or cookies');
    return null;
  } catch (error) {
    console.error('Error accessing localStorage or cookies:', error);
    return null;
  }
};

// Tạo và lưu trữ client instance ID
const getClientInstanceId = () => {
  if (typeof window === 'undefined') {
    return 'server-side';
  }

  try {
    // Kiểm tra xem đã có client instance ID trong localStorage chưa
    let clientId = localStorage.getItem('client_instance_id');

    // Nếu chưa có, tạo mới và lưu vào localStorage
    if (!clientId) {
      // Tạo ID dựa trên thời gian hiện tại và một số ngẫu nhiên
      clientId = `browser-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem('client_instance_id', clientId);
      console.log(`Created new client instance ID: ${clientId}`);
    }

    return clientId;
  } catch (error) {
    // Nếu không thể truy cập localStorage, tạo ID tạm thời
    console.error('Error accessing localStorage for client ID:', error);
    return `temp-${Date.now()}`;
  }
};

// Helper function to add auth token to headers
export const getAuthHeaders = () => {
  const token = getAuthToken();
  const clientInstanceId = getClientInstanceId();

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
    // Sử dụng client instance ID ổn định
    'X-Client-Instance': clientInstanceId,
  };

  console.log('Generated headers:', {
    'Content-Type': headers['Content-Type'],
    'Authorization': token ? `Bearer ${token.substring(0, 10)}...` : 'none',
    'X-Client-Instance': headers['X-Client-Instance']
  });

  return headers;
};
