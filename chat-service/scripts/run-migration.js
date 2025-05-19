const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
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

// Đường dẫn đến file migration
const migrationFileName = process.env.MIGRATION_FILE || 'update_chat_tables.sql';
const migrationFilePath = path.join(__dirname, '../supabase/migrations/', migrationFileName);

// Đọc nội dung file migration
const runMigration = async () => {
  try {
    console.log('Reading migration file...');
    const migrationSQL = fs.readFileSync(migrationFilePath, 'utf8');

    console.log('Running migration...');
    console.log('SQL to execute:');
    console.log(migrationSQL);

    // Thực thi SQL
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }

    console.log('Migration completed successfully!');

    // Kiểm tra cấu trúc bảng sau khi migration
    console.log('Checking table structure...');

    // Kiểm tra bảng chats
    const { data: chatsData, error: chatsError } = await supabase
      .from('chats')
      .select('*')
      .limit(1);

    if (chatsError) {
      console.error('Error checking chats table:', chatsError);
    } else {
      console.log('Chats table is accessible.');
    }

    // Kiểm tra bảng messages
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(1);

    if (messagesError) {
      console.error('Error checking messages table:', messagesError);
    } else {
      console.log('Messages table is accessible.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
};

// Chạy migration
runMigration();
