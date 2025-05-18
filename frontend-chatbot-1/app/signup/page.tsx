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

export default function SignUp() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      console.log(`Attempting to sign up with email: ${email.substring(0, 3)}***@${email.split('@')[1]}`)

      // Register using our API client
      const startTime = Date.now();
      const result = await authAPI.register(email, password, fullName);
      const duration = Date.now() - startTime;

      console.log(`Registration completed in ${duration}ms for email: ${email.substring(0, 3)}***@${email.split('@')[1]}`);

      setSuccessMessage("Registration successful! Please check your email for confirmation.")
      // Automatically redirect to sign in after 3 seconds
      setTimeout(() => {
        router.push("/signin")
      }, 3000)
    } catch (error: any) {
      console.error("Sign up error:", error);

      // Try to extract more detailed error message
      let errorMessage = error.message || "An error occurred during sign up";

      // Check for common Supabase errors
      if (errorMessage.includes("User already registered")) {
        errorMessage = "This email is already registered. Please use a different email or try signing in.";
      } else if (errorMessage.includes("Password should be at least")) {
        errorMessage = "Password is too short. Please use at least 6 characters.";
      } else if (errorMessage.includes("rate limit")) {
        errorMessage = "Too many registration attempts. Please try again later.";
      }

      setError(errorMessage);
    } finally {
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
            <CardTitle className="text-2xl font-bold text-white">Create an account</CardTitle>
            <CardDescription className="text-zinc-400">Enter your details below to create your account</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4 bg-red-500/20 border border-red-500/50">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert className="mb-4 bg-green-500/20 border border-green-500/50 text-green-400">
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-white">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className={cn(
                  "bg-zinc-800/50 border-white/10",
                  "text-white placeholder:text-zinc-500",
                  "focus:border-white/20 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                )}
              />
            </div>
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
                  Creating account...
                </>
              ) : (
                "Sign Up"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-zinc-400 text-center w-full">
            Already have an account?{" "}
            <Link href="/signin" className="text-white underline underline-offset-4 hover:text-white/80">
              Sign in
            </Link>
          </div>
        </CardFooter>
        </motion.div>
      </motion.div>
    </div>
  )
}
