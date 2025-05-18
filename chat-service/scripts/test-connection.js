const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('Testing connection to Supabase...');
    
    // Kiểm tra kết nối bằng cách lấy danh sách bảng
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('Connection successful, but table "chats" does not exist yet. This is expected if migrations have not been run.');
      } else {
        console.error('Error connecting to Supabase:', error);
        process.exit(1);
      }
    } else {
      console.log('Connection successful!');
      console.log('Data:', data);
    }
  } catch (error) {
    console.error('Error testing connection:', error);
    process.exit(1);
  }
}

testConnection();
