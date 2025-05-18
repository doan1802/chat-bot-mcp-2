-- Script di chuyển dữ liệu từ cơ sở dữ liệu Supabase cũ sang cơ sở dữ liệu mới
-- Lưu ý: Cần thay thế các giá trị URL và API key thực tế

-- 1. Tạo bảng tạm để lưu trữ dữ liệu từ cơ sở dữ liệu cũ
CREATE TABLE IF NOT EXISTS temp_profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS temp_settings (
  id UUID PRIMARY KEY,
  user_id UUID,
  theme TEXT,
  language TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS temp_chats (
  id UUID PRIMARY KEY,
  user_id UUID,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS temp_messages (
  id UUID PRIMARY KEY,
  chat_id UUID,
  role TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE
);

-- 2. Chèn dữ liệu từ cơ sở dữ liệu cũ vào bảng tạm
-- Lưu ý: Cần thực hiện thủ công hoặc sử dụng công cụ xuất/nhập dữ liệu

-- 3. Di chuyển dữ liệu từ bảng tạm sang bảng mới
-- Di chuyển profiles
INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
SELECT id, email, full_name, avatar_url, created_at, updated_at
FROM temp_profiles
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  avatar_url = EXCLUDED.avatar_url,
  updated_at = EXCLUDED.updated_at;

-- Di chuyển settings
INSERT INTO public.settings (id, user_id, theme, language, created_at, updated_at)
SELECT id, user_id, theme, language, created_at, updated_at
FROM temp_settings
ON CONFLICT (user_id) DO UPDATE
SET 
  theme = EXCLUDED.theme,
  language = EXCLUDED.language,
  updated_at = EXCLUDED.updated_at;

-- Di chuyển chats
INSERT INTO public.chats (id, user_id, title, created_at, updated_at)
SELECT id, user_id, title, created_at, updated_at
FROM temp_chats
ON CONFLICT (id) DO UPDATE
SET 
  title = EXCLUDED.title,
  updated_at = EXCLUDED.updated_at;

-- Di chuyển messages
INSERT INTO public.messages (id, chat_id, role, content, created_at)
SELECT id, chat_id, role, content, created_at
FROM temp_messages
ON CONFLICT (id) DO UPDATE
SET 
  content = EXCLUDED.content;

-- 4. Xóa bảng tạm
DROP TABLE IF EXISTS temp_profiles;
DROP TABLE IF EXISTS temp_settings;
DROP TABLE IF EXISTS temp_chats;
DROP TABLE IF EXISTS temp_messages;

-- 5. Tạo các bản ghi settings cho người dùng chưa có
INSERT INTO public.settings (user_id, theme, language)
SELECT id, 'dark', 'en'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.settings s WHERE s.user_id = p.id
);

-- 6. Kiểm tra dữ liệu sau khi di chuyển
SELECT COUNT(*) FROM public.profiles;
SELECT COUNT(*) FROM public.settings;
SELECT COUNT(*) FROM public.chats;
SELECT COUNT(*) FROM public.messages;
