"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
    ArrowUpIcon,
    Paperclip,
    PlusIcon,
    Trash2,
    MessageSquarePlus,
    Edit,
    ChevronLeft,
    ChevronRight,
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
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [selectedChatTitle, setSelectedChatTitle] = useState<string>("");
    const [newChatTitle, setNewChatTitle] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);

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

    // Mở modal đổi tên
    const openRenameModal = (chatId: string, currentTitle: string) => {
        setSelectedChatId(chatId);
        setSelectedChatTitle(currentTitle);
        setNewChatTitle(currentTitle);
        setIsRenameModalOpen(true);
    };

    // Đóng modal đổi tên
    const closeRenameModal = () => {
        setIsRenameModalOpen(false);
        setSelectedChatId(null);
        setSelectedChatTitle("");
        setNewChatTitle("");
    };

    // Xử lý đổi tên
    const handleRename = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedChatId || !newChatTitle.trim()) return;

        setIsProcessing(true);

        try {
            const response = await chatAPI.updateChatTitle(selectedChatId, newChatTitle);

            // Cập nhật tiêu đề trong danh sách
            setChats(prevChats =>
                prevChats.map(chat =>
                    chat.id === selectedChatId ? response.chat : chat
                )
            );

            closeRenameModal();
        } catch (error) {
            console.error("Error updating chat title:", error);
            setError("Failed to update chat title. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    // Mở modal xóa
    const openDeleteModal = (chatId: string, title: string) => {
        setSelectedChatId(chatId);
        setSelectedChatTitle(title);
        setIsDeleteModalOpen(true);
    };

    // Đóng modal xóa
    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setSelectedChatId(null);
        setSelectedChatTitle("");
    };

    // Xử lý xóa chat
    const handleDelete = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedChatId) return;

        setIsProcessing(true);

        try {
            await deleteChat(selectedChatId);
            closeDeleteModal();
        } catch (error) {
            console.error("Error deleting chat:", error);
            setError("Failed to delete chat. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    // Hàm updateChatTitle đã được thay thế bằng handleRename

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Gửi tin nhắn và nhận phản hồi từ Gemini
    const handleSendMessage = async () => {
        if (!value.trim()) return;

        // Lưu nội dung tin nhắn và xóa input
        const messageContent = value.trim();
        setValue("");
        adjustHeight(true);

        // Set hasSentMessage to true when first message is sent
        if (!hasSentMessage) {
            setHasSentMessage(true);
        }

        // Tạo ID tạm thời cho tin nhắn người dùng
        const tempUserId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        // Tạo tin nhắn tạm thời của người dùng để hiển thị ngay lập tức
        const tempUserMessage: Message = {
            id: tempUserId,
            chat_id: currentChatId || 'temp-chat',
            role: 'user',
            content: messageContent,
            created_at: new Date().toISOString()
        };

        // Thêm tin nhắn người dùng vào state ngay lập tức
        setMessages(prevMessages => [...prevMessages, tempUserMessage]);

        // Scroll xuống dưới để hiển thị tin nhắn mới
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);

        // Nếu chưa có cuộc trò chuyện nào, tạo cuộc trò chuyện mới
        if (!currentChatId) {
            try {
                console.log("Creating new chat...");
                const response = await chatAPI.createChat("New Chat");
                console.log("New chat created:", response.chat.id);
                setCurrentChatId(response.chat.id);
                setChats(prevChats => [response.chat, ...prevChats]);

                // Gửi tin nhắn trong cuộc trò chuyện mới
                await sendMessageToChat(response.chat.id, messageContent, tempUserId);
            } catch (error) {
                console.error("Error creating new chat:", error);
                setError("Failed to create new chat. Please try again.");

                // Đánh dấu tin nhắn tạm thời là lỗi
                setMessages(prevMessages =>
                    prevMessages.map(msg =>
                        msg.id === tempUserId
                            ? { ...msg, content: msg.content + " (Failed to send)" }
                            : msg
                    )
                );
                return;
            }
        } else {
            // Gửi tin nhắn trong cuộc trò chuyện hiện tại
            console.log("Sending message to existing chat:", currentChatId);
            await sendMessageToChat(currentChatId, messageContent, tempUserId);
        }
    };

    // Hàm gửi tin nhắn đến chat-service
    const sendMessageToChat = async (chatId: string, content: string, tempMessageId?: string, retryCount = 0) => {
        try {
            console.log("Starting to send message to chat ID:", chatId);
            setIsTyping(true);

            // Gọi API để gửi tin nhắn và nhận phản hồi
            console.log("Calling chatAPI.sendMessage...");
            const response = await chatAPI.sendMessage(chatId, content);
            console.log("Message sent successfully, received response:", response);

            // Kiểm tra cấu trúc phản hồi
            console.log("Response structure:", JSON.stringify(response));

            if (!response || typeof response !== 'object') {
                console.error("Invalid response format:", response);

                // Thử lại nếu chưa vượt quá số lần thử lại tối đa
                if (retryCount < 2) {
                    console.log(`Retrying (${retryCount + 1}/2)...`);
                    return await sendMessageToChat(chatId, content, tempMessageId, retryCount + 1);
                }

                throw new Error("Invalid response format: not an object");
            }

            if (!response.assistantMessage) {
                console.error("Missing assistantMessage in response:", response);

                // Thử lại nếu chưa vượt quá số lần thử lại tối đa
                if (retryCount < 2) {
                    console.log(`Retrying (${retryCount + 1}/2)...`);
                    return await sendMessageToChat(chatId, content, tempMessageId, retryCount + 1);
                }

                throw new Error("Invalid response format: missing assistantMessage");
            }

            if (!response.userMessage) {
                console.error("Missing userMessage in response:", response);

                // Thử lại nếu chưa vượt quá số lần thử lại tối đa
                if (retryCount < 2) {
                    console.log(`Retrying (${retryCount + 1}/2)...`);
                    return await sendMessageToChat(chatId, content, tempMessageId, retryCount + 1);
                }

                throw new Error("Invalid response format: missing userMessage");
            }

            // Cập nhật danh sách tin nhắn
            setMessages(prevMessages => {
                try {
                    // Kiểm tra lại một lần nữa để đảm bảo response có cấu trúc đúng
                    if (!response.assistantMessage || !response.assistantMessage.id || !response.assistantMessage.content) {
                        console.error("Invalid assistantMessage structure:", response.assistantMessage);
                        throw new Error("Invalid assistantMessage structure");
                    }

                    // Nếu có tempMessageId, giữ nguyên tin nhắn người dùng đã hiển thị và chỉ thêm tin nhắn AI
                    if (tempMessageId) {
                        console.log("Adding AI message to existing user message. AI message ID:", response.assistantMessage.id);
                        // Chỉ thêm tin nhắn AI vào danh sách, giữ nguyên tin nhắn người dùng đã hiển thị
                        return [...prevMessages, response.assistantMessage];
                    } else {
                        console.log("Adding both user and AI messages. User ID:", response.userMessage.id, "AI ID:", response.assistantMessage.id);
                        // Nếu không có tempMessageId, thêm cả tin nhắn người dùng và phản hồi
                        return [...prevMessages, response.userMessage, response.assistantMessage];
                    }
                } catch (error) {
                    console.error("Error updating messages:", error);
                    // Trong trường hợp lỗi, giữ nguyên danh sách tin nhắn hiện tại
                    setError("Error displaying AI response. Please try again.");
                    return prevMessages;
                }
            });

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

            // Nếu có tempMessageId, đánh dấu tin nhắn tạm thời là lỗi
            if (tempMessageId) {
                setMessages(prevMessages => {
                    try {
                        // Tìm tin nhắn tạm thời
                        const tempMessage = prevMessages.find(msg => msg.id === tempMessageId);

                        if (!tempMessage) {
                            console.error("Could not find temporary message with ID:", tempMessageId);
                            return prevMessages;
                        }

                        // Thêm thông báo lỗi vào tin nhắn
                        return prevMessages.map(msg =>
                            msg.id === tempMessageId
                                ? { ...msg, content: msg.content + " (Failed to send)" }
                                : msg
                        );
                    } catch (updateError) {
                        console.error("Error updating message with error status:", updateError);
                        return prevMessages;
                    }
                });
            }

            // Hiển thị thông tin chi tiết hơn về lỗi
            if (error instanceof Error) {
                console.error("Error details:", error.message);

                // Hiển thị thông báo lỗi thân thiện với người dùng
                if (error.message.includes("Invalid response format") ||
                    error.message.includes("assistantMessage") ||
                    error.message.includes("userMessage")) {
                    setError("Could not get response from AI. Please try again.");
                } else if (error.message.includes("network") || error.message.includes("timeout")) {
                    setError("Network error. Please check your connection and try again.");
                } else {
                    setError(`Failed to send message: ${error.message}`);
                }
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
            <motion.div
                className="h-full overflow-hidden flex flex-col"
                initial={{ width: 280 }}
                animate={{
                    width: isSidebarVisible ? 280 : 0,
                    opacity: isSidebarVisible ? 1 : 0
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
            >
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="font-medium text-white/90">Chat history</h2>
                    <motion.button
                        onClick={() => setIsSidebarVisible(false)}
                        className="p-1.5 rounded-md hover:bg-white/10 text-white/70 hover:text-white/90 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <ChevronLeft size={18} />
                    </motion.button>
                </div>
                <div className="p-3">
                    <motion.button
                        onClick={createNewChat}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <MessageSquarePlus size={16} />
                        <span className="font-medium">New chat</span>
                    </motion.button>
                </div>
                <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin scrollbar-thumb-transparent scrollbar-track-transparent">
                    {isLoadingChats ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="flex space-x-2">
                                <div className="w-2 h-2 rounded-full bg-white/80 animate-bounce-delay-0"></div>
                                <div className="w-2 h-2 rounded-full bg-white/80 animate-bounce-delay-1"></div>
                                <div className="w-2 h-2 rounded-full bg-white/80 animate-bounce-delay-2"></div>
                            </div>
                        </div>
                    ) : chats.length === 0 ? (
                        <div className="text-center py-6 text-white/50 text-sm">
                            No thing
                        </div>
                    ) : (
                        chats.map(chat => (
                            <motion.div
                                key={chat.id}
                                className={cn(
                                    "p-3 rounded-lg mb-2 cursor-pointer hover:bg-white/10 transition-colors flex items-center justify-between",
                                    currentChatId === chat.id ? "bg-white/10 border-l-2 border-blue-500" : ""
                                )}
                                onClick={() => {
                                    setCurrentChatId(chat.id);
                                    loadMessages(chat.id);
                                }}
                                whileHover={{ x: 2 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="truncate flex-1 font-medium">{chat.title}</div>
                                <div className="flex items-center gap-1">
                                    <motion.button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openRenameModal(chat.id, chat.title);
                                        }}
                                        className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <Edit size={14} />
                                    </motion.button>
                                    <motion.button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openDeleteModal(chat.id, chat.title);
                                        }}
                                        className="p-1.5 rounded-md text-white/50 hover:text-red-400 hover:bg-white/10 transition-colors"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <Trash2 size={14} />
                                    </motion.button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </motion.div>
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
                    {/* Chat list sidebar - fixed position */}
                    <div className="fixed top-[70px] left-0 h-[calc(100vh-70px)] z-10">
                        {renderChatList()}
                    </div>

                    {/* Nút hiện sidebar khi đã ẩn */}
                    {!isSidebarVisible && (
                        <motion.button
                            onClick={() => setIsSidebarVisible(true)}
                            className="fixed left-6 top-20 z-20 p-2 rounded-md bg-zinc-800/90 hover:bg-zinc-700/90 text-white/70 hover:text-white/90 transition-colors shadow-md"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <ChevronRight size={18} />
                        </motion.button>
                    )}

                    {/* Chat content - full width */}
                    <div className="w-full flex flex-col relative">
                        <div className="w-full max-w-4xl mx-auto px-4">
                            <motion.div
                                className="flex flex-col h-full w-full"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5 }}
                            >
                            {/* Chat history - scrollable area with fixed height */}
                            <motion.div
                                className="h-[calc(100vh-220px)] overflow-y-auto py-4 pb-20 w-full hide-scrollbar"
                                style={{
                                    maxWidth: "4xl",
                                    marginLeft: "auto",
                                    marginRight: "auto",
                                    paddingLeft: "1rem",
                                    paddingRight: "1rem"
                                }}
                                transition={{ duration: 0.3 }}
                                layout
                            >
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
                                                className="flex mb-6 w-full"
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
                                                        "flex items-start gap-3 w-full",
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
                                                    <div className="flex flex-col" style={{ maxWidth: "70%", minWidth: "200px", width: "auto" }}>
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
                            </motion.div>
                        </motion.div>

                        {/* Fixed chat input at bottom */}
                            <div className="fixed bottom-0 z-10 pb-6 w-full max-w-4xl" style={{ left: "50%", transform: "translateX(-50%)" }}>
                                <div className="w-full py-4 bg-transparent">
                                <motion.div
                                    className="relative backdrop-blur-md bg-zinc-800/60 rounded-xl border border-white/10"
                                    initial={{ backgroundColor: "rgba(39, 39, 42, 0.6)" }}
                                    whileHover={{ boxShadow: "0 0 15px rgba(255, 255, 255, 0.1)" }}
                                    transition={{ duration: 0.3 }}
                                    layout
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
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Rename Modal */}
            {isRenameModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <motion.div
                        className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl w-full max-w-md p-6"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <h2 className="text-xl font-semibold text-white mb-4">Rename Chat</h2>
                        <form onSubmit={handleRename}>
                            <div className="mb-4">
                                <label htmlFor="chatTitle" className="block text-sm font-medium text-white/70 mb-1">
                                    Chat Title
                                </label>
                                <input
                                    type="text"
                                    id="chatTitle"
                                    value={newChatTitle}
                                    onChange={(e) => setNewChatTitle(e.target.value)}
                                    className="w-full px-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter new title"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={closeRenameModal}
                                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isProcessing}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
                                            Processing...
                                        </>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Delete Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <motion.div
                        className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl w-full max-w-md p-6"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <h2 className="text-xl font-semibold text-white mb-4">Confirm Deletion</h2>
                        <p className="text-white/70 mb-4">
                            Are you sure you want to delete the chat "{selectedChatTitle}"? This action cannot be undone.
                        </p>
                        <form onSubmit={handleDelete}>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={closeDeleteModal}
                                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isProcessing}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
                                            Processing...
                                        </>
                                    ) : (
                                        'Delete Chat'
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
