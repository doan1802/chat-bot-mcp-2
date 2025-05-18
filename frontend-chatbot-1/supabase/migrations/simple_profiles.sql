-- Tạo bảng profiles đơn giản để lưu trữ thông tin người dùng
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Bật RLS cho bảng profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Tạo policy cho phép mọi người đọc profiles
CREATE POLICY "Allow public read access" 
  ON public.profiles FOR SELECT 
  USING (true);

-- Tạo policy cho phép người dùng cập nhật profile của chính họ
CREATE POLICY "Allow individual update access" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Tạo policy cho phép người dùng chèn profile của chính họ
CREATE POLICY "Allow individual insert access" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Tạo function để tự động tạo profile khi có user mới đăng ký
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tạo trigger để tự động tạo profile khi có user mới đăng ký
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
