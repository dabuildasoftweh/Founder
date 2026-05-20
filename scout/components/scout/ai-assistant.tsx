"use client"

import { useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send, Sparkles, MessageSquare, Calendar, Target, BarChart3 } from "lucide-react"

interface AIAssistantProps {
  isOpen: boolean
  onClose: () => void
  // Real API props — passed from parent page
  messages: { role: "user" | "assistant"; content: string }[]
  input: string
  setInput: (v: string) => void
  isLoading: boolean
  onSend: () => void
  lastSync?: string
}

const contextChips = [
  { id: "today", label: "Today's data", icon: Calendar },
  { id: "decisions", label: "Recent decisions", icon: Target },
  { id: "goals", label: "Goal progress", icon: Target },
  { id: "metrics", label: "Platform metrics", icon: BarChart3 },
]

const suggestedPrompts = [
  "What should I focus on today?",
  "Why is my revenue down?",
  "Summarise this week",
  "What's my highest leverage move right now?",
  "How far am I from my goal?",
]

export function AIAssistant({
  isOpen,
  onClose,
  messages,
  input,
  setInput,
  isLoading,
  onSend,
  lastSync,
}: AIAssistantProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0D0D24] border-l border-white/10 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-white">SCOUT AI</h2>
                  <div className="flex items-center gap-1">
                    <motion.div
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                    />
                    <span className="text-xs text-white/50">
                      {lastSync ? `Synced ${lastSync}` : "Knows everything about your business"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Context chips */}
            <div className="p-3 border-b border-white/10">
              <div className="flex items-center gap-2 flex-wrap">
                {contextChips.map((chip) => {
                  const Icon = chip.icon
                  return (
                    <div
                      key={chip.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#7C3AED]/20 text-[#7C3AED] border border-[#7C3AED]/30"
                    >
                      <Icon className="w-3 h-3" />
                      {chip.label}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white/5 text-white/90">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                      <span className="text-xs text-white/50">Scout AI</span>
                    </div>
                    <div className="text-sm">
                      Ready. Your data is loaded — ask me anything about your business, goals, or what to do today.
                    </div>
                  </div>
                </motion.div>
              )}

              {messages.map((message, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-[#7C3AED] text-white"
                        : "bg-white/5 text-white/90"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                        <span className="text-xs text-white/50">Scout AI</span>
                      </div>
                    )}
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/5 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-1">
                      {[0, 0.2, 0.4].map((delay) => (
                        <motion.div
                          key={delay}
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay }}
                          className="w-2 h-2 rounded-full bg-white/40"
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested prompts */}
            {messages.length === 0 && (
              <div className="p-3 border-t border-white/10">
                <span className="text-xs text-white/40 mb-2 block">Suggested</span>
                <div className="flex flex-wrap gap-2">
                  {suggestedPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(prompt)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-white/70 hover:text-white hover:bg-white/10 transition-all"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Scout anything..."
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#7C3AED]/50 font-mono text-sm"
                />
                <button
                  onClick={onSend}
                  disabled={!input.trim() || isLoading}
                  className="w-12 h-12 rounded-xl bg-[#7C3AED] flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#7C3AED]/80 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
