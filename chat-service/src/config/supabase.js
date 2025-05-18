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
    // Thêm dữ liệu vào bảng chats
    const { data, error } = await supabase
      .from('chats')
      .insert([
        {
          user_id: userId,
          title: title || 'New Chat'
        }
      ])
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Insert chat error:', error);
    return { data: null, error };
  }
};

// Tạo một hàm để thực hiện các thao tác với bảng messages mà không cần xác thực
const insertMessage = async (chatId, role, content) => {
  try {
    console.log(`Inserting message for chat ${chatId} with role ${role}`);

    // Thêm dữ liệu vào bảng messages
    const { data: insertedData, error: insertError } = await supabase
      .from('messages')
      .insert([
        {
          chat_id: chatId,
          role,
          content
        }
      ]);

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return { data: null, error: insertError };
    }

    // Lấy tin nhắn vừa thêm bằng một truy vấn riêng biệt
    // Sử dụng order và limit để đảm bảo lấy đúng tin nhắn vừa thêm
    const { data: messageData, error: selectError } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .eq('role', role)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (selectError) {
      console.error('Error selecting inserted message:', selectError);
      return { data: null, error: selectError };
    }

    console.log(`Message inserted successfully with ID: ${messageData.id}`);
    return { data: messageData, error: null };
  } catch (error) {
    console.error('Insert message error:', error);
    return { data: null, error: { message: `Failed to insert message: ${error.message}` } };
  }
};

module.exports = {
  supabase,
  insertChat,
  insertMessage
};
