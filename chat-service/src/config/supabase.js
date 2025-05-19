const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

// Tạo client với các options để bỏ qua RLS
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Tạo một hàm để thực hiện các thao tác với bảng chats mà không cần xác thực
const insertChat = async (userId, title) => {
  try {
    console.log(`Inserting chat for user ${userId} with title "${title || 'New Chat'}"`);

    // Đảm bảo userId là chuỗi
    const userIdStr = String(userId);

    // Thêm dữ liệu vào bảng chats
    const { data, error } = await supabase
      .from('chats')
      .insert([
        {
          user_id: userIdStr,
          title: title || 'New Chat'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error(`Error inserting chat for user ${userIdStr}:`, error);
    } else {
      console.log(`Chat inserted successfully with ID: ${data.id} for user: ${userIdStr}`);
    }

    return { data, error };
  } catch (error) {
    console.error('Insert chat error:', error);
    return { data: null, error: { message: `Failed to insert chat: ${error.message}` } };
  }
};

// Tạo một hàm để thực hiện các thao tác với bảng messages mà không cần xác thực
const insertMessage = async (chatId, role, content) => {
  try {
    console.log(`Inserting message for chat ${chatId} with role ${role}`);

    // Đảm bảo chatId là chuỗi
    const chatIdStr = String(chatId);

    // Thêm dữ liệu vào bảng messages
    const { error: insertError } = await supabase
      .from('messages')
      .insert([
        {
          chat_id: chatIdStr,
          role,
          content
        }
      ]);

    if (insertError) {
      console.error(`Error inserting message for chat ${chatIdStr}:`, insertError);
      return { data: null, error: insertError };
    }

    // Lấy tin nhắn vừa thêm bằng một truy vấn riêng biệt
    // Thay vì sử dụng .single(), hãy sử dụng .limit(1) và kiểm tra kết quả
    const { data: messageData, error: selectError } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatIdStr)
      .eq('role', role)
      .order('created_at', { ascending: false })
      .limit(1);

    if (selectError) {
      console.error(`Error selecting inserted message for chat ${chatIdStr}:`, selectError);
      return { data: null, error: selectError };
    }

    if (!messageData || messageData.length === 0) {
      console.error(`No message found after insertion for chat ${chatIdStr}`);
      return { data: null, error: { message: 'No message found after insertion' } };
    }

    // Lấy tin nhắn đầu tiên trong kết quả
    const message = messageData[0];
    console.log(`Message inserted successfully with ID: ${message.id} for chat: ${chatIdStr}`);
    return { data: message, error: null };
  } catch (error) {
    console.error(`Insert message error for chat ${chatId}:`, error);
    return { data: null, error: { message: `Failed to insert message: ${error.message}` } };
  }
};

module.exports = {
  supabase,
  insertChat,
  insertMessage
};
