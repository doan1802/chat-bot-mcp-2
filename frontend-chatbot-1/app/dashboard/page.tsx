"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ProfessionalChat } from "@/components/ui/professional-chat";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import { Loader2 } from "lucide-react";
import { userAPI, isAuthenticated } from "@/lib/api";

interface Message {
    id: number;
    content: string;
    sender: "user" | "bot";
    timestamp: string;
}

export default function Dashboard() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const router = useRouter();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Logo component
    const Logo = () => {
        return (
            <div className="flex items-center gap-2">
                {/* <svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto">
                    <path d="M3 0H5V18H3V0ZM13 0H15V18H13V0ZM18 3V5H0V3H18ZM0 15V13H18V15H0Z" fill="url(#logo-gradient)" />
                    <defs>
                        <linearGradient id="logo-gradient" x1="10" y1="0" x2="10" y2="20" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#9B99FE" />
                            <stop offset="1" stopColor="#2BC8B7" />
                        </linearGradient>
                    </defs>
                </svg> */}
                <span className="font-bold text-xl text-white">Serna</span>
            </div>
        );
    };

    // Tự động cuộn xuống tin nhắn mới nhất
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        const checkUser = async () => {
            console.log("Checking user session in dashboard...");

            try {
                if (!isAuthenticated()) {
                    console.log("No auth token found, redirecting to signin...");
                    router.push("/signin");
                    return;
                }

                try {
                    const { profile } = await userAPI.getProfile();
                    console.log("User profile loaded successfully");

                    if (profile) {
                        setUser({
                            id: profile.id,
                            email: profile.email,
                            full_name: profile.full_name,
                            avatar_url: profile.avatar_url,
                        });
                    }

                    setLoading(false);
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                    localStorage.removeItem("auth_token");
                    router.push("/signin");
                }
            } catch (error) {
                console.error("Exception in checkUser:", error);
                setLoading(false);
                router.push("/signin");
            }
        };

        checkUser();
    }, [router]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background relative text-white flex flex-col">
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

            {/* Navigation bar */}
            <nav className="relative z-50 w-full px-4 py-3 flex items-center justify-between">
                <div className="flex items-center">
                    <Logo />
                </div>
                <div className="flex items-center gap-4">
                    <UserProfileDropdown user={user} />
                </div>
            </nav>

            {/* AI Chat interface */}
            <div className="flex-1 flex flex-col relative z-10">
                <ProfessionalChat messages={messages} setMessages={setMessages} />
            </div>
        </div>
    );
}