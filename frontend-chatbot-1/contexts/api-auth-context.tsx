"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { authAPI, userAPI, isAuthenticated } from "@/lib/api"

type User = {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
}

type AuthContextType = {
  user: User | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (data: { full_name?: string; avatar_url?: string }) => Promise<void>
}

const ApiAuthContext = createContext<AuthContextType | undefined>(undefined)

export function ApiAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadUserProfile() {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setIsLoading(false)
          return
        }

        const authenticated = await isAuthenticated()
        if (!authenticated) {
          setIsLoading(false)
          return
        }

        const { profile } = await userAPI.getProfile()
        if (profile) {
          setUser({
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url
          })
        }
      } catch (error) {
        console.error('Error loading user profile:', error)
        // Don't call logout here to avoid infinite loop
        // Just clear the tokens
        localStorage.removeItem('auth_token')
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
      } finally {
        setIsLoading(false)
      }
    }

    loadUserProfile()
  }, [])

  const signIn = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      // Login and get user data
      const { user } = await authAPI.login(email, password)

      // Set user with data from login response
      // The login response already contains basic user info
      setUser({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url
      })

    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    setIsLoading(true)
    try {
      await authAPI.register(email, password, fullName)
      // Note: We don't automatically sign in after registration
      // User needs to verify email first (if enabled)
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    setIsLoading(true)
    try {
      await authAPI.logout()
      setUser(null)
      // Redirect to home page is handled in authAPI.logout()
    } catch (error) {
      console.error('Sign out error:', error)
      // Even if there's an error, redirect to home page
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (data: { full_name?: string; avatar_url?: string }) => {
    try {
      const { profile } = await userAPI.updateProfile(data)
      if (user && profile) {
        setUser({
          ...user,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url
        })
      }
    } catch (error) {
      console.error('Update profile error:', error)
      throw error
    }
  }

  const value = {
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
    updateProfile
  }

  return <ApiAuthContext.Provider value={value}>{children}</ApiAuthContext.Provider>
}

export const useApiAuth = () => {
  const context = useContext(ApiAuthContext)
  if (context === undefined) {
    throw new Error("useApiAuth must be used within an ApiAuthProvider")
  }
  return context
}
