"use client"

import { useEffect, useState } from "react"
import { HeroSection, Features, Cta11Demo, SiteFooter } from "@/components/blocks"
import { Loader2 } from "lucide-react"
import { isAuthenticated } from "@/lib/api"

export default function Home() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      try {
        console.log("Checking session on homepage...")

        // Check if authentication token exists
        const authenticated = await isAuthenticated();
        if (authenticated) {
          console.log("User already logged in, redirecting to dashboard...")
          window.location.href = "/dashboard"
          return
        }

        setLoading(false)
      } catch (error) {
        console.error("Exception checking session:", error)
        setLoading(false)
      }
    }

    // Set a short timeout to ensure the page has been rendered before checking the session
    const timer = setTimeout(() => {
      checkSession()
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div>
      <HeroSection />
      <Features />
      <Cta11Demo />
      <SiteFooter />
    </div>
  )
}
