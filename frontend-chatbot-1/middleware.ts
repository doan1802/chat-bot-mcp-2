import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  try {
    // Check for auth token in cookies
    const authToken = req.cookies.get('auth_token')?.value
    const isAuthenticated = !!authToken

    // If user is not authenticated and trying to access dashboard, redirect to signin
    if (!isAuthenticated && req.nextUrl.pathname.startsWith("/dashboard")) {
      console.log("Unauthenticated user trying to access dashboard, redirecting to signin")
      const redirectUrl = new URL("/signin", req.url)
      const response = NextResponse.redirect(redirectUrl)
      response.cookies.delete('auth_token')
      return response
    }

    // If user is authenticated and trying to access signin/signup, redirect to dashboard
    if (isAuthenticated && (req.nextUrl.pathname === "/signin" || req.nextUrl.pathname === "/signup")) {
      console.log("Authenticated user trying to access signin/signup, redirecting to dashboard")
      const redirectUrl = new URL("/dashboard", req.url)
      return NextResponse.redirect(redirectUrl)
    }

    // Set authentication status in headers for potential use by client
    if (isAuthenticated) {
      res.headers.set('x-session-active', 'true')
    } else {
      res.headers.set('x-session-active', 'false')
    }

    return res
  } catch (error) {
    // Handle exception silently
    console.error("Error in middleware:", error)
    return res
  }
}

export const config = {
  matcher: ["/signin", "/signup", "/dashboard/:path*"],
}
