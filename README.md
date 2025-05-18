# Microservice Architecture Project

Dự án này được thiết kế theo mô hình microservice, bao gồm:
- Frontend (Next.js)
- API Gateway
- User Service

## Cấu trúc dự án

```
/chat-bot
  /frontend-chatbot-1 (Next.js frontend)
  /api-gateway (API Gateway service)
  /user-service (User authentication & management service)
```

## Cài đặt và chạy

### User Service

1. Cấu hình biến môi trường:
   ```
   cd user-service
   cp .env.example .env
   ```
   Cập nhật các giá trị trong file `.env`:
   - `SUPABASE_URL`: URL của Supabase
   - `SUPABASE_ANON_KEY`: Supabase anonymous key
   - `JWT_SECRET`: Secret key để ký JWT tokens

2. Cài đặt dependencies:
   ```
   npm install
   ```

3. Chạy service:
   ```
   npm run dev
   ```
   Service sẽ chạy tại `http://localhost:3001`

### API Gateway

1. Cấu hình biến môi trường:
   ```
   cd api-gateway
   cp .env.example .env
   ```
   Cập nhật các giá trị trong file `.env`:
   - `USER_SERVICE_URL`: URL của User Service (mặc định: http://localhost:3001)
   - `JWT_SECRET`: Secret key để xác thực JWT tokens (phải giống với User Service)

2. Cài đặt dependencies:
   ```
   npm install
   ```

3. Chạy service:
   ```
   npm run dev
   ```
   API Gateway sẽ chạy tại `http://localhost:3000`

## API Endpoints

### User Service (thông qua API Gateway)

#### Authentication
- `POST /api/user-service/auth/register` - Đăng ký người dùng mới
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "full_name": "User Name"
  }
  ```

- `POST /api/user-service/auth/login` - Đăng nhập
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

- `POST /api/user-service/auth/logout` - Đăng xuất

#### User Management (yêu cầu xác thực)
- `GET /api/user-service/users/profile` - Lấy thông tin người dùng
- `PUT /api/user-service/users/profile` - Cập nhật thông tin người dùng
  ```json
  {
    "full_name": "New Name",
    "avatar_url": "https://example.com/avatar.jpg"
  }
  ```

## Xác thực

Các API yêu cầu xác thực cần gửi kèm JWT token trong header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Phát triển thêm

Để thêm service mới:
1. Tạo thư mục mới cho service
2. Thiết lập service với các API endpoints cần thiết
3. Cập nhật API Gateway để định tuyến đến service mới
