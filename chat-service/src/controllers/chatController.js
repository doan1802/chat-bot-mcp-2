const { supabase, insertChat, insertMessage } = require('../config/supabase');
const { getGeminiResponse } = require('../services/geminiService');

// Lưu trữ các phiên chat đang hoạt động
// Key: chatId, Value: { userId, clientInstance, lastActivity, isProcessing }
const activeChats = new Map();

// Hàm dọn dẹp các phiên chat không hoạt động
const cleanupInactiveChats = () => {
  const now = Date.now();
  const inactivityThreshold = 30 * 60 * 1000; // 30 phút

  for (const [chatId, session] of activeChats.entries()) {
    if (now - session.lastActivity > inactivityThreshold) {
      console.log(`Removing inactive chat session for chat: ${chatId}, user: ${session.userId}`);
      activeChats.delete(chatId);
    }
  }
};

// Thiết lập dọn dẹp định kỳ
setInterval(cleanupInactiveChats, 5 * 60 * 1000); // Mỗi 5 phút

// Lấy danh sách cuộc trò chuyện của người dùng
const getUserChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const clientInstance = req.headers['x-client-instance'] || 'unknown-client';

    // Chỉ log trong môi trường phát triển
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Client: ${clientInstance}] Getting chats for user: ${userId}`);
    }

    // Đảm bảo userId là chuỗi
    const userIdStr = String(userId);

    // Kiểm tra cache trước
    const cacheKey = `chats_${userIdStr}`;
    if (req.app.locals.chatCache && req.app.locals.chatCache.has(cacheKey)) {
      // Chỉ log cache hit trong môi trường phát triển
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Client: ${clientInstance}] Cache hit for user chats: ${userIdStr}`);
      }
      return res.status(200).json({ chats: req.app.locals.chatCache.get(cacheKey) });
    }

    // Lấy danh sách cuộc trò chuyện từ Supabase
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', userIdStr)
      .order('updated_at', { ascending: false });

    if (error) {
      // Luôn log lỗi database
      console.error(`[Client: ${clientInstance}] Error getting chats for user ${userIdStr}:`, error);
      return res.status(400).json({ error: error.message });
    }

    // Kiểm tra xem data có phải là null hoặc undefined không
    if (!data) {
      // Chỉ log trong môi trường phát triển
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Client: ${clientInstance}] No data returned for user: ${userIdStr}`);
      }
      return res.status(200).json({ chats: [] });
    }

    // Lưu vào cache nếu có
    if (req.app.locals.chatCache) {
      req.app.locals.chatCache.set(cacheKey, data);
    }

    // Chỉ log kết quả trong môi trường phát triển
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Client: ${clientInstance}] Found ${data.length} chats for user: ${userIdStr}`);
    }

    return res.status(200).json({ chats: data });
  } catch (error) {
    const clientInstance = req.headers['x-client-instance'] || 'unknown-client';
    // Luôn log lỗi
    console.error(`[Client: ${clientInstance}] Get user chats error for user ${req.user.id}:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Tạo cuộc trò chuyện mới
const createChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title } = req.body;

    // Lấy thông tin client instance từ header nếu có
    const clientInstance = req.headers['x-client-instance'] || 'unknown-client';

    // Chỉ log trong môi trường phát triển
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Client: ${clientInstance}] Creating new chat for user: ${userId} with title: ${title || 'New Chat'}`);
    }

    // Tạo cuộc trò chuyện mới trong Supabase
    const { data, error } = await insertChat(userId, title);

    if (error) {
      // Luôn log lỗi database
      console.error(`[Client: ${clientInstance}] Error creating chat for user ${userId}:`, error);
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      // Luôn log lỗi dữ liệu
      console.error(`[Client: ${clientInstance}] No data returned when creating chat for user ${userId}`);
      return res.status(500).json({ error: 'Failed to create chat: No data returned' });
    }

    // Xóa cache nếu có
    if (req.app.locals.chatCache) {
      const cacheKey = `chats_${userId}`;
      req.app.locals.chatCache.del(cacheKey);
    }

    // Chỉ log thành công trong môi trường phát triển
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Client: ${clientInstance}] Chat created successfully with ID: ${data.id} for user: ${userId}`);
    }

    return res.status(201).json({
      message: 'Chat created successfully',
      chat: data
    });
  } catch (error) {
    const clientInstance = req.headers['x-client-instance'] || 'unknown-client';
    // Luôn log lỗi
    console.error(`[Client: ${clientInstance}] Create chat error for user ${req.user.id}:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Lấy thông tin cuộc trò chuyện và tin nhắn
const getChatById = async (req, res) => {
  try {
    const userId = req.user.id;
    const chatId = req.params.chatId;
    const clientInstance = req.headers['x-client-instance'] || 'unknown-client';

    // Kiểm tra cache trước
    const cacheKey = `chat_${chatId}_${userId}`;
    if (req.app.locals.messageCache && req.app.locals.messageCache.has(cacheKey)) {
      // Chỉ log cache hit trong môi trường phát triển
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Client: ${clientInstance}] Cache hit for chat: ${chatId}`);
      }
      return res.status(200).json(req.app.locals.messageCache.get(cacheKey));
    }

    // Kiểm tra xem cuộc trò chuyện có tồn tại và thuộc về người dùng không
    const { data: chats, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .eq('user_id', userId)
      .limit(1);

    if (chatError) {
      // Luôn log lỗi database
      console.error(`[Client: ${clientInstance}] Error getting chat ${chatId} for user ${userId}:`, chatError);
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (!chats || chats.length === 0) {
      // Chỉ log trong môi trường phát triển
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Client: ${clientInstance}] Chat ${chatId} not found for user ${userId}`);
      }
      return res.status(404).json({ error: 'Chat not found' });
    }

    const chat = chats[0];

    // Lấy tin nhắn của cuộc trò chuyện
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      // Luôn log lỗi database
      console.error(`[Client: ${clientInstance}] Error getting messages for chat ${chatId}:`, messagesError);
      return res.status(400).json({ error: messagesError.message });
    }

    const result = {
      chat,
      messages
    };

    // Lưu vào cache nếu có
    if (req.app.locals.messageCache) {
      req.app.locals.messageCache.set(cacheKey, result);
    }

    return res.status(200).json(result);
  } catch (error) {
    const clientInstance = req.headers['x-client-instance'] || 'unknown-client';
    // Luôn log lỗi
    console.error(`[Client: ${clientInstance}] Get chat by ID error:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Gửi tin nhắn và nhận phản hồi từ Gemini
const sendMessage = async (req, res) => {
  const userId = req.user.id;
  const chatId = req.params.chatId;
  const { content } = req.body;

  // Lấy thông tin client instance từ header
  const clientInstance = req.headers['x-client-instance'] || 'unknown-client';

  // Giảm số lượng log không cần thiết
  if (process.env.NODE_ENV === 'development') {
    console.log(`Processing message from client instance: ${clientInstance} for user: ${userId} in chat: ${chatId}`);
  }

  // Tối ưu hóa cơ chế khóa phiên chat
  // Sử dụng cơ chế timeout để tự động giải phóng khóa nếu xử lý quá lâu
  const processingTimeout = 30000; // 30 giây

  // Kiểm tra xem chat này đã đang được xử lý bởi client khác không
  if (activeChats.has(chatId)) {
    const chatSession = activeChats.get(chatId);

    // Nếu chat đang được xử lý bởi client khác
    if (chatSession.isProcessing && chatSession.clientInstance !== clientInstance) {
      // Kiểm tra xem phiên có bị treo không (quá 30 giây)
      const now = Date.now();
      if (now - chatSession.lastActivity > processingTimeout) {
        console.log(`[Client: ${clientInstance}] Releasing stale lock on chat ${chatId} from client: ${chatSession.clientInstance}`);
        // Giải phóng khóa cũ
        chatSession.isProcessing = false;
      } else {
        console.log(`[Client: ${clientInstance}] Chat ${chatId} is already being processed by client ${chatSession.clientInstance}`);
        return res.status(409).json({
          error: 'This chat is currently being processed by another session. Please try again later.'
        });
      }
    }

    // Cập nhật thông tin phiên chat
    chatSession.lastActivity = Date.now();
    chatSession.clientInstance = clientInstance;
    chatSession.isProcessing = true;

    // Thiết lập timer để tự động giải phóng khóa nếu xử lý quá lâu
    if (chatSession.timer) {
      clearTimeout(chatSession.timer);
    }
    chatSession.timer = setTimeout(() => {
      if (activeChats.has(chatId)) {
        console.log(`[Client: ${clientInstance}] Auto-releasing lock on chat ${chatId} after timeout`);
        activeChats.get(chatId).isProcessing = false;
      }
    }, processingTimeout);
  } else {
    // Tạo phiên chat mới
    const newSession = {
      userId,
      clientInstance,
      lastActivity: Date.now(),
      isProcessing: true
    };

    // Thiết lập timer để tự động giải phóng khóa nếu xử lý quá lâu
    newSession.timer = setTimeout(() => {
      if (activeChats.has(chatId)) {
        console.log(`[Client: ${clientInstance}] Auto-releasing lock on chat ${chatId} after timeout`);
        activeChats.get(chatId).isProcessing = false;
      }
    }, processingTimeout);

    activeChats.set(chatId, newSession);
  }

  try {
    if (!content) {
      console.log(`[Client: ${clientInstance}] Error: Message content is required`);
      // Đánh dấu phiên chat không còn được xử lý
      if (activeChats.has(chatId)) {
        activeChats.get(chatId).isProcessing = false;
      }
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Kiểm tra xem cuộc trò chuyện có tồn tại và thuộc về người dùng không
    const { data: chats, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .eq('user_id', userId)
      .limit(1);

    if (chatError) {
      console.log(`[Client: ${clientInstance}] Error: Chat not found for user: ${userId}, chat: ${chatId}. Error: ${chatError.message}`);
      // Đánh dấu phiên chat không còn được xử lý
      if (activeChats.has(chatId)) {
        activeChats.get(chatId).isProcessing = false;
      }
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (!chats || chats.length === 0) {
      console.log(`[Client: ${clientInstance}] Error: No chat found for user: ${userId}, chat: ${chatId}`);
      // Đánh dấu phiên chat không còn được xử lý
      if (activeChats.has(chatId)) {
        activeChats.get(chatId).isProcessing = false;
      }
      return res.status(404).json({ error: 'Chat not found' });
    }

    const chat = chats[0];

    // Chỉ log trong môi trường phát triển
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Client: ${clientInstance}] Saving user message for chat: ${chatId}`);
    }

    // Lưu tin nhắn của người dùng
    const { data: userMessage, error: userMessageError } = await insertMessage(chatId, 'user', content);

    if (userMessageError) {
      // Luôn log lỗi database
      console.error(`[Client: ${clientInstance}] Error saving user message: ${userMessageError.message}`);
      // Đánh dấu phiên chat không còn được xử lý
      if (activeChats.has(chatId)) {
        activeChats.get(chatId).isProcessing = false;
      }
      return res.status(400).json({ error: userMessageError.message });
    }

    // Chỉ log trong môi trường phát triển
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Client: ${clientInstance}] User message saved with ID: ${userMessage.id}`);
    }

    // Xóa cache nếu có
    if (req.app.locals.messageCache) {
      const cacheKey = `chat_${chatId}_${userId}`;
      req.app.locals.messageCache.del(cacheKey);
    }

    // Lấy tất cả tin nhắn trong cuộc trò chuyện để gửi cho Gemini
    // Tối ưu hóa truy vấn bằng cách giới hạn số lượng tin nhắn và chỉ lấy các trường cần thiết
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('role, content, created_at') // Chỉ lấy các trường cần thiết
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(20); // Giới hạn số lượng tin nhắn để tăng tốc độ xử lý

    if (messagesError) {
      console.log(`[Client: ${clientInstance}] Error retrieving messages: ${messagesError.message}`);
      // Đánh dấu phiên chat không còn được xử lý
      if (activeChats.has(chatId)) {
        activeChats.get(chatId).isProcessing = false;
      }
      return res.status(400).json({ error: messagesError.message });
    }

    // Chuyển đổi định dạng tin nhắn cho Gemini
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    // Chỉ log trong môi trường phát triển
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Client: ${clientInstance}] Calling Gemini API with ${formattedMessages.length} messages`);
    }

    // Gọi Gemini API để lấy phản hồi
    let assistantResponse;
    try {
      assistantResponse = await getGeminiResponse(userId, formattedMessages);
      // Chỉ log trong môi trường phát triển
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Client: ${clientInstance}] Received response from Gemini API, saving assistant message`);
      }
    } catch (geminiError) {
      // Luôn log lỗi API
      console.error(`[Client: ${clientInstance}] Error calling Gemini API:`, geminiError);
      // Đánh dấu phiên chat không còn được xử lý
      if (activeChats.has(chatId)) {
        activeChats.get(chatId).isProcessing = false;
      }
      return res.status(500).json({ error: geminiError.message });
    }

    // Lưu phản hồi của assistant
    const { data: assistantMessage, error: assistantMessageError } = await insertMessage(chatId, 'assistant', assistantResponse);

    if (assistantMessageError) {
      // Luôn log lỗi database
      console.error(`[Client: ${clientInstance}] Error saving assistant message: ${assistantMessageError.message}`);
      // Đánh dấu phiên chat không còn được xử lý
      if (activeChats.has(chatId)) {
        activeChats.get(chatId).isProcessing = false;
      }
      return res.status(400).json({ error: assistantMessageError.message });
    }

    // Chỉ log trong môi trường phát triển
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Client: ${clientInstance}] Assistant message saved with ID: ${assistantMessage.id}`);
    }

    // Cập nhật thời gian updated_at của cuộc trò chuyện
    await supabase
      .from('chats')
      .update({ updated_at: new Date() })
      .eq('id', chatId);

    // Chỉ log trong môi trường phát triển
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Client: ${clientInstance}] Chat updated_at timestamp updated, returning response`);
    }

    // Đánh dấu phiên chat không còn được xử lý
    if (activeChats.has(chatId)) {
      activeChats.get(chatId).isProcessing = false;
      activeChats.get(chatId).lastActivity = Date.now();
    }

    // Xóa cache nếu có
    if (req.app.locals.messageCache) {
      const cacheKey = `chat_${chatId}_${userId}`;
      req.app.locals.messageCache.del(cacheKey);
    }

    // Xóa cache danh sách chat nếu có
    if (req.app.locals.chatCache) {
      const cacheKey = `chats_${userId}`;
      req.app.locals.chatCache.del(cacheKey);
    }

    return res.status(200).json({
      userMessage,
      assistantMessage
    });
  } catch (error) {
    console.error(`[Client: ${clientInstance}] Send message error:`, error);

    // Đánh dấu phiên chat không còn được xử lý nếu có lỗi
    if (activeChats.has(chatId)) {
      activeChats.get(chatId).isProcessing = false;
    }

    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// Cập nhật tiêu đề cuộc trò chuyện
const updateChatTitle = async (req, res) => {
  try {
    const userId = req.user.id;
    const chatId = req.params.chatId;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Cập nhật tiêu đề cuộc trò chuyện
    const { data, error } = await supabase
      .from('chats')
      .update({ title })
      .eq('id', chatId)
      .eq('user_id', userId)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Chat not found or not updated' });
    }

    const updatedChat = data[0];

    return res.status(200).json({
      message: 'Chat title updated successfully',
      chat: updatedChat
    });
  } catch (error) {
    console.error('Update chat title error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Xóa cuộc trò chuyện
const deleteChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const chatId = req.params.chatId;

    // Xóa cuộc trò chuyện
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId)
      .eq('user_id', userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({
      message: 'Chat deleted successfully'
    });
  } catch (error) {
    console.error('Delete chat error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getUserChats,
  createChat,
  getChatById,
  sendMessage,
  updateChatTitle,
  deleteChat
};
