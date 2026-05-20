"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, ArrowUp, ArrowDown, AlertTriangle, Clock } from "lucide-react"

interface NonNegotiable {
  id: number
  text: string
  done: boolean
}

interface WatchItem {
  id: number
  text: string
  status: "UP" | "DOWN" | "NEEDS ACTION"
}

interface OvernightChange {
  platform: string
  delta: string
  positive: boolean
}

interface MorningBriefProps {
  generatedAt: string
  nonNegotiables: NonNegotiable[]
  watchList: WatchItem[]
  overnight: OvernightChange[]
  onToggleNonNegotiable?: (id: number) => void
}

export function MorningBrief({
  generatedAt,
  nonNegotiables,
  watchList,
  overnight,
  onToggleNonNegotiable,
}: MorningBriefProps) {
  const [items, setItems] = useState(nonNegotiables)

  const handleToggle = (id: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      )
    )
    onToggleNonNegotiable?.(id)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "UP":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      case "DOWN":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "NEEDS ACTION":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30"
      default:
        return "bg-white/10 text-white/60 border-white/20"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "UP":
        return <ArrowUp className="w-3 h-3" />
      case "DOWN":
        return <ArrowDown className="w-3 h-3" />
      case "NEEDS ACTION":
        return <AlertTriangle className="w-3 h-3" />
      default:
        return null
    }
  }

  const today = new Date()
  const dateString = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6 glow-violet"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">
            {"Today's Brief"}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-white/50">{dateString}</span>
            <span className="text-xs text-white/30">•</span>
            <div className="flex items-center gap-1 text-xs text-white/40">
              <Clock className="w-3 h-3" />
              Generated {generatedAt}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/30">
          <div className="w-2 h-2 rounded-full bg-[#7C3AED] animate-pulse-glow" />
          <span className="text-xs font-medium text-[#7C3AED]">INTEL</span>
        </div>
      </div>

      {/* Three columns */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Non-Negotiables */}
        <div>
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4">
            Your 3 Non-Negotiables Today
          </h3>
          <div className="space-y-3">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 group"
              >
                <button
                  onClick={() => handleToggle(item.id)}
                  className={`relative w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                    item.done
                      ? "bg-[#7C3AED] border-[#7C3AED]"
                      : "border-white/30 hover:border-[#7C3AED]/50"
                  }`}
                >
                  <AnimatePresence>
                    {item.done && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <Check className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {item.done && (
                    <motion.div
                      initial={{ scale: 0, opacity: 1 }}
                      animate={{ scale: 2, opacity: 0 }}
                      className="absolute inset-0 rounded-md bg-[#7C3AED]"
                    />
                  )}
                </button>
                <span
                  className={`text-lg font-semibold flex-1 transition-all ${
                    item.done
                      ? "text-white/40 line-through"
                      : "text-white"
                  }`}
                >
                  <span className="text-[#7C3AED] mr-2">{index + 1}.</span>
                  {item.text}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Watch List */}
        <div>
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4">
            Watch List
          </h3>
          <div className="space-y-3">
            {watchList.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.2 }}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/5"
              >
                <span className="text-sm text-white/80">{item.text}</span>
                <span
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                    item.status
                  )}`}
                >
                  {getStatusIcon(item.status)}
                  {item.status}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Overnight */}
        <div>
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4">
            Overnight
          </h3>
          <div className="space-y-3">
            {overnight.map((item, index) => (
              <motion.div
                key={item.platform}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 + 0.3 }}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-white/60">{item.platform}</span>
                <motion.span
                  className={`text-lg font-bold ${
                    item.positive ? "text-emerald-400" : "text-red-400"
                  }`}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.4, type: "spring" }}
                >
                  {item.delta}
                </motion.span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
