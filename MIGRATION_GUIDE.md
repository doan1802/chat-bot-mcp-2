# Hướng dẫn di chuyển từ Supabase sang API Gateway

Tài liệu này hướng dẫn cách di chuyển từ việc sử dụng Supabase trực tiếp trong frontend sang việc sử dụng API Gateway và User Service.

## Tổng quan

Chúng ta đang chuyển từ mô hình:
```
Frontend -> Supabase
```

Sang mô hình:
```
Frontend -> API Gateway -> User Service -> Supabase
```

## Các bước di chuyển

### 1. Cập nhật biến môi trường

Tạo file `.env` từ `.env.example` và cập nhật các giá trị:

```bash
cd frontend-chatbot-1
cp .env.example .env
```

Cập nhật các giá trị trong `.env`:
```
NEXT_PUBLIC_SUPABASE_URL=https://eahsqvsnffcmsxrvzytq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 2. Sử dụng ApiAuthProvider thay vì AuthProvider

Trong `app/layout.tsx`, thay đổi từ `AuthProvider` sang `ApiAuthProvider`:

```tsx
import { ApiAuthProvider } from "@/contexts/api-auth-context"

// ...

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme="dark">
          <ApiAuthProvider>{children}</ApiAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### 3. Cập nhật các component sử dụng useAuth

Thay đổi từ `useAuth` sang `useApiAuth` trong các component:

```tsx
// Thay đổi từ
import { useAuth } from "@/contexts/auth-context"

// Sang
import { useApiAuth } from "@/contexts/api-auth-context"

// Và sử dụng
const { user, signIn, signOut, isLoading } = useApiAuth()
```

### 4. Cập nhật các trang đăng nhập/đăng ký

#### Trang đăng nhập (signin/page.tsx)

```tsx
// Thay đổi từ
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
})

// Sang
try {
  await signIn(email, password)
  router.push("/dashboard")
} catch (error: any) {
  setError(error.message || "An error occurred during sign in")
}
```

#### Trang đăng ký (signup/page.tsx)

```tsx
// Thay đổi từ
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: fullName
    }
  }
})

// Sang
try {
  await signUp(email, password, fullName)
  setSuccessMessage("Registration successful! Please check your email for confirmation.")
  // Automatically redirect to sign in after 3 seconds
  setTimeout(() => {
    router.push("/signin")
  }, 3000)
} catch (error: any) {
  setError(error.message || "An error occurred during sign up")
}
```

### 5. Cập nhật middleware.ts

Cập nhật middleware để sử dụng token từ API Gateway thay vì Supabase:

```tsx
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  try {
    // Kiểm tra xem có token không
    const authToken = req.cookies.get('auth_token')?.value

    // Nếu người dùng chưa đăng nhập và đang truy cập trang dashboard, chuyển hướng đến trang đăng nhập
    if (!authToken && req.nextUrl.pathname.startsWith("/dashboard")) {
      // Redirect to signin page
      const redirectUrl = new URL("/signin", req.url)
      return NextResponse.redirect(redirectUrl)
    }

    // Nếu người dùng đã đăng nhập và đang truy cập trang đăng nhập/đăng ký, chuyển hướng đến dashboard
    if (authToken && (req.nextUrl.pathname === "/signin" || req.nextUrl.pathname === "/signup")) {
      // Redirect to dashboard page
      const redirectUrl = new URL("/dashboard", req.url)
      return NextResponse.redirect(redirectUrl)
    }

    return res
  } catch (error) {
    // Handle exception silently
    return res
  }
}

export const config = {
  matcher: ["/signin", "/signup", "/dashboard/:path*"],
}
```

## Lưu ý quan trọng

1. **Chạy song song**: Trong quá trình di chuyển, bạn có thể chạy song song cả hai hệ thống (Supabase trực tiếp và thông qua API Gateway) để đảm bảo mọi thứ hoạt động đúng.

2. **Xử lý token**: Đảm bảo lưu trữ và sử dụng token JWT từ API Gateway đúng cách.

3. **Kiểm tra kỹ lưỡng**: Kiểm tra kỹ lưỡng tất cả các chức năng xác thực và quản lý người dùng sau khi di chuyển.

## Các vấn đề thường gặp

1. **Token không hợp lệ**: Đảm bảo JWT_SECRET giống nhau trong cả User Service và API Gateway.

2. **CORS**: Nếu gặp lỗi CORS, hãy kiểm tra cấu hình CORS trong API Gateway và User Service.

3. **Lỗi 401 Unauthorized**: Kiểm tra xem token có được gửi đúng cách trong header Authorization không.
