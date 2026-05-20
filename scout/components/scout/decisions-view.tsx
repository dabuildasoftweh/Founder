"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Zap, Clock, AlertCircle, Check, ChevronRight, Archive, X } from "lucide-react"
import { cn } from "@/lib/utils"

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
  context: string
  category: string
  urgent?: boolean
}

interface ArchivedDecision {
  id: number
  title: string
  decidedOn: string
  option: string
  outcome: string
}

interface DecisionsViewProps {
  decisions: Decision[]
  archivedDecisions: ArchivedDecision[]
}

const categoryColors: Record<string, string> = {
  Strategic: "#7C3AED",
  Operational: "#06B6D4",
  Personal: "#10B981",
}

export function DecisionsView({ decisions, archivedDecisions }: DecisionsViewProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | "urgent" | "week" | "strategic" | "operational">("all")
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null)
  const [showArchive, setShowArchive] = useState(false)
  const [confirmingDecision, setConfirmingDecision] = useState<{ decision: Decision; option: DecisionOption } | null>(null)

  const filteredDecisions = decisions.filter((d) => {
    if (activeFilter === "all") return true
    if (activeFilter === "urgent") return d.urgent
    if (activeFilter === "week") return d.daysOpen <= 7
    if (activeFilter === "strategic") return d.category === "Strategic"
    if (activeFilter === "operational") return d.category === "Operational"
    return true
  })

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Decisions</h1>
          <button
            onClick={() => setShowArchive(!showArchive)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
              showArchive
                ? "bg-[#7C3AED] text-white"
                : "text-white/50 hover:text-white bg-white/5"
            )}
          >
            <Archive className="w-4 h-4" />
            Archive
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "urgent", "week", "strategic", "operational"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
                activeFilter === filter
                  ? filter === "urgent"
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "bg-[#7C3AED]/20 text-[#7C3AED] border border-[#7C3AED]/30"
                  : "text-white/50 hover:text-white bg-white/5"
              )}
            >
              {filter === "week" ? "This Week" : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {showArchive ? (
            <motion.div
              key="archive"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              {archivedDecisions.map((decision) => (
                <div
                  key={decision.id}
                  className="glass rounded-xl p-4 border-l-4 border-emerald-500"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-white">{decision.title}</h3>
                    <span className="text-xs text-white/40">Decided {decision.decidedOn}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-400">
                      {decision.option}
                    </span>
                    <span className="text-sm text-white/50">{decision.outcome}</span>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="decisions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {filteredDecisions.map((decision, index) => (
                <motion.div
                  key={decision.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedDecision(decision)}
                  className={cn(
                    "glass rounded-xl p-5 cursor-pointer transition-all hover:bg-white/[0.06]",
                    decision.urgent && "ring-1 ring-red-500/50"
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">{decision.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-white/50">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Opened {decision.daysOpen} days ago
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-[#7C3AED]" />
                          Kelly: {Math.round(decision.kellyScore * 100)}%
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs"
                          style={{
                            backgroundColor: `${categoryColors[decision.category] || "#7C3AED"}20`,
                            color: categoryColors[decision.category] || "#7C3AED",
                          }}
                        >
                          {decision.category}
                        </span>
                      </div>
                    </div>
                    {decision.urgent && (
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30"
                      >
                        <span className="text-xs font-medium text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Urgent
                        </span>
                      </motion.div>
                    )}
                  </div>

                  {/* Options preview */}
                  <div className="flex items-center gap-2 mb-3">
                    {decision.options.map((option, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-lg bg-white/5 text-sm text-white/70"
                      >
                        {option.label}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white/40 line-clamp-1 flex-1">{decision.context}</p>
                    <ChevronRight className="w-5 h-5 text-white/30" />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decision detail panel */}
      <AnimatePresence>
        {selectedDecision && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setSelectedDecision(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">{selectedDecision.title}</h2>
                  <div className="flex items-center gap-3 text-sm text-white/50">
                    <span>Opened {selectedDecision.daysOpen} days ago</span>
                    <span className="text-[#7C3AED]">Kelly: {Math.round(selectedDecision.kellyScore * 100)}%</span>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        backgroundColor: `${categoryColors[selectedDecision.category] || "#7C3AED"}20`,
                        color: categoryColors[selectedDecision.category] || "#7C3AED",
                      }}
                    >
                      {selectedDecision.category}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDecision(null)}
                  className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Context */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-2">Context</h4>
                <p className="text-white/80">{selectedDecision.context}</p>
              </div>

              {/* Options */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">Options</h4>
                <div className="grid gap-3">
                  {selectedDecision.options.map((option, i) => (
                    <div
                      key={i}
                      className="glass rounded-xl p-4 hover:bg-white/[0.06] transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-bold text-white">{option.label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-white/50">
                            Kelly: <span className="text-[#7C3AED]">{Math.round(option.kellyScore * 100)}%</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs bg-cyan-500/20 text-cyan-400">
                            {option.probability}% likely
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <span className="text-xs text-emerald-400 uppercase tracking-wider">Pros</span>
                          <ul className="mt-1 space-y-1">
                            {option.pros.map((pro, j) => (
                              <li key={j} className="text-sm text-white/70 flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-emerald-400" />
                                {pro}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="text-xs text-red-400 uppercase tracking-wider">Cons</span>
                          <ul className="mt-1 space-y-1">
                            {option.cons.map((con, j) => (
                              <li key={j} className="text-sm text-white/70 flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-red-400" />
                                {con}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <button
                        onClick={() => setConfirmingDecision({ decision: selectedDecision, option })}
                        className="w-full py-2 rounded-lg bg-[#7C3AED]/20 text-[#7C3AED] font-medium hover:bg-[#7C3AED]/30 transition-colors"
                      >
                        Choose {option.label}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation modal */}
      <AnimatePresence>
        {confirmingDecision && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmingDecision(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="glass rounded-2xl p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#7C3AED]/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-[#7C3AED]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Confirm Decision</h3>
                <p className="text-white/50 mb-6">
                  {"You're choosing"} <span className="text-white font-medium">{confirmingDecision.option.label}</span> for{" "}
                  <span className="text-white font-medium">{confirmingDecision.decision.title}</span>
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmingDecision(null)}
                    className="flex-1 py-2 rounded-lg bg-white/5 text-white/70 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setConfirmingDecision(null)
                      setSelectedDecision(null)
                    }}
                    className="flex-1 py-2 rounded-lg bg-[#7C3AED] text-white font-medium hover:bg-[#7C3AED]/80"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
