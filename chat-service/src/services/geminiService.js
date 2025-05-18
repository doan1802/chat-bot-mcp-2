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
        'Authorization': `Bearer ${token}`
      },
      timeout: 5000
    });
    const duration = Date.now() - startTime;
    console.log(`User Service API response received in ${duration}ms with status: ${response.status}`);

    if (!response.ok) {
      const error = await response.json();
      console.error(`Error response from User Service: ${JSON.stringify(error)}`);
      throw new Error(error.error || 'Failed to fetch user settings');
    }

    const data = await response.json();
    console.log(`User settings retrieved successfully`);

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

// Hàm gọi Gemini API để lấy phản hồi
const getGeminiResponse = async (userId, messages) => {
  console.log(`Getting Gemini response for user: ${userId} with ${messages.length} messages`);

  try {
    // Lấy API key từ user settings
    console.log(`Fetching Gemini API key for user: ${userId}`);
    const apiKey = await getUserGeminiApiKey(userId);
    console.log(`Successfully retrieved API key for user: ${userId}`);

    // Khởi tạo Gemini client
    const genAI = new GoogleGenerativeAI(apiKey);
    console.log(`Initialized Gemini client`);

    // Sử dụng model gemini-2.0-flash theo lệnh curl của người dùng
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      apiVersion: "v1beta"
    });
    console.log(`Using model: gemini-2.0-flash with API version: v1beta`);

    // Chuẩn bị nội dung cho API request
    // Thay vì sử dụng chat session, chúng ta sẽ gửi tất cả tin nhắn trong một request
    const contents = [];

    // Thêm tất cả tin nhắn vào contents
    for (const msg of messages) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }
    console.log(`Prepared ${contents.length} messages for Gemini API`);

    // Cấu hình generation
    const generationConfig = {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 2048,
    };
    console.log(`Using generation config: temperature=${generationConfig.temperature}, topP=${generationConfig.topP}`);

    // Gọi API để lấy phản hồi
    console.log(`Calling Gemini API...`);
    const startTime = Date.now();
    const result = await model.generateContent({
      contents,
      generationConfig,
    });
    const duration = Date.now() - startTime;
    console.log(`Gemini API response received in ${duration}ms`);

    const response = result.response;
    const responseText = response.text();
    console.log(`Gemini response length: ${responseText.length} characters`);

    return responseText;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    // Thêm thông tin chi tiết về lỗi
    if (error.response) {
      console.error('Error response:', error.response);
    }
    throw new Error(`Gemini API error: ${error.message}`);
  }
};

module.exports = {
  getUserGeminiApiKey,
  getGeminiResponse
};
