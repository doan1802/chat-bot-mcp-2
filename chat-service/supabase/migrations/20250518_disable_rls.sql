-- Tắt RLS cho bảng chats
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;

-- Tắt RLS cho bảng messages
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
