"use client"

import type React from "react"

import { Blocks, CreditCard, FileText, Webhook, Shield, Users, BarChart, Code } from "lucide-react"
import { Footer } from "@/components/blocks/footer"

const PlausibleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <path strokeWidth="2" d="M4 8.5V23c3 0 6-3 6-5.5h2.5c4 0 7.5-4 7.5-9 0-3-3-7.5-8-7.5S4 5.5 4 8.5Z" />
  </svg>
)

const AIIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      strokeWidth="2"
      d="M12 2a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 10a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2zM4 12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2zm8 0a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2z"
    />
  </svg>
)

const AnalyticsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <path strokeWidth="2" d="M3 3v18h18M9 9v9m4-6v6m4-3v3" />
  </svg>
)

export function SiteFooter() {
  return (
    <Footer
      className="mt-20"
      brand={{
        name: "Nemo.",
        description: "Modern solutions for customer engagement and analytics.",
      }}
      socialLinks={[
        {
          name: "Twitter",
          href: "https://twitter.com",
        },
        {
          name: "Github",
          href: "https://github.com",
        },
        {
          name: "Discord",
          href: "#",
        },
      ]}
      columns={[
        {
          title: "Product",
          links: [
            {
              name: "Features",
              Icon: Blocks,
              href: "#features",
            },
            {
              name: "Pricing",
              Icon: CreditCard,
              href: "#pricing",
            },
            {
              name: "Integrations",
              Icon: Webhook,
              href: "#integrations",
            },
            {
              name: "API Documentation",
              Icon: Code,
              href: "/docs/api",
            },
          ],
        },
        {
          title: "Solutions",
          links: [
            {
              name: "Analytics",
              Icon: AnalyticsIcon,
              href: "/solutions/analytics",
            },
            {
              name: "AI Models",
              Icon: AIIcon,
              href: "/solutions/ai",
            },
            {
              name: "Enterprise",
              Icon: BarChart,
              href: "/solutions/enterprise",
            },
            {
              name: "Teams",
              Icon: Users,
              href: "/solutions/teams",
            },
          ],
        },
        {
          title: "Legal",
          links: [
            {
              name: "Privacy Policy",
              Icon: Shield,
              href: "/legal/privacy",
            },
            {
              name: "Terms of Service",
              Icon: FileText,
              href: "/legal/terms",
            },
          ],
        },
      ]}
      copyright="© 2024 Nemo Inc. All rights reserved."
    />
  )
}
