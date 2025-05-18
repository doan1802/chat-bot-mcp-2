import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token = requestUrl.searchParams.get("token")
  const error = requestUrl.searchParams.get("error")

  console.log("Auth callback called with URL:", request.url)

  // Handle error if present
  if (error) {
    console.error("Error in auth callback:", error)
    return NextResponse.redirect(new URL(`/signin?error=${error}`, request.url))
  }

  // Handle token if present
  if (token) {
    try {
      // Instead of setting cookies server-side, we'll pass the token to the client
      // and let the client-side code handle storing it
      console.log("Redirecting with token for client-side storage")

      // Create response with redirect
      const response = NextResponse.redirect(new URL("/dashboard", request.url))

      // Set token in a cookie
      response.cookies.set({
        name: 'auth_token',
        value: token,
        path: '/',
        maxAge: 60 * 60 * 24, // 1 day
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })

      return response
    } catch (error) {
      console.error("Exception in auth callback:", error)
      return NextResponse.redirect(new URL("/signin?error=auth_callback_exception", request.url))
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL("/dashboard", request.url))
}
