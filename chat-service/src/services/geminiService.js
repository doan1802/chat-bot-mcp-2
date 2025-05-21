const { GoogleGenerativeAI } = require('@google/generative-ai');
const fetch = require('node-fetch');
require('dotenv').config();

// Hàm lấy API key Gemini từ user settings
const getUserGeminiApiKey = async (userId) => {
  console.log(`Getting Gemini API key for user: ${userId}`);

  try {
    const userServiceUrl = process.env.USER_SERVICE_URL;

    if (!userServiceUrl) {
      console.error('USER_SERVICE_URL environment variable is not configured');
      throw new Error('USER_SERVICE_URL not configured');
    }

    console.log(`Using User Service URL: ${userServiceUrl}`);

    // Tạo JWT token để gọi user service
    const jwt = require('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error('JWT_SECRET environment variable is not configured');
      throw new Error('JWT_SECRET not configured');
    }

    console.log(`Creating JWT token for user: ${userId}`);
    const token = jwt.sign(
      { id: userId },
      jwtSecret,
      { expiresIn: '5m' }
    );
    console.log(`JWT token created successfully`);

    // Gọi API để lấy settings của user
    console.log(`Calling User Service API to get settings for user: ${userId}`);
    const startTime = Date.now();
    const response = await fetch(`${userServiceUrl}/api/settings`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    const duration = Date.now() - startTime;
    console.log(`User Service API response received in ${duration}ms with status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {
        errorJson = { error: errorText };
      }
      console.error(`Error response from User Service: ${JSON.stringify(errorJson)}`);
      throw new Error(errorJson.error || `Failed to fetch user settings: ${response.status}`);
    }

    // Đọc response body
    const responseText = await response.text();
    console.log(`Response body length: ${responseText.length} characters`);

    // Parse JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`User settings retrieved successfully`);
    } catch (jsonError) {
      console.error(`Error parsing JSON response: ${jsonError.message}`);
      console.error(`Response text: ${responseText.substring(0, 200)}...`);
      throw new Error(`Invalid JSON response from User Service`);
    }

    if (!data.settings) {
      console.error(`No settings found in response: ${JSON.stringify(data)}`);
      throw new Error('Settings not found in user service response');
    }

    if (!data.settings.gemini_api_key) {
      console.error(`Gemini API key not found in user settings`);
      throw new Error('Gemini API key not found in user settings');
    }

    console.log(`Successfully retrieved Gemini API key for user: ${userId}`);
    return data.settings.gemini_api_key;
  } catch (error) {
    console.error(`Error getting Gemini API key for user ${userId}:`, error);
    throw error;
  }
};

// Lưu trữ các phiên Gemini đang hoạt động
// Key: userId, Value: { apiKey, model, lastActivity }
const activeGeminiSessions = new Map();

// Hàm dọn dẹp các phiên Gemini không hoạt động
const cleanupInactiveGeminiSessions = () => {
  const now = Date.now();
  const inactivityThreshold = 30 * 60 * 1000; // 30 phút

  for (const [userId, session] of activeGeminiSessions.entries()) {
    if (now - session.lastActivity > inactivityThreshold) {
      console.log(`Removing inactive Gemini session for user: ${userId}`);
      activeGeminiSessions.delete(userId);
    }
  }
};

// Thiết lập dọn dẹp định kỳ
setInterval(cleanupInactiveGeminiSessions, 5 * 60 * 1000); // Mỗi 5 phút

// Hàm gọi Gemini API để lấy phản hồi
const getGeminiResponse = async (userId, messages) => {
  console.log(`Getting Gemini response for user: ${userId} with ${messages.length} messages`);
  const clientId = `gemini-${userId.substring(0, 8)}`;

  try {
    // Kiểm tra xem có phiên Gemini đang hoạt động không
    let geminiSession = activeGeminiSessions.get(userId);
    let model;

    if (geminiSession) {
      console.log(`Found existing Gemini session for user: ${userId}`);
      model = geminiSession.model;

      // Cập nhật thời gian hoạt động
      geminiSession.lastActivity = Date.now();
    } else {
      // Lấy API key từ user settings
      console.log(`Fetching Gemini API key for user: ${userId}`);
      const apiKey = await getUserGeminiApiKey(userId);
      console.log(`Successfully retrieved API key for user: ${userId}`);

      if (!apiKey) {
        throw new Error('No Gemini API key available');
      }

      // Khởi tạo Gemini client
      const genAI = new GoogleGenerativeAI(apiKey);
      console.log(`Initialized Gemini client for user: ${userId}`);

      // Sử dụng model gemini-2.0-flash theo lệnh curl của người dùng
      model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        apiVersion: "v1beta"
      });
      console.log(`Using model: gemini-2.0-flash with API version: v1beta`);

      // Lưu phiên Gemini
      activeGeminiSessions.set(userId, {
        apiKey,
        model,
        lastActivity: Date.now()
      });

      console.log(`Created new Gemini session for user: ${userId}`);
    }

    // Chuẩn bị nội dung cho API request
    // Thay vì sử dụng chat session, chúng ta sẽ gửi tất cả tin nhắn trong một request
    const contents = [];

    // Thêm system prompt
    contents.push({
      role: 'model',
      parts: [{ text: `Bạn là Serna một trợ lý AI trẻ trung năng động. Bạn hãy trả lời người dùng bằng những nội dung chính xác và xác thực ` }]
    });

    // Thêm tất cả tin nhắn vào contents
    for (const msg of messages) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }
    console.log(`[Client: ${clientId}] Prepared ${contents.length} messages for Gemini API (including system prompt)`);

    // Cấu hình generation tối ưu cho tốc độ phản hồi
    const generationConfig = {
      temperature: 0.5,      // Giảm xuống để có phản hồi tập trung và nhanh hơn
      topP: 0.85,            // Điều chỉnh để cân bằng giữa tốc độ và đa dạng
      topK: 30,              // Giảm xuống để tăng tốc độ
      maxOutputTokens: 2048, // Giảm xuống để tăng tốc độ phản hồi ban đầu
    };
    // Chỉ log trong môi trường phát triển
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Client: ${clientId}] Using generation config: temperature=${generationConfig.temperature}, topP=${generationConfig.topP}`);
    }

    // Gọi API để lấy phản hồi
    // Chỉ log trong môi trường phát triển hoặc khi bắt đầu gọi API
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Client: ${clientId}] Calling Gemini API...`);
    }
    const startTime = Date.now();

    try {
      const result = await model.generateContent({
        contents,
        generationConfig,
      });

      const duration = Date.now() - startTime;
      // Log thời gian phản hồi để theo dõi hiệu suất
      console.log(`[Client: ${clientId}] Gemini API response received in ${duration}ms`);

      if (!result || !result.response) {
        throw new Error('Empty response from Gemini API');
      }

      const response = result.response;
      const responseText = response.text();
      // Chỉ log độ dài phản hồi trong môi trường phát triển
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Client: ${clientId}] Gemini response length: ${responseText.length} characters`);
      }

      return responseText;
    } catch (geminiError) {
      console.error(`[Client: ${clientId}] Gemini API error:`, geminiError);

      // Xóa phiên Gemini nếu có lỗi API key
      if (geminiError.message && geminiError.message.includes('API key')) {
        console.log(`[Client: ${clientId}] Removing invalid Gemini session for user: ${userId}`);
        activeGeminiSessions.delete(userId);
        throw new Error(`Invalid Gemini API key: ${geminiError.message}`);
      }

      throw new Error(`Gemini API error: ${geminiError.message}`);
    }
  } catch (error) {
    console.error(`[Client: ${clientId}] Error in getGeminiResponse:`, error);

    // Thêm thông tin chi tiết về lỗi
    if (error.response) {
      console.error(`[Client: ${clientId}] Error response:`, error.response);
    }

    // Trả về thông báo lỗi thân thiện với người dùng
    throw new Error(`Không thể lấy phản hồi từ Gemini API: ${error.message}. Vui lòng kiểm tra API key của bạn trong cài đặt.`);
  }
};

module.exports = {
  getUserGeminiApiKey,
  getGeminiResponse
};
