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

// SQL để tạo bảng
const createTablesSQL = `
-- Tạo bảng chats để lưu thông tin cuộc trò chuyện
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tạo bảng messages để lưu tin nhắn
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Bật RLS cho bảng chats
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Bật RLS cho bảng messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Tạo policy cho bảng chats
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chats' AND policyname = 'Users can view their own chats'
  ) THEN
    CREATE POLICY "Users can view their own chats" 
      ON public.chats FOR SELECT 
      USING (auth.uid()::text = user_id::text OR auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chats' AND policyname = 'Users can insert their own chats'
  ) THEN
    CREATE POLICY "Users can insert their own chats" 
      ON public.chats FOR INSERT 
      WITH CHECK (auth.uid()::text = user_id::text OR auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chats' AND policyname = 'Users can update their own chats'
  ) THEN
    CREATE POLICY "Users can update their own chats" 
      ON public.chats FOR UPDATE 
      USING (auth.uid()::text = user_id::text OR auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chats' AND policyname = 'Users can delete their own chats'
  ) THEN
    CREATE POLICY "Users can delete their own chats" 
      ON public.chats FOR DELETE 
      USING (auth.uid()::text = user_id::text OR auth.uid() = user_id);
  END IF;
END
$$;

-- Tạo policy cho bảng messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can view messages in their chats'
  ) THEN
    CREATE POLICY "Users can view messages in their chats" 
      ON public.messages FOR SELECT 
      USING (EXISTS (
        SELECT 1 FROM public.chats 
        WHERE chats.id = messages.chat_id 
        AND (chats.user_id::text = auth.uid()::text OR chats.user_id = auth.uid())
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can insert messages in their chats'
  ) THEN
    CREATE POLICY "Users can insert messages in their chats" 
      ON public.messages FOR INSERT 
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.chats 
        WHERE chats.id = messages.chat_id 
        AND (chats.user_id::text = auth.uid()::text OR chats.user_id = auth.uid())
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can update messages in their chats'
  ) THEN
    CREATE POLICY "Users can update messages in their chats" 
      ON public.messages FOR UPDATE 
      USING (EXISTS (
        SELECT 1 FROM public.chats 
        WHERE chats.id = messages.chat_id 
        AND (chats.user_id::text = auth.uid()::text OR chats.user_id = auth.uid())
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can delete messages in their chats'
  ) THEN
    CREATE POLICY "Users can delete messages in their chats" 
      ON public.messages FOR DELETE 
      USING (EXISTS (
        SELECT 1 FROM public.chats 
        WHERE chats.id = messages.chat_id 
        AND (chats.user_id::text = auth.uid()::text OR chats.user_id = auth.uid())
      ));
  END IF;
END
$$;

-- Tạo index để tăng tốc độ truy vấn
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
`;

// Tạo bảng
const createTables = async () => {
  try {
    console.log('Creating tables...');
    
    // Thực thi SQL
    const { error } = await supabase.rpc('exec_sql', { sql: createTablesSQL });
    
    if (error) {
      console.error('Error creating tables:', error);
      process.exit(1);
    }
    
    console.log('Tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
};

// Tạo function exec_sql nếu chưa tồn tại
const createExecSqlFunction = async () => {
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$;
      `
    });
    
    if (error) {
      // Nếu function chưa tồn tại, tạo mới
      const { error: createError } = await supabase.rpc('exec_sql_raw', {
        sql: `
          CREATE OR REPLACE FUNCTION exec_sql(sql text)
          RETURNS void
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          BEGIN
            EXECUTE sql;
          END;
          $$;
        `
      });
      
      if (createError) {
        console.error('Error creating exec_sql function:', createError);
        process.exit(1);
      }
      
      console.log('Created exec_sql function successfully.');
      createTables();
    } else {
      console.log('exec_sql function already exists.');
      createTables();
    }
  } catch (error) {
    console.error('Error checking exec_sql function:', error);
    process.exit(1);
  }
};

// Chạy script
createExecSqlFunction();
