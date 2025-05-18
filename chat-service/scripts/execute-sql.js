const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQL() {
  try {
    console.log('Executing SQL...');
    
    // Tắt RLS cho bảng chats
    const disableChatsRLS = `
      ALTER TABLE IF EXISTS public.chats DISABLE ROW LEVEL SECURITY;
    `;
    
    // Tắt RLS cho bảng messages
    const disableMessagesRLS = `
      ALTER TABLE IF EXISTS public.messages DISABLE ROW LEVEL SECURITY;
    `;
    
    // Thực thi SQL
    const { error: error1 } = await supabase.rpc('exec_sql', { sql: disableChatsRLS });
    if (error1) {
      console.error('Error disabling RLS for chats:', error1);
    } else {
      console.log('RLS disabled for chats table.');
    }
    
    const { error: error2 } = await supabase.rpc('exec_sql', { sql: disableMessagesRLS });
    if (error2) {
      console.error('Error disabling RLS for messages:', error2);
    } else {
      console.log('RLS disabled for messages table.');
    }
    
    console.log('SQL execution completed.');
  } catch (error) {
    console.error('Error executing SQL:', error);
    process.exit(1);
  }
}

executeSQL();
