"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
    ArrowUpIcon,
    Paperclip,
    PlusIcon,
    Send,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
    id: number;
    content: string;
    sender: "user" | "bot";
    timestamp: string;
}

interface ProfessionalChatProps {
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
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

export function ProfessionalChat({ messages, setMessages }: ProfessionalChatProps) {
    const [value, setValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [hasSentMessage, setHasSentMessage] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 60,
        maxHeight: 200,
    });

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = () => {
        if (!value.trim()) return;

        // Add user message
        const userMessage: Message = {
            id: Date.now(),
            content: value,
            sender: "user",
            timestamp: new Date().toLocaleTimeString(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setValue("");
        adjustHeight(true);

        // Set hasSentMessage to true when first message is sent
        if (!hasSentMessage) {
            setHasSentMessage(true);
        }

        // Simulate bot typing
        setIsTyping(true);

        // Simulate bot response after 1-2 seconds
        setTimeout(() => {
            const botMessage: Message = {
                id: Date.now() + 1,
                content: `This is a response to your message: "${value}"`,
                sender: "bot",
                timestamp: new Date().toLocaleTimeString(),
            };
            setMessages((prev) => [...prev, botMessage]);
            setIsTyping(false);
        }, 1000 + Math.random() * 1000);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (value.trim()) {
                handleSendMessage();
            }
        }
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
                    <div className="w-full px-4">
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
                                        className="px-2 py-1 rounded-lg text-sm text-zinc-400 transition-colors border border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 flex items-center justify-between gap-1"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        Call me
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
            ) : (
                <>
                    {/* Chat mode with history and fixed input at bottom */}
                    <motion.div
                        className="flex flex-col h-full w-full max-w-4xl mx-auto pb-24"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Chat history - scrollable area with fixed height */}
                        <div className="h-[calc(100vh-220px)] overflow-y-auto px-4 py-4 pb-20 scrollbar-none">
                            <AnimatePresence mode="popLayout">
                                {messages.map((message, index) => (
                                    <motion.div
                                        key={message.id}
                                        className={cn(
                                            "flex mb-6",
                                            message.sender === "user" ? "justify-end" : "justify-start"
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
                                                "flex items-start gap-3 max-w-[75%]",
                                                message.sender === "user" ? "flex-row-reverse" : "flex-row"
                                            )}
                                        >
                                            <motion.div
                                                className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium",
                                                    message.sender === "user"
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
                                                {message.sender === "user" ? "U" : "A"}
                                            </motion.div>
                                            <div>
                                                <motion.div
                                                    className={cn(
                                                        "rounded-lg p-4 text-base",
                                                        message.sender === "user"
                                                            ? "bg-zinc-800/70 text-white"
                                                            : "bg-zinc-800/70 text-white"
                                                    )}
                                                    initial={{
                                                        opacity: 0,
                                                        x: message.sender === "user" ? 10 : -10,
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
                                                    {message.content}
                                                </motion.div>
                                                <motion.span
                                                    className="text-sm text-white/60 mt-1 block"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: index * 0.05 + 0.2, duration: 0.3 }}
                                                >
                                                    {message.timestamp}
                                                </motion.span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

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

                            <div ref={messagesEndRef} />
                        </div>
                    </motion.div>

                    {/* Fixed chat input at bottom - absolutely positioned */}
                    <motion.div
                        className="fixed bottom-0 left-0 right-0 w-full z-10 pb-6"
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
                                            className="px-2 py-1 rounded-lg text-sm text-zinc-400 transition-colors border border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 flex items-center justify-between gap-1"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                            Call me
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
                </>
            )}
        </div>
    );
}
