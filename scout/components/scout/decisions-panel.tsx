"use client"

import { motion } from "framer-motion"
import { Clock, AlertTriangle, Check, ChevronRight } from "lucide-react"

interface DecisionOption {
  label: string
  pros: string[]
  cons: string[]
  kellyScore: number
  probability: number
}

interface Decision {
  id: number
  title: string
  daysOpen: number
  kellyScore: number
  options: DecisionOption[]
  context?: string
  category?: string
  urgent?: boolean
}

interface DecisionsPanelProps {
  decisions: Decision[]
  onDecide?: (id: number, option: string) => void
}

export function DecisionsPanel({ decisions, onDecide }: DecisionsPanelProps) {
  const getUrgencyColor = (days: number) => {
    if (days >= 7) return "text-red-400 bg-red-500/20 border-red-500/30"
    if (days >= 4) return "text-amber-400 bg-amber-500/20 border-amber-500/30"
    return "text-white/60 bg-white/10 border-white/20"
  }

  const isUrgent = (days: number) => days >= 3

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white uppercase tracking-wider">Decisions Waiting</h3>
        <span className="text-xs text-white/40">{decisions.length} open</span>
      </div>

      <div className="space-y-3">
        {decisions.map((decision, index) => (
          <motion.div
            key={decision.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative p-4 rounded-xl bg-white/5 border border-white/10 ${
              isUrgent(decision.daysOpen) ? "animate-pulse" : ""
            }`}
            style={{
              animationDuration: isUrgent(decision.daysOpen) ? "3s" : "0s",
            }}
          >
            {/* Urgent glow */}
            {isUrgent(decision.daysOpen) && (
              <div className="absolute inset-0 rounded-xl bg-red-500/5 pointer-events-none" />
            )}

            <div className="relative">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <h4 className="font-medium text-white">{decision.title}</h4>
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(
                    decision.daysOpen
                  )}`}
                >
                  {isUrgent(decision.daysOpen) ? (
                    <AlertTriangle className="w-3 h-3" />
                  ) : (
                    <Clock className="w-3 h-3" />
                  )}
                  {decision.daysOpen}d
                </div>
              </div>

              {/* Kelly score */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-white/40">Kelly Score:</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden max-w-20">
                  <motion.div
                    className="h-full rounded-full bg-[#06B6D4]"
                    initial={{ width: 0 }}
                    animate={{ width: `${decision.kellyScore * 100}%` }}
                    transition={{ delay: index * 0.1 + 0.2 }}
                  />
                </div>
                <span className="text-xs font-medium text-[#06B6D4]">
                  {(decision.kellyScore * 100).toFixed(0)}%
                </span>
              </div>

              {/* Options */}
              <div className="flex items-center gap-2 flex-wrap">
                {decision.options.map((option) => (
                  <button
                    key={option.label}
                    onClick={() => onDecide?.(decision.id, option.label)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-[#7C3AED]/20 hover:border-[#7C3AED]/50 hover:text-white transition-all"
                  >
                    {option.label}
                  </button>
                ))}
                <button className="px-3 py-1.5 rounded-lg bg-[#7C3AED]/20 border border-[#7C3AED]/50 text-sm font-medium text-[#7C3AED] hover:bg-[#7C3AED]/30 transition-all flex items-center gap-1">
                  Decide
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
