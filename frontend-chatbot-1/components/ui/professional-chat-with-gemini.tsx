"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
    ArrowUpIcon,
    Paperclip,
    PlusIcon,
    Send,
    Trash2,
    MessageSquarePlus,
    Edit,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { chatAPI } from "@/lib/api";
import ReactMarkdown from "react-markdown";

// Định nghĩa interface cho tin nhắn từ chat-service
interface Message {
    id: string;
    chat_id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
}

// Định nghĩa interface cho cuộc trò chuyện từ chat-service
interface Chat {
    id: string;
    user_id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

interface ProfessionalChatProps {
    user: any;
}

function useAutoResizeTextarea({
    minHeight,
    maxHeight,
}: {
    minHeight: number;
    maxHeight?: number;
}) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(
        (reset?: boolean) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            if (reset) {
                textarea.style.height = `${minHeight}px`;
                return;
            }

            // Temporarily shrink to get the right scrollHeight
            textarea.style.height = `${minHeight}px`;

            // Calculate new height
            const newHeight = Math.max(
                minHeight,
                Math.min(
                    textarea.scrollHeight,
                    maxHeight ?? Number.POSITIVE_INFINITY
                )
            );

            textarea.style.height = `${newHeight}px`;
        },
        [minHeight, maxHeight]
    );

    useEffect(() => {
        // Set initial height
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = `${minHeight}px`;
        }
    }, [minHeight]);

    // Adjust height on window resize
    useEffect(() => {
        const handleResize = () => adjustHeight();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [adjustHeight]);

    return { textareaRef, adjustHeight };
}

export function ProfessionalChatWithGemini({ user }: ProfessionalChatProps) {
    const [value, setValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [hasSentMessage, setHasSentMessage] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [chats, setChats] = useState<Chat[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [isLoadingChats, setIsLoadingChats] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 60,
        maxHeight: 200,
    });

    // Tải danh sách cuộc trò chuyện khi component được mount
    useEffect(() => {
        const loadChats = async () => {
            if (!user) return;

            try {
                setIsLoadingChats(true);
                const response = await chatAPI.getChats();
                setChats(response.chats || []);

                // Nếu có cuộc trò chuyện, chọn cuộc trò chuyện đầu tiên
                if (response.chats && response.chats.length > 0) {
                    setCurrentChatId(response.chats[0].id);
                    await loadMessages(response.chats[0].id);
                    setHasSentMessage(true);
                }
            } catch (error) {
                console.error("Error loading chats:", error);
                setError("Failed to load chats. Please try again.");
            } finally {
                setIsLoadingChats(false);
            }
        };

        loadChats();
    }, [user]);

    // Tải tin nhắn của cuộc trò chuyện hiện tại
    const loadMessages = async (chatId: string) => {
        try {
            setIsLoadingMessages(true);
            const response = await chatAPI.getChatById(chatId);
            setMessages(response.messages || []);
        } catch (error) {
            console.error("Error loading messages:", error);
            setError("Failed to load messages. Please try again.");
        } finally {
            setIsLoadingMessages(false);
        }
    };

    // Tạo cuộc trò chuyện mới
    const createNewChat = async () => {
        try {
            setIsLoadingChats(true);
            const response = await chatAPI.createChat("New Chat");

            // Thêm cuộc trò chuyện mới vào danh sách
            setChats(prevChats => [response.chat, ...prevChats]);

            // Chọn cuộc trò chuyện mới
            setCurrentChatId(response.chat.id);
            setMessages([]);
            setValue("");
            adjustHeight(true);
        } catch (error) {
            console.error("Error creating new chat:", error);
            setError("Failed to create new chat. Please try again.");
        } finally {
            setIsLoadingChats(false);
        }
    };

    // Xóa cuộc trò chuyện
    const deleteChat = async (chatId: string) => {
        try {
            await chatAPI.deleteChat(chatId);

            // Xóa cuộc trò chuyện khỏi danh sách
            setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));

            // Nếu xóa cuộc trò chuyện hiện tại, chọn cuộc trò chuyện khác
            if (currentChatId === chatId) {
                const remainingChats = chats.filter(chat => chat.id !== chatId);
                if (remainingChats.length > 0) {
                    setCurrentChatId(remainingChats[0].id);
                    await loadMessages(remainingChats[0].id);
                } else {
                    setCurrentChatId(null);
                    setMessages([]);
                    setHasSentMessage(false);
                }
            }
        } catch (error) {
            console.error("Error deleting chat:", error);
            setError("Failed to delete chat. Please try again.");
        }
    };

    // Cập nhật tiêu đề cuộc trò chuyện
    const updateChatTitle = async (chatId: string, title: string) => {
        try {
            const response = await chatAPI.updateChatTitle(chatId, title);

            // Cập nhật tiêu đề trong danh sách
            setChats(prevChats =>
                prevChats.map(chat =>
                    chat.id === chatId ? response.chat : chat
                )
            );
        } catch (error) {
            console.error("Error updating chat title:", error);
            setError("Failed to update chat title. Please try again.");
        }
    };

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Gửi tin nhắn và nhận phản hồi từ Gemini
    const handleSendMessage = async () => {
        if (!value.trim()) return;

        // Thêm log để debug
        console.log("Sending message with auth token:", localStorage.getItem('auth_token')?.substring(0, 10) + "...");

        // Nếu chưa có cuộc trò chuyện nào, tạo cuộc trò chuyện mới
        if (!currentChatId) {
            try {
                console.log("Creating new chat...");
                const response = await chatAPI.createChat("New Chat");
                console.log("New chat created:", response.chat.id);
                setCurrentChatId(response.chat.id);
                setChats(prevChats => [response.chat, ...prevChats]);

                // Gửi tin nhắn trong cuộc trò chuyện mới
                await sendMessageToChat(response.chat.id, value);
            } catch (error) {
                console.error("Error creating new chat:", error);
                setError("Failed to create new chat. Please try again.");
                return;
            }
        } else {
            // Gửi tin nhắn trong cuộc trò chuyện hiện tại
            console.log("Sending message to existing chat:", currentChatId);
            await sendMessageToChat(currentChatId, value);
        }

        setValue("");
        adjustHeight(true);

        // Set hasSentMessage to true when first message is sent
        if (!hasSentMessage) {
            setHasSentMessage(true);
        }
    };

    // Hàm gửi tin nhắn đến chat-service
    const sendMessageToChat = async (chatId: string, content: string) => {
        try {
            console.log("Starting to send message to chat ID:", chatId);
            setIsTyping(true);

            // Gọi API để gửi tin nhắn và nhận phản hồi
            console.log("Calling chatAPI.sendMessage...");
            const response = await chatAPI.sendMessage(chatId, content);
            console.log("Message sent successfully, received response:", response.userMessage.id);

            // Cập nhật danh sách tin nhắn
            setMessages(prevMessages => [
                ...prevMessages,
                response.userMessage,
                response.assistantMessage
            ]);

            // Cập nhật thời gian cập nhật của cuộc trò chuyện
            setChats(prevChats =>
                prevChats.map(chat =>
                    chat.id === chatId
                        ? { ...chat, updated_at: new Date().toISOString() }
                        : chat
                )
            );
            console.log("Chat and messages state updated");
        } catch (error) {
            console.error("Error sending message:", error);
            // Hiển thị thông tin chi tiết hơn về lỗi
            if (error instanceof Error) {
                console.error("Error details:", error.message);
                setError(`Failed to send message: ${error.message}`);
            } else {
                setError("Failed to send message. Please try again.");
            }
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (value.trim()) {
                handleSendMessage();
            }
        }
    };

    // Format timestamp
    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Render danh sách cuộc trò chuyện
    const renderChatList = () => {
        return (
            <div className="w-56 h-full bg-zinc-900/80 border-r border-white/10 overflow-y-auto">
                <div className="p-4">
                    <button
                        onClick={createNewChat}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <MessageSquarePlus size={16} />
                        <span>New Chat</span>
                    </button>
                </div>
                <div className="px-2">
                    {chats.map(chat => (
                        <div
                            key={chat.id}
                            className={cn(
                                "p-2 rounded-lg mb-1 cursor-pointer hover:bg-white/10 transition-colors flex items-center justify-between",
                                currentChatId === chat.id ? "bg-white/10" : ""
                            )}
                            onClick={() => {
                                setCurrentChatId(chat.id);
                                loadMessages(chat.id);
                            }}
                        >
                            <div className="truncate flex-1">{chat.title}</div>
                            <div className="flex items-center">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const newTitle = prompt("Enter new title:", chat.title);
                                        if (newTitle) {
                                            updateChatTitle(chat.id, newTitle);
                                        }
                                    }}
                                    className="p-1 text-white/50 hover:text-white transition-colors"
                                >
                                    <Edit size={14} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm("Are you sure you want to delete this chat?")) {
                                            deleteChat(chat.id);
                                        }
                                    }}
                                    className="p-1 text-white/50 hover:text-white transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col w-full h-[calc(100vh-70px)] overflow-hidden">
            {!hasSentMessage ? (
                // Initial centered state with welcome message
                <motion.div
                    className="flex flex-col items-center justify-center flex-1 w-full max-w-2xl mx-auto"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.h1
                        className="text-4xl font-bold text-center text-white mb-8"
                    >
                        What can I help you with?
                    </motion.h1>

                    {/* Chat input centered */}
                    <div className="w-full px-4 max-w-2xl mx-auto">
                        <motion.div
                            className="relative backdrop-blur-md bg-zinc-800/60 rounded-xl border border-white/10"
                            initial={{ backgroundColor: "rgba(39, 39, 42, 0.6)" }}
                            animate={{ backgroundColor: "rgba(39, 39, 42, 0.6)" }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="overflow-y-auto">
                                <Textarea
                                    ref={textareaRef}
                                    value={value}
                                    onChange={(e) => {
                                        setValue(e.target.value);
                                        adjustHeight();
                                    }}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask a question..."
                                    className={cn(
                                        "w-full px-4 py-3",
                                        "resize-none",
                                        "bg-transparent",
                                        "border-none",
                                        "text-white text-sm",
                                        "focus:outline-none",
                                        "focus-visible:ring-0 focus-visible:ring-offset-0",
                                        "placeholder:text-neutral-500 placeholder:text-sm",
                                        "min-h-[60px]"
                                    )}
                                    style={{
                                        overflow: "hidden",
                                    }}
                                />
                            </div>

                            <div className="flex items-center justify-between p-3">
                                <div className="flex items-center gap-2">
                                    <motion.button
                                        type="button"
                                        className="group p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <Paperclip className="w-4 h-4 text-white" />
                                        <span className="text-xs text-zinc-400 hidden group-hover:inline transition-opacity">
                                            Attach
                                        </span>
                                    </motion.button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <motion.button
                                        type="button"
                                        onClick={handleSendMessage}
                                        className={cn(
                                            "px-1.5 py-1.5 rounded-lg text-sm transition-colors border border-white/10 hover:border-white/20 flex items-center justify-between gap-1",
                                            value.trim()
                                                ? "bg-white text-black"
                                                : "text-zinc-400 hover:bg-white/5"
                                        )}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <ArrowUpIcon
                                            className={cn(
                                                "w-4 h-4",
                                                value.trim()
                                                    ? "text-black"
                                                    : "text-zinc-400"
                                            )}
                                        />
                                        <span className="sr-only">Send</span>
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            ) : (
                // Chat mode with history and fixed input at bottom
                <div className="flex h-full">
                    {/* Chat list sidebar */}
                    {renderChatList()}

                    {/* Chat content */}
                    <div className="flex-1 flex flex-col relative">
                        <motion.div
                            className="flex flex-col h-full w-full"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            {/* Chat history - scrollable area with fixed height */}
                            <div className="h-[calc(100vh-220px)] overflow-y-auto px-4 py-4 pb-20 scrollbar-none max-w-5xl mx-auto">
                                {isLoadingMessages ? (
                                    <div className="flex justify-center items-center h-full">
                                        <div className="flex space-x-2">
                                            <div className="w-3 h-3 rounded-full bg-white/80 animate-bounce-delay-0"></div>
                                            <div className="w-3 h-3 rounded-full bg-white/80 animate-bounce-delay-1"></div>
                                            <div className="w-3 h-3 rounded-full bg-white/80 animate-bounce-delay-2"></div>
                                        </div>
                                    </div>
                                ) : (
                                    <AnimatePresence mode="popLayout">
                                        {messages.map((message, index) => (
                                            <motion.div
                                                key={message.id}
                                                className={cn(
                                                    "flex mb-6",
                                                    message.role === "user" ? "justify-end" : "justify-start"
                                                )}
                                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{
                                                    duration: 0.4,
                                                    delay: index * 0.05,
                                                    type: "spring",
                                                    stiffness: 100,
                                                    damping: 15
                                                }}
                                            >
                                                <div
                                                    className={cn(
                                                        "flex items-start gap-3 max-w-[85%]",
                                                        message.role === "user" ? "flex-row-reverse" : "flex-row"
                                                    )}
                                                >
                                                    <motion.div
                                                        className={cn(
                                                            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium",
                                                            message.role === "user"
                                                                ? "bg-zinc-800/70 text-white/90"
                                                                : "bg-zinc-800/70 text-white/90"
                                                        )}
                                                        initial={{
                                                            scale: 0.8,
                                                            opacity: 0,
                                                            backgroundColor: "rgba(39, 39, 42, 0.7)"
                                                        }}
                                                        animate={{
                                                            scale: 1,
                                                            opacity: 1,
                                                            backgroundColor: "rgba(39, 39, 42, 0.7)"
                                                        }}
                                                        transition={{
                                                            delay: index * 0.05 + 0.1,
                                                            duration: 0.3,
                                                            type: "spring"
                                                        }}
                                                    >
                                                        {message.role === "user" ? "U" : "A"}
                                                    </motion.div>
                                                    <div>
                                                        <motion.div
                                                            className={cn(
                                                                "rounded-lg p-4 text-base",
                                                                message.role === "user"
                                                                    ? "bg-zinc-800/70 text-white"
                                                                    : "bg-zinc-800/70 text-white"
                                                            )}
                                                            initial={{
                                                                opacity: 0,
                                                                x: message.role === "user" ? 10 : -10,
                                                                backgroundColor: "rgba(39, 39, 42, 0.7)"
                                                            }}
                                                            animate={{
                                                                opacity: 1,
                                                                x: 0,
                                                                backgroundColor: "rgba(39, 39, 42, 0.7)"
                                                            }}
                                                            transition={{
                                                                delay: index * 0.05 + 0.05,
                                                                duration: 0.3,
                                                                type: "spring"
                                                            }}
                                                        >
                                                            <div className="markdown-content">
                                                                <ReactMarkdown>
                                                                    {message.content}
                                                                </ReactMarkdown>
                                                            </div>
                                                        </motion.div>
                                                        <motion.span
                                                            className="text-sm text-white/60 mt-1 block"
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            transition={{ delay: index * 0.05 + 0.2, duration: 0.3 }}
                                                        >
                                                            {formatTimestamp(message.created_at)}
                                                        </motion.span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                )}

                                {/* Typing indicator */}
                                <AnimatePresence>
                                    {isTyping && (
                                        <motion.div
                                            initial={{
                                                opacity: 0,
                                                y: 10,
                                                backgroundColor: "rgba(39, 39, 42, 0.7)"
                                            }}
                                            animate={{
                                                opacity: 1,
                                                y: 0,
                                                backgroundColor: "rgba(39, 39, 42, 0.7)"
                                            }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.4, type: "spring" }}
                                            className="flex items-center gap-2 text-sm text-white/80 mb-2 bg-zinc-800/70 p-2 rounded-lg w-fit"
                                        >
                                            <div className="flex space-x-1">
                                                <div className="w-2 h-2 rounded-full bg-white/80 animate-bounce-delay-0"></div>
                                                <div className="w-2 h-2 rounded-full bg-white/80 animate-bounce-delay-1"></div>
                                                <div className="w-2 h-2 rounded-full bg-white/80 animate-bounce-delay-2"></div>
                                            </div>
                                            <span>Bot is typing...</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Error message */}
                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.4 }}
                                            className="bg-red-500/20 border border-red-500/50 text-white p-3 rounded-lg mb-4"
                                        >
                                            {error}
                                            <button
                                                className="ml-2 underline"
                                                onClick={() => setError(null)}
                                            >
                                                Dismiss
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div ref={messagesEndRef} />
                            </div>
                        </motion.div>

                        {/* Fixed chat input at bottom - absolutely positioned */}
                        <motion.div
                            className="fixed bottom-0 left-56 right-0 z-10 pb-6"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{
                                duration: 0.5,
                                type: "spring",
                                stiffness: 100,
                                damping: 15
                            }}
                        >
                            <div className="max-w-4xl mx-auto px-4 py-4 bg-transparent">
                                <motion.div
                                    className="relative backdrop-blur-md bg-zinc-800/60 rounded-xl border border-white/10"
                                    initial={{ backgroundColor: "rgba(39, 39, 42, 0.6)" }}
                                    whileHover={{ boxShadow: "0 0 15px rgba(255, 255, 255, 0.1)" }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="overflow-y-auto">
                                        <Textarea
                                            ref={textareaRef}
                                            value={value}
                                            onChange={(e) => {
                                                setValue(e.target.value);
                                                adjustHeight();
                                            }}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Ask a question..."
                                            className={cn(
                                                "w-full px-4 py-3",
                                                "resize-none",
                                                "bg-transparent",
                                                "border-none",
                                                "text-white text-sm",
                                                "focus:outline-none",
                                                "focus-visible:ring-0 focus-visible:ring-offset-0",
                                                "placeholder:text-neutral-500 placeholder:text-sm",
                                                "min-h-[60px]",
                                                "transition-all duration-200"
                                            )}
                                            style={{
                                                overflow: "hidden",
                                            }}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-3">
                                        <div className="flex items-center gap-2">
                                            <motion.button
                                                type="button"
                                                className="group p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <Paperclip className="w-4 h-4 text-white" />
                                                <span className="text-xs text-zinc-400 hidden group-hover:inline transition-opacity">
                                                    Attach
                                                </span>
                                            </motion.button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <motion.button
                                                type="button"
                                                onClick={createNewChat}
                                                className="px-2 py-1 rounded-lg text-sm text-zinc-400 transition-colors border border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 flex items-center justify-between gap-1"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <PlusIcon className="w-4 h-4" />
                                                New Chat
                                            </motion.button>
                                            <motion.button
                                                type="button"
                                                onClick={handleSendMessage}
                                                className={cn(
                                                    "px-1.5 py-1.5 rounded-lg text-sm transition-colors border border-white/10 hover:border-white/20 flex items-center justify-between gap-1",
                                                    value.trim()
                                                        ? "bg-white text-black"
                                                        : "text-zinc-400 hover:bg-white/5"
                                                )}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <ArrowUpIcon
                                                    className={cn(
                                                        "w-4 h-4",
                                                        value.trim()
                                                            ? "text-black"
                                                            : "text-zinc-400"
                                                    )}
                                                />
                                                <span className="sr-only">Send</span>
                                            </motion.button>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            )}
        </div>
    );
}
