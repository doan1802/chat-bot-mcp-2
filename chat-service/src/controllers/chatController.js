const { supabase, insertChat, insertMessage } = require('../config/supabase');
const { getGeminiResponse } = require('../services/geminiService');

// Lấy danh sách cuộc trò chuyện của người dùng
const getUserChats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Lấy danh sách cuộc trò chuyện từ Supabase
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ chats: data });
  } catch (error) {
    console.error('Get user chats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Tạo cuộc trò chuyện mới
const createChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title } = req.body;

    // Tạo cuộc trò chuyện mới trong Supabase
    const { data, error } = await insertChat(userId, title);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({
      message: 'Chat created successfully',
      chat: data
    });
  } catch (error) {
    console.error('Create chat error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Lấy thông tin cuộc trò chuyện và tin nhắn
const getChatById = async (req, res) => {
  try {
    const userId = req.user.id;
    const chatId = req.params.chatId;

    // Kiểm tra xem cuộc trò chuyện có tồn tại và thuộc về người dùng không
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .eq('user_id', userId)
      .single();

    if (chatError) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Lấy tin nhắn của cuộc trò chuyện
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      return res.status(400).json({ error: messagesError.message });
    }

    return res.status(200).json({
      chat,
      messages
    });
  } catch (error) {
    console.error('Get chat by ID error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Gửi tin nhắn và nhận phản hồi từ Gemini
const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const chatId = req.params.chatId;
    const { content } = req.body;

    // Lấy thông tin client instance từ header
    const clientInstance = req.headers['x-client-instance'] || 'unknown-client';
    console.log(`Processing message from client instance: ${clientInstance} for user: ${userId} in chat: ${chatId}`);

    if (!content) {
      console.log(`[Client: ${clientInstance}] Error: Message content is required`);
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Kiểm tra xem cuộc trò chuyện có tồn tại và thuộc về người dùng không
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .eq('user_id', userId)
      .single();

    if (chatError) {
      console.log(`[Client: ${clientInstance}] Error: Chat not found for user: ${userId}, chat: ${chatId}`);
      return res.status(404).json({ error: 'Chat not found' });
    }

    console.log(`[Client: ${clientInstance}] Saving user message for chat: ${chatId}`);

    // Lưu tin nhắn của người dùng
    const { data: userMessage, error: userMessageError } = await insertMessage(chatId, 'user', content);

    if (userMessageError) {
      console.log(`[Client: ${clientInstance}] Error saving user message: ${userMessageError.message}`);
      return res.status(400).json({ error: userMessageError.message });
    }

    console.log(`[Client: ${clientInstance}] User message saved with ID: ${userMessage.id}`);

    // Lấy tất cả tin nhắn trong cuộc trò chuyện để gửi cho Gemini
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.log(`[Client: ${clientInstance}] Error retrieving messages: ${messagesError.message}`);
      return res.status(400).json({ error: messagesError.message });
    }

    // Chuyển đổi định dạng tin nhắn cho Gemini
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    console.log(`[Client: ${clientInstance}] Calling Gemini API with ${formattedMessages.length} messages`);

    // Gọi Gemini API để lấy phản hồi
    const assistantResponse = await getGeminiResponse(userId, formattedMessages);

    console.log(`[Client: ${clientInstance}] Received response from Gemini API, saving assistant message`);

    // Lưu phản hồi của assistant
    const { data: assistantMessage, error: assistantMessageError } = await insertMessage(chatId, 'assistant', assistantResponse);

    if (assistantMessageError) {
      console.log(`[Client: ${clientInstance}] Error saving assistant message: ${assistantMessageError.message}`);
      return res.status(400).json({ error: assistantMessageError.message });
    }

    console.log(`[Client: ${clientInstance}] Assistant message saved with ID: ${assistantMessage.id}`);

    // Cập nhật thời gian updated_at của cuộc trò chuyện
    await supabase
      .from('chats')
      .update({ updated_at: new Date() })
      .eq('id', chatId);

    console.log(`[Client: ${clientInstance}] Chat updated_at timestamp updated, returning response`);

    return res.status(200).json({
      userMessage,
      assistantMessage
    });
  } catch (error) {
    const clientInstance = req.headers['x-client-instance'] || 'unknown-client';
    console.error(`[Client: ${clientInstance}] Send message error:`, error);
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
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({
      message: 'Chat title updated successfully',
      chat: data
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
