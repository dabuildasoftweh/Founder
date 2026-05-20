"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Lightbulb, TrendingUp, TrendingDown, Gauge } from "lucide-react"

interface Idea {
  id: number
  text: string
  upside: number
  downside: number
  effort: number
  category: string
}

interface IdeaCaptureProps {
  ideas: Idea[]
  onAddIdea?: (idea: Omit<Idea, "id" | "category">) => void
}

const categoryConfig: Record<string, { label: string; color: string; description: string }> = {
  ASYMMETRIC: {
    label: "ASYMMETRIC",
    color: "#10B981",
    description: "High upside, low downside",
  },
  "EASY WIN": {
    label: "EASY WIN",
    color: "#06B6D4",
    description: "Low effort, good return",
  },
  GRIND: {
    label: "GRIND",
    color: "#F59E0B",
    description: "High effort required",
  },
  TRAP: {
    label: "TRAP",
    color: "#EF4444",
    description: "Risk outweighs reward",
  },
  STANDARD: {
    label: "STANDARD",
    color: "#8B5CF6",
    description: "Balanced opportunity",
  },
}

function categorizeIdea(upside: number, downside: number, effort: number): string {
  const ratio = upside / Math.max(downside, 1)
  
  if (ratio >= 3 && downside <= 3) return "ASYMMETRIC"
  if (effort <= 3 && upside >= 5) return "EASY WIN"
  if (downside > upside) return "TRAP"
  if (effort >= 7) return "GRIND"
  return "STANDARD"
}

export function IdeaCapture({ ideas: initialIdeas, onAddIdea }: IdeaCaptureProps) {
  const [ideas, setIdeas] = useState(initialIdeas)
  const [isExpanded, setIsExpanded] = useState(false)
  const [newIdea, setNewIdea] = useState("")
  const [upside, setUpside] = useState(5)
  const [downside, setDownside] = useState(3)
  const [effort, setEffort] = useState(5)

  const handleSubmit = () => {
    if (!newIdea.trim()) return

    const category = categorizeIdea(upside, downside, effort)
    const idea: Idea = {
      id: Date.now(),
      text: newIdea,
      upside,
      downside,
      effort,
      category,
    }

    setIdeas((prev) => [idea, ...prev])
    onAddIdea?.({ text: newIdea, upside, downside, effort })
    setNewIdea("")
    setUpside(5)
    setDownside(3)
    setEffort(5)
    setIsExpanded(false)
  }

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-[#FFD700]" />
          <h3 className="font-bold text-white uppercase tracking-wider">Idea Capture</h3>
        </div>
        <span className="text-xs text-white/40">{ideas.length} ideas</span>
      </div>

      {/* Input area */}
      <div className="relative">
        <input
          type="text"
          value={newIdea}
          onChange={(e) => setNewIdea(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          placeholder="What are you thinking..."
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#7C3AED]/50 focus:ring-1 focus:ring-[#7C3AED]/30 font-mono"
        />

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-4"
            >
              {/* Sliders */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/50 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                      Upside
                    </span>
                    <span className="text-sm font-bold text-emerald-400">{upside}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={upside}
                    onChange={(e) => setUpside(parseInt(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/50 flex items-center gap-1">
                      <TrendingDown className="w-3 h-3 text-red-400" />
                      Downside
                    </span>
                    <span className="text-sm font-bold text-red-400">{downside}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={downside}
                    onChange={(e) => setDownside(parseInt(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-400"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/50 flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-amber-400" />
                      Effort
                    </span>
                    <span className="text-sm font-bold text-amber-400">{effort}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={effort}
                    onChange={(e) => setEffort(parseInt(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400"
                  />
                </div>
              </div>

              {/* Category preview */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50">Category:</span>
                  {(() => {
                    const cat = categorizeIdea(upside, downside, effort)
                    const config = categoryConfig[cat]
                    return (
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${config.color}20`,
                          color: config.color,
                          border: `1px solid ${config.color}40`,
                        }}
                      >
                        {config.label}
                      </span>
                    )
                  })()}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="px-3 py-1.5 text-sm text-white/50 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!newIdea.trim()}
                    className="px-4 py-1.5 bg-[#7C3AED] text-white rounded-lg text-sm font-medium hover:bg-[#7C3AED]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Capture
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ideas list */}
      <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
        <AnimatePresence>
          {ideas.map((idea, index) => {
            const config = categoryConfig[idea.category]
            return (
              <motion.div
                key={idea.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className="p-3 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm text-white/80 flex-1">{idea.text}</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
                    style={{
                      backgroundColor: `${config.color}20`,
                      color: config.color,
                      border: `1px solid ${config.color}40`,
                    }}
                  >
                    {config.label}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs text-emerald-400/70">↑{idea.upside}</span>
                  <span className="text-xs text-red-400/70">↓{idea.downside}</span>
                  <span className="text-xs text-amber-400/70">⚡{idea.effort}</span>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
