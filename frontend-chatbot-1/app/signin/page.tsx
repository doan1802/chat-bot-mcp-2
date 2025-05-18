"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { authAPI, isAuthenticated } from "@/lib/api"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export default function SignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  const router = useRouter()

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        router.push("/dashboard");
      }
      setCheckingSession(false);
    }

    checkSession()
  }, [router])



  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Starting login process...`)

    try {
      console.log(`[${new Date().toISOString()}] Attempting to sign in with email: ${email.substring(0, 3)}***@${email.split('@')[1]}`)

      // Login
      console.log(`[${new Date().toISOString()}] Sending login request`);
      const loginStartTime = Date.now();
      const result = await authAPI.login(email, password)
      const loginDuration = Date.now() - loginStartTime;

      console.log(`[${new Date().toISOString()}] Login API call completed in ${loginDuration}ms`)
      console.log(`[${new Date().toISOString()}] Login successful for user: ${result.user.email.substring(0, 3)}***@${result.user.email.split('@')[1]}`)

      // Store token in localStorage if not already done by the API client
      if (result.token && !localStorage.getItem('auth_token')) {
        localStorage.setItem('auth_token', result.token);
        console.log(`[${new Date().toISOString()}] Token stored in localStorage`);

        // Also store in cookie for middleware
        document.cookie = `auth_token=${result.token}; path=/; max-age=86400; SameSite=Lax`;
        console.log(`[${new Date().toISOString()}] Token stored in cookie`);
      }

      const totalDuration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] Total login process took ${totalDuration}ms, redirecting to dashboard...`)

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] Sign in error after ${duration}ms:`, error)

      // Provide more specific error messages
      if (error.message.includes('timeout') || error.message.includes('abort')) {
        setError("Login request timed out. Please try again.")
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        setError("Network error. Please check your connection and try again.")
      } else if (error.message.includes('Email not confirmed')) {
        setError("Email not confirmed. Please check your email inbox and click the confirmation link.")
      } else if (error.message.includes('Invalid login credentials')) {
        setError("Invalid email or password. Please try again or use test@example.com / password123 for testing.")
      } else {
        setError(error.message || "An error occurred during sign in")
      }

      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative text-white flex items-center justify-center">
      {/* Background image */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url("/meme.png")',
            opacity: 1,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat'
          }}
        />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-md px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="backdrop-blur-md bg-zinc-800/60 rounded-xl border border-white/10 overflow-hidden"
          whileHover={{ boxShadow: "0 0 15px rgba(255, 255, 255, 0.1)" }}
        >
          <CardHeader className="space-y-1">
            <div className="flex justify-between items-center mb-2">
              <CardTitle className="text-2xl font-bold text-white">Sign in to your account</CardTitle>
            </div>
            <CardDescription className="text-zinc-400">Enter your email and password to sign in to your account</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4 bg-red-500/20 border border-red-500/50">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}


          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={cn(
                  "bg-zinc-800/50 border-white/10",
                  "text-white placeholder:text-zinc-500",
                  "focus:border-white/20 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={cn(
                  "bg-zinc-800/50 border-white/10",
                  "text-white placeholder:text-zinc-500",
                  "focus:border-white/20 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                )}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-white/10 text-white border border-white/10 hover:bg-white/20 hover:border-white/20 hover:scale-102 transition-transform"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-zinc-400 text-center w-full">
            Don't have an account?{" "}
            <Link href="/signup" className="text-white underline underline-offset-4 hover:text-white/80">
              Sign up
            </Link>
          </div>
        </CardFooter>
        </motion.div>
      </motion.div>
    </div>
  )
}
