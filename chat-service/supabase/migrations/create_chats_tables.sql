-- Tạo bảng chats để lưu thông tin cuộc trò chuyện
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
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
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chats' AND policyname = 'Users can insert their own chats'
  ) THEN
    CREATE POLICY "Users can insert their own chats" 
      ON public.chats FOR INSERT 
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chats' AND policyname = 'Users can update their own chats'
  ) THEN
    CREATE POLICY "Users can update their own chats" 
      ON public.chats FOR UPDATE 
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chats' AND policyname = 'Users can delete their own chats'
  ) THEN
    CREATE POLICY "Users can delete their own chats" 
      ON public.chats FOR DELETE 
      USING (auth.uid() = user_id);
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
        WHERE chats.id = messages.chat_id AND chats.user_id = auth.uid()
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can insert messages in their chats'
  ) THEN
    CREATE POLICY "Users can insert messages in their chats" 
      ON public.messages FOR INSERT 
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.chats 
        WHERE chats.id = messages.chat_id AND chats.user_id = auth.uid()
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can update messages in their chats'
  ) THEN
    CREATE POLICY "Users can update messages in their chats" 
      ON public.messages FOR UPDATE 
      USING (EXISTS (
        SELECT 1 FROM public.chats 
        WHERE chats.id = messages.chat_id AND chats.user_id = auth.uid()
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can delete messages in their chats'
  ) THEN
    CREATE POLICY "Users can delete messages in their chats" 
      ON public.messages FOR DELETE 
      USING (EXISTS (
        SELECT 1 FROM public.chats 
        WHERE chats.id = messages.chat_id AND chats.user_id = auth.uid()
      ));
  END IF;
END
$$;

-- Tạo trigger để tự động cập nhật trường updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Tạo trigger cho bảng chats
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_chats_updated_at'
  ) THEN
    CREATE TRIGGER update_chats_updated_at
    BEFORE UPDATE ON public.chats
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;
