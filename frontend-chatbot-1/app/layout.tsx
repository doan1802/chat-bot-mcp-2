import type React from "react"
import "@/app/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ApiAuthProvider } from "@/contexts/api-auth-context"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Serna",
}

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
