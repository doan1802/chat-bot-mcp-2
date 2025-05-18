"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { LogOut, User, Settings, HelpCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { authAPI } from "@/lib/api"

interface UserProfileDropdownProps {
  user: any
}

export function UserProfileDropdown({ user }: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
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
              <ProfileMenuItem icon={<User className="w-4 h-4" />} label="Profile" onClick={() => {}} />
              <ProfileMenuItem icon={<Settings className="w-4 h-4" />} label="Settings" onClick={() => {}} />
              <ProfileMenuItem icon={<HelpCircle className="w-4 h-4" />} label="Help" onClick={() => {}} />
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

function Avatar({ defaultImage, useImageUpload }: { defaultImage?: string, useImageUpload: any }) {
  const { previewUrl, fileInputRef, handleThumbnailClick, handleFileChange } = useImageUpload;

  const currentImage = previewUrl || defaultImage;

  return (
    <div className="-mt-10 px-6">
      <div className="relative flex size-20 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-muted shadow-sm shadow-black/10">
        {currentImage && (
          <img
            src={currentImage}
            className="h-full w-full object-cover"
            width={80}
            height={80}
            alt="Profile image"
          />
        )}
        <button
          type="button"
          className="absolute flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white outline-offset-2 transition-colors hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70"
          onClick={handleThumbnailClick}
          aria-label="Change profile picture"
        >
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
          aria-label="Upload profile picture"
        />
      </div>
    </div>
  );
}
