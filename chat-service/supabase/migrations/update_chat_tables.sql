-- Migration script để cập nhật cấu trúc bảng chats và messages trong chat-service
-- Đảm bảo user_id trong bảng chats không bị ràng buộc với auth.users

-- Xóa các ràng buộc hiện có nếu có
ALTER TABLE IF EXISTS public.chats
DROP CONSTRAINT IF EXISTS chats_user_id_fkey;

-- Cập nhật bảng chats để đảm bảo user_id là UUID và không null
ALTER TABLE IF EXISTS public.chats
ALTER COLUMN user_id SET DATA TYPE UUID,
ALTER COLUMN user_id SET NOT NULL;

-- Đảm bảo các policy vẫn hoạt động đúng
DO $$
BEGIN
  -- Xóa policy cũ nếu tồn tại
  DROP POLICY IF EXISTS "Users can view their own chats" ON public.chats;
  DROP POLICY IF EXISTS "Users can insert their own chats" ON public.chats;
  DROP POLICY IF EXISTS "Users can update their own chats" ON public.chats;
  DROP POLICY IF EXISTS "Users can delete their own chats" ON public.chats;
  
  -- Tạo lại policy
  CREATE POLICY "Users can view their own chats" 
    ON public.chats FOR SELECT 
    USING (auth.uid()::text = user_id::text OR auth.uid() = user_id);
  
  CREATE POLICY "Users can insert their own chats" 
    ON public.chats FOR INSERT 
    WITH CHECK (auth.uid()::text = user_id::text OR auth.uid() = user_id);
  
  CREATE POLICY "Users can update their own chats" 
    ON public.chats FOR UPDATE 
    USING (auth.uid()::text = user_id::text OR auth.uid() = user_id);
  
  CREATE POLICY "Users can delete their own chats" 
    ON public.chats FOR DELETE 
    USING (auth.uid()::text = user_id::text OR auth.uid() = user_id);
END
$$;

-- Cập nhật policy cho bảng messages
DO $$
BEGIN
  -- Xóa policy cũ nếu tồn tại
  DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.messages;
  DROP POLICY IF EXISTS "Users can insert messages in their chats" ON public.messages;
  DROP POLICY IF EXISTS "Users can update messages in their chats" ON public.messages;
  DROP POLICY IF EXISTS "Users can delete messages in their chats" ON public.messages;
  
  -- Tạo lại policy
  CREATE POLICY "Users can view messages in their chats" 
    ON public.messages FOR SELECT 
    USING (EXISTS (
      SELECT 1 FROM public.chats 
      WHERE chats.id = messages.chat_id 
      AND (chats.user_id::text = auth.uid()::text OR chats.user_id = auth.uid())
    ));
  
  CREATE POLICY "Users can insert messages in their chats" 
    ON public.messages FOR INSERT 
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.chats 
      WHERE chats.id = messages.chat_id 
      AND (chats.user_id::text = auth.uid()::text OR chats.user_id = auth.uid())
    ));
  
  CREATE POLICY "Users can update messages in their chats" 
    ON public.messages FOR UPDATE 
    USING (EXISTS (
      SELECT 1 FROM public.chats 
      WHERE chats.id = messages.chat_id 
      AND (chats.user_id::text = auth.uid()::text OR chats.user_id = auth.uid())
    ));
  
  CREATE POLICY "Users can delete messages in their chats" 
    ON public.messages FOR DELETE 
    USING (EXISTS (
      SELECT 1 FROM public.chats 
      WHERE chats.id = messages.chat_id 
      AND (chats.user_id::text = auth.uid()::text OR chats.user_id = auth.uid())
    ));
END
$$;

-- Tạo index để tăng tốc độ truy vấn
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
