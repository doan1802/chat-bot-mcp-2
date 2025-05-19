const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Lấy thông tin kết nối Supabase từ biến môi trường
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

// Tạo client Supabase
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Kiểm tra kết nối và cấu trúc bảng
const checkDatabase = async () => {
  try {
    console.log('Checking Supabase connection...');
    console.log(`Supabase URL: ${supabaseUrl}`);
    console.log(`Supabase Key: ${supabaseKey.substring(0, 10)}...`);
    
    // Kiểm tra kết nối bằng cách lấy danh sách bảng
    const { data: tablesData, error: tablesError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (tablesError) {
      console.error('Error connecting to Supabase:', tablesError);
      process.exit(1);
    }
    
    console.log('Connected to Supabase successfully!');
    console.log('Tables in public schema:');
    tablesData.forEach(table => console.log(`- ${table.tablename}`));
    
    // Kiểm tra bảng chats
    console.log('\nChecking chats table...');
    const { data: chatsData, error: chatsError } = await supabase
      .from('chats')
      .select('*')
      .limit(5);
    
    if (chatsError) {
      console.error('Error accessing chats table:', chatsError);
    } else {
      console.log(`Found ${chatsData.length} chats.`);
      if (chatsData.length > 0) {
        console.log('Sample chat:');
        console.log(chatsData[0]);
      }
    }
    
    // Kiểm tra bảng messages
    console.log('\nChecking messages table...');
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(5);
    
    if (messagesError) {
      console.error('Error accessing messages table:', messagesError);
    } else {
      console.log(`Found ${messagesData.length} messages.`);
      if (messagesData.length > 0) {
        console.log('Sample message:');
        console.log(messagesData[0]);
      }
    }
    
    // Kiểm tra cấu trúc bảng chats
    console.log('\nChecking chats table structure...');
    const { data: chatsColumns, error: chatsColumnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'chats' });
    
    if (chatsColumnsError) {
      console.error('Error getting chats table structure:', chatsColumnsError);
    } else {
      console.log('Chats table columns:');
      chatsColumns.forEach(column => console.log(`- ${column.column_name} (${column.data_type})`));
    }
    
    // Kiểm tra cấu trúc bảng messages
    console.log('\nChecking messages table structure...');
    const { data: messagesColumns, error: messagesColumnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'messages' });
    
    if (messagesColumnsError) {
      console.error('Error getting messages table structure:', messagesColumnsError);
    } else {
      console.log('Messages table columns:');
      messagesColumns.forEach(column => console.log(`- ${column.column_name} (${column.data_type})`));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking database:', error);
    process.exit(1);
  }
};

// Tạo function để lấy cấu trúc bảng
const createGetTableColumnsFunction = async () => {
  try {
    const { error } = await supabase.rpc('create_get_table_columns_function', {});
    
    if (error) {
      console.error('Error creating get_table_columns function:', error);
      // Nếu function đã tồn tại, tiếp tục kiểm tra database
      checkDatabase();
    } else {
      console.log('Created get_table_columns function successfully.');
      checkDatabase();
    }
  } catch (error) {
    console.error('Error creating function:', error);
    // Nếu có lỗi, vẫn tiếp tục kiểm tra database
    checkDatabase();
  }
};

// Tạo function SQL để lấy cấu trúc bảng
const createFunction = async () => {
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
        RETURNS TABLE(column_name text, data_type text, is_nullable boolean)
        LANGUAGE SQL
        AS $$
          SELECT column_name::text, data_type::text, is_nullable::boolean
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position;
        $$;
        
        CREATE OR REPLACE FUNCTION create_get_table_columns_function()
        RETURNS void
        LANGUAGE SQL
        AS $$
          SELECT 1;
        $$;
      `
    });
    
    if (error) {
      console.error('Error creating SQL functions:', error);
      // Nếu có lỗi, vẫn tiếp tục kiểm tra database
      checkDatabase();
    } else {
      console.log('Created SQL functions successfully.');
      checkDatabase();
    }
  } catch (error) {
    console.error('Error creating SQL functions:', error);
    // Nếu có lỗi, vẫn tiếp tục kiểm tra database
    checkDatabase();
  }
};

// Chạy script
createFunction();
