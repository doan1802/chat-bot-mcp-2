# Scripts để quản lý cơ sở dữ liệu chat-service

Thư mục này chứa các script để quản lý cơ sở dữ liệu của chat-service.

## Các script có sẵn

1. **setup-database.js**: Chạy tất cả các script theo thứ tự để thiết lập cơ sở dữ liệu
2. **create-tables.js**: Tạo các bảng chats và messages nếu chưa tồn tại
3. **run-migration.js**: Chạy file migration SQL
4. **check-database.js**: Kiểm tra kết nối và cấu trúc bảng dữ liệu

## Cách sử dụng

### Thiết lập cơ sở dữ liệu

Để thiết lập cơ sở dữ liệu từ đầu, chạy lệnh sau:

```bash
npm run setup-db
```

Lệnh này sẽ chạy tất cả các script theo thứ tự:
1. Tạo các bảng chats và messages
2. Cập nhật cấu trúc bảng để đảm bảo user_id được xử lý đúng
3. Kiểm tra cấu trúc bảng sau khi cập nhật

### Kiểm tra cơ sở dữ liệu

Để kiểm tra kết nối và cấu trúc bảng dữ liệu, chạy lệnh sau:

```bash
npm run check-db
```

### Tạo bảng

Để tạo các bảng chats và messages nếu chưa tồn tại, chạy lệnh sau:

```bash
npm run create-tables
```

### Chạy migration

Để chạy file migration SQL, chạy lệnh sau:

```bash
npm run run-migration
```

## Cấu trúc bảng dữ liệu

### Bảng chats

```sql
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

### Bảng messages

```sql
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

## Lưu ý

- Các script này yêu cầu cấu hình đúng trong file `.env` của chat-service
- Các script này sử dụng Supabase để kết nối với cơ sở dữ liệu
- Đảm bảo rằng bạn đã cài đặt các dependencies cần thiết bằng cách chạy `npm install`
