-- Cập nhật bảng settings để thêm các trường API key
ALTER TABLE IF EXISTS public.settings 
ADD COLUMN IF NOT EXISTS gemini_api_key TEXT,
ADD COLUMN IF NOT EXISTS vapi_api_key TEXT,
ADD COLUMN IF NOT EXISTS raper_url TEXT;

-- Nếu bảng settings chưa tồn tại, tạo mới
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  theme TEXT DEFAULT 'dark' NOT NULL,
  language TEXT DEFAULT 'en' NOT NULL,
  gemini_api_key TEXT,
  vapi_api_key TEXT,
  raper_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Bật RLS cho bảng settings nếu chưa được bật
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Tạo các policy nếu chưa tồn tại
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'Users can view their own settings'
  ) THEN
    CREATE POLICY "Users can view their own settings" 
      ON public.settings FOR SELECT 
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'Users can insert their own settings'
  ) THEN
    CREATE POLICY "Users can insert their own settings" 
      ON public.settings FOR INSERT 
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'Users can update their own settings'
  ) THEN
    CREATE POLICY "Users can update their own settings" 
      ON public.settings FOR UPDATE 
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Tạo trigger để tự động cập nhật trường updated_at nếu chưa tồn tại
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;
