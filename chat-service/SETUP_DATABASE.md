# Hướng dẫn thiết lập cơ sở dữ liệu cho chat-service

Tài liệu này hướng dẫn cách thiết lập cơ sở dữ liệu cho chat-service.

## Cấu hình môi trường

Trước khi bắt đầu, đảm bảo rằng bạn đã cấu hình đúng các biến môi trường trong file `.env`:

```
PORT=3004
SUPABASE_URL=https://your-supabase-url.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
JWT_SECRET=your-jwt-secret
USER_SERVICE_URL=http://localhost:3001
```

## Thiết lập cơ sở dữ liệu

### Bước 1: Cài đặt dependencies

```bash
npm install
```

### Bước 2: Chạy script thiết lập cơ sở dữ liệu

```bash
npm run setup-db
```

Script này sẽ:
1. Tạo các bảng chats và messages nếu chưa tồn tại
2. Cập nhật cấu trúc bảng để đảm bảo user_id được xử lý đúng
3. Kiểm tra cấu trúc bảng sau khi cập nhật

### Bước 3: Kiểm tra kết nối và cấu trúc bảng

```bash
npm run check-db
```

## Cấu trúc bảng dữ liệu

### Bảng chats

Bảng `chats` lưu trữ thông tin về các cuộc trò chuyện:

| Cột | Kiểu dữ liệu | Mô tả |
|-----|--------------|-------|
| id | UUID | Khóa chính, tự động tạo |
| user_id | UUID | ID của người dùng sở hữu cuộc trò chuyện |
| title | TEXT | Tiêu đề cuộc trò chuyện |
| created_at | TIMESTAMP | Thời gian tạo cuộc trò chuyện |
| updated_at | TIMESTAMP | Thời gian cập nhật cuộc trò chuyện |

### Bảng messages

Bảng `messages` lưu trữ các tin nhắn trong cuộc trò chuyện:

| Cột | Kiểu dữ liệu | Mô tả |
|-----|--------------|-------|
| id | UUID | Khóa chính, tự động tạo |
| chat_id | UUID | ID của cuộc trò chuyện, khóa ngoại tham chiếu đến bảng chats |
| role | TEXT | Vai trò của tin nhắn (user hoặc assistant) |
| content | TEXT | Nội dung tin nhắn |
| created_at | TIMESTAMP | Thời gian tạo tin nhắn |

## Xử lý user_id

Trong chat-service, user_id được lấy từ token JWT được gửi từ frontend. Để đảm bảo rằng user_id được xử lý đúng, chúng tôi đã thực hiện các thay đổi sau:

1. Đảm bảo rằng user_id luôn được lưu dưới dạng chuỗi (string) trong cơ sở dữ liệu
2. Cập nhật các policy để cho phép truy cập dữ liệu dựa trên user_id
3. Cập nhật middleware xác thực để đảm bảo rằng user_id được xử lý đúng

## Khắc phục sự cố

### Lỗi kết nối Supabase

Nếu bạn gặp lỗi kết nối Supabase, hãy kiểm tra:
- SUPABASE_URL và SUPABASE_ANON_KEY trong file .env
- Kết nối mạng
- Trạng thái của Supabase

### Lỗi tạo bảng

Nếu bạn gặp lỗi khi tạo bảng, hãy kiểm tra:
- Quyền của người dùng Supabase
- Cấu trúc SQL trong file migration

### Lỗi xác thực

Nếu bạn gặp lỗi xác thực, hãy kiểm tra:
- JWT_SECRET trong file .env (phải giống với JWT_SECRET trong user-service)
- Token JWT được gửi từ frontend

## Tài liệu tham khảo

- [Tài liệu Supabase](https://supabase.io/docs)
- [Tài liệu JWT](https://jwt.io/introduction)
- [Tài liệu Node.js](https://nodejs.org/en/docs/)
