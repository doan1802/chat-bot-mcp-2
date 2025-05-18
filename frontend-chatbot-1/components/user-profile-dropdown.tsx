"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { LogOut, User, Settings, HelpCircle, Mail, Phone, Save, Loader2, Camera, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { authAPI, settingsAPI } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface UserProfileDropdownProps {
  user: any
}

export function UserProfileDropdown({ user }: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [profileData, setProfileData] = useState({
    fullName: user?.full_name || "",
    email: user?.email || "",
    phone: "",
    bio: "",
    avatarUrl: user?.avatar_url || ""
  })
  const [apiKeys, setApiKeys] = useState({
    gemini_api_key: "",
    vapi_api_key: "",
    raper_url: ""
  })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Tải API keys khi mở Settings dialog
  useEffect(() => {
    if (isSettingsOpen) {
      const loadSettings = async () => {
        try {
          const { settings } = await settingsAPI.getSettings()
          if (settings) {
            setApiKeys({
              gemini_api_key: settings.gemini_api_key || "",
              vapi_api_key: settings.vapi_api_key || "",
              raper_url: settings.raper_url || ""
            })
          }
        } catch (error) {
          console.error("Error loading settings:", error)
          // Không hiển thị lỗi cho người dùng, chỉ ghi log
        }
      }

      loadSettings()
    }
  }, [isSettingsOpen])

  const handleSignOut = async () => {
    try {
      console.log("Signing out...")
      await authAPI.logout()
      console.log("Sign out successful, redirecting to home page")
      window.location.href = "/"
    } catch (error) {
      console.error("Error signing out:", error)
      // Even if there's an error, still redirect to home page
      window.location.href = "/"
    }
  }

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setApiKeys(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Here you would make an actual API call to update the profile
      // const response = await userAPI.updateProfile(profileData)

      setSuccess("Profile updated successfully!")
      setLoading(false)

      // Close the dialog after a short delay
      setTimeout(() => {
        setIsProfileOpen(false)
        setSuccess("")
      }, 2000)
    } catch (error) {
      console.error("Error updating profile:", error)
      setError("Failed to update profile. Please try again.")
      setLoading(false)
    }
  }

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      // Gọi API để lưu API keys
      await settingsAPI.updateSettings(apiKeys)

      setSuccess("Settings saved successfully!")
      setLoading(false)

      // Close the dialog after a short delay
      setTimeout(() => {
        setIsSettingsOpen(false)
        setSuccess("")
      }, 2000)
    } catch (error) {
      console.error("Error saving settings:", error)
      setError("Failed to save settings. Please try again.")
      setLoading(false)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800/70 hover:bg-zinc-800/90 transition-colors border border-white/10 focus:outline-none"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-white font-medium text-sm">{user?.email?.charAt(0).toUpperCase() || "U"}</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
              scale: 0.95,
              backgroundColor: "rgba(39, 39, 42, 0.6)"
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              backgroundColor: "rgba(39, 39, 42, 0.6)"
            }}
            exit={{
              opacity: 0,
              y: 10,
              scale: 0.95,
              backgroundColor: "rgba(39, 39, 42, 0.6)"
            }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 rounded-lg backdrop-blur-md bg-zinc-800/60 border border-white/10 shadow-lg z-50 overflow-hidden"
          >
            <div className="p-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-800/70 flex items-center justify-center">
                  <User className="w-5 h-5 text-white/90" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                  <p className="text-xs text-white/70 truncate">User ID: {user?.id.substring(0, 8)}...</p>
                </div>
              </div>
            </div>

            <div className="p-2">
              <ProfileMenuItem
                icon={<User className="w-4 h-4" />}
                label="Profile"
                onClick={() => {
                  setIsProfileOpen(true)
                  setIsOpen(false)
                }}
              />
              <ProfileMenuItem
                icon={<Settings className="w-4 h-4" />}
                label="Settings"
                onClick={() => {
                  setIsSettingsOpen(true)
                  setIsOpen(false)
                }}
              />
              <ProfileMenuItem
                icon={<HelpCircle className="w-4 h-4" />}
                label="Help"
                onClick={() => {
                  setIsHelpOpen(true)
                  setIsOpen(false)
                }}
              />
              <ProfileMenuItem
                icon={<LogOut className="w-4 h-4" />}
                label="Sign Out"
                onClick={handleSignOut}
                className="text-red-400 hover:text-red-300"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="backdrop-blur-md bg-zinc-800/60 border border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">Edit Profile</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Update your profile information
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="mb-4 bg-red-500/20 border border-red-500/50">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 bg-green-500/20 border border-green-500/50 text-green-400">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-center mb-4">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-zinc-700/50 cursor-pointer" onClick={handleAvatarClick}>
                  {(previewUrl || profileData.avatarUrl) ? (
                    <AvatarImage src={previewUrl || profileData.avatarUrl} />
                  ) : (
                    <AvatarFallback className="bg-zinc-700 text-white text-xl">
                      {profileData.fullName.charAt(0) || user?.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="absolute bottom-0 right-0 bg-zinc-700 rounded-full p-1 border border-white/10 cursor-pointer" onClick={handleAvatarClick}>
                  <Camera className="w-4 h-4 text-white" />
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-white">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                value={profileData.fullName}
                onChange={handleProfileChange}
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
                name="email"
                type="email"
                value={profileData.email}
                onChange={handleProfileChange}
                className={cn(
                  "bg-zinc-800/50 border-white/10",
                  "text-white placeholder:text-zinc-500",
                  "focus:border-white/20 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-white">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={profileData.phone}
                onChange={handleProfileChange}
                className={cn(
                  "bg-zinc-800/50 border-white/10",
                  "text-white placeholder:text-zinc-500",
                  "focus:border-white/20 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="text-white">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                value={profileData.bio}
                onChange={handleProfileChange}
                className={cn(
                  "bg-zinc-800/50 border-white/10",
                  "text-white placeholder:text-zinc-500",
                  "focus:border-white/20 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                  "min-h-[100px]"
                )}
              />
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsProfileOpen(false)}
                className="border-white/10 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-white/10 text-white border border-white/10 hover:bg-white/20 hover:border-white/20"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="backdrop-blur-md bg-zinc-800/60 border border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">Settings</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Manage your account settings and API keys
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSettingsSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="mb-4 bg-red-500/20 border border-red-500/50">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 bg-green-500/20 border border-green-500/50 text-green-400">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="gemini_api_key" className="text-white">Gemini API Key</Label>
              <Input
                id="gemini_api_key"
                name="gemini_api_key"
                type="password"
                value={apiKeys.gemini_api_key}
                onChange={handleApiKeyChange}
                className={cn(
                  "bg-zinc-800/50 border-white/10",
                  "text-white placeholder:text-zinc-500",
                  "focus:border-white/20 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                )}
                placeholder="Enter your Gemini API key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vapi_api_key" className="text-white">Vapi API Key</Label>
              <Input
                id="vapi_api_key"
                name="vapi_api_key"
                type="password"
                value={apiKeys.vapi_api_key}
                onChange={handleApiKeyChange}
                className={cn(
                  "bg-zinc-800/50 border-white/10",
                  "text-white placeholder:text-zinc-500",
                  "focus:border-white/20 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                )}
                placeholder="Enter your Vapi API key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="raper_url" className="text-white">Raper URL</Label>
              <Input
                id="raper_url"
                name="raper_url"
                type="text"
                value={apiKeys.raper_url}
                onChange={handleApiKeyChange}
                className={cn(
                  "bg-zinc-800/50 border-white/10",
                  "text-white placeholder:text-zinc-500",
                  "focus:border-white/20 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                )}
                placeholder="Enter your Raper URL"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme" className="text-white">Theme</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-white/10 text-white hover:bg-white/10"
                >
                  Light
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-white/10 bg-white/10 text-white hover:bg-white/20"
                >
                  Dark
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notifications" className="text-white">Notifications</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="notifications"
                  className="h-4 w-4 rounded border-white/10 bg-zinc-800/50"
                />
                <Label htmlFor="notifications" className="text-sm text-white/80">
                  Enable email notifications
                </Label>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSettingsOpen(false)}
                className="border-white/10 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-white/10 text-white border border-white/10 hover:bg-white/20 hover:border-white/20"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="backdrop-blur-md bg-zinc-800/60 border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">Help Center</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Get help with your account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 p-4">
              <h3 className="text-lg font-medium mb-2">Frequently Asked Questions</h3>
              <ul className="space-y-2 text-white/80">
                <li className="hover:text-white cursor-pointer">How do I reset my password?</li>
                <li className="hover:text-white cursor-pointer">How to update my profile information?</li>
                <li className="hover:text-white cursor-pointer">Can I delete my account?</li>
              </ul>
            </div>

            <div className="rounded-lg border border-white/10 p-4">
              <h3 className="text-lg font-medium mb-2">Contact Support</h3>
              <p className="text-white/80 mb-4">
                Need more help? Contact our support team.
              </p>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center gap-2 text-white/80">
                  <Mail className="w-4 h-4" />
                  <span>support@example.com</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <Phone className="w-4 h-4" />
                  <span>+1 (123) 456-7890</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                className="bg-white/10 text-white border border-white/10 hover:bg-white/20 hover:border-white/20"
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface ProfileMenuItemProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  className?: string
}

function ProfileMenuItem({ icon, label, onClick, className }: ProfileMenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors",
        className,
      )}
    >
      <span className="text-white/70">{icon}</span>
      <span>{label}</span>
    </button>
  )
}



