"use client"

import React, { useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface CustomDialogProps {
  trigger: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: string
}

export function CustomDialog({
  trigger,
  title,
  description,
  children,
  footer,
  maxWidth = "sm:max-w-lg"
}: CustomDialogProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(true)
  }

  const handleClose = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setIsOpen(false)
  }

  // Prevent closing when clicking inside the dialog
  const handleDialogClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  if (!isOpen) {
    return (
      <div onClick={handleOpen}>
        {trigger}
      </div>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[101] bg-black/80 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Dialog Content */}
      <div 
        className={cn(
          "fixed left-1/2 top-1/2 z-[101] grid max-h-[calc(100vh-4rem)] w-full -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto border bg-background p-0 shadow-lg shadow-black/5 duration-200 sm:rounded-xl",
          maxWidth
        )}
        onClick={handleDialogClick}
        style={{ margin: '0 auto' }}
      >
        {/* Header */}
        <div className="border-b border-border px-6 py-4 text-base font-semibold">
          {title}
        </div>
        
        {/* Description (sr-only) */}
        {description && (
          <div className="sr-only">
            {description}
          </div>
        )}
        
        {/* Content */}
        <div className="overflow-y-auto">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="border-t border-border px-6 py-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            {footer}
          </div>
        )}
        
        {/* Close Button */}
        <button 
          className="group absolute right-3 top-3 flex size-7 items-center justify-center rounded-lg outline-offset-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none"
          onClick={handleClose}
        >
          <X
            width={16}
            height={16}
            strokeWidth={2}
            className="opacity-60 transition-opacity group-hover:opacity-100"
          />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </>
  )
}

export function CustomDialogFooter({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  )
}


