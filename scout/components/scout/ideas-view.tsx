"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Lightbulb, TrendingUp, TrendingDown, Gauge, Filter, SortDesc } from "lucide-react"
import { cn } from "@/lib/utils"

interface Idea {
  id: number
  text: string
  upside: number
  downside: number
  effort: number
  category: string
  createdAt?: Date
}

interface IdeasViewProps {
  ideas: Idea[]
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

export function IdeasView({ ideas: initialIdeas }: IdeasViewProps) {
  const [ideas, setIdeas] = useState(initialIdeas)
  const [isExpanded, setIsExpanded] = useState(false)
  const [newIdea, setNewIdea] = useState("")
  const [upside, setUpside] = useState(5)
  const [downside, setDownside] = useState(3)
  const [effort, setEffort] = useState(5)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<"recent" | "upside" | "ratio">("recent")

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
      createdAt: new Date(),
    }

    setIdeas((prev) => [idea, ...prev])
    setNewIdea("")
    setUpside(5)
    setDownside(3)
    setEffort(5)
    setIsExpanded(false)
  }

  const filteredIdeas = ideas
    .filter((idea) => !filterCategory || idea.category === filterCategory)
    .sort((a, b) => {
      if (sortBy === "upside") return b.upside - a.upside
      if (sortBy === "ratio") return (b.upside / b.downside) - (a.upside / a.downside)
      return 0 // recent - maintain order
    })

  const categoryCounts = ideas.reduce((acc, idea) => {
    acc[idea.category] = (acc[idea.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Lightbulb className="w-6 h-6 text-[#FFD700]" />
            <h1 className="text-2xl font-bold text-white">Ideas</h1>
            <span className="text-sm text-white/40">{ideas.length} captured</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3 mb-4">
          {Object.entries(categoryConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setFilterCategory(filterCategory === key ? null : key)}
              className={cn(
                "glass rounded-xl p-3 text-center transition-all",
                filterCategory === key && "ring-2",
              )}
              style={{
                ["--ring-color" as string]: config.color,
                outline: filterCategory === key ? `2px solid ${config.color}` : undefined,
              }}
            >
              <div className="text-2xl font-bold text-white">{categoryCounts[key] || 0}</div>
              <div className="text-xs" style={{ color: config.color }}>{config.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Input area */}
      <div className="glass rounded-2xl p-4 mb-6">
        <input
          type="text"
          value={newIdea}
          onChange={(e) => setNewIdea(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          placeholder="$ What are you thinking..."
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
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/50 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      Upside
                    </span>
                    <span className="text-lg font-bold text-emerald-400">{upside}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={upside}
                    onChange={(e) => setUpside(parseInt(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/50 flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-400" />
                      Downside
                    </span>
                    <span className="text-lg font-bold text-red-400">{downside}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={downside}
                    onChange={(e) => setDownside(parseInt(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-400"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/50 flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-amber-400" />
                      Effort
                    </span>
                    <span className="text-lg font-bold text-amber-400">{effort}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={effort}
                    onChange={(e) => setEffort(parseInt(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400"
                  />
                </div>
              </div>

              {/* Category preview */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white/50">Auto-category:</span>
                  {(() => {
                    const cat = categorizeIdea(upside, downside, effort)
                    const config = categoryConfig[cat]
                    return (
                      <span
                        className="px-3 py-1.5 rounded-full text-sm font-medium"
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
                    className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!newIdea.trim()}
                    className="px-6 py-2 bg-[#7C3AED] text-white rounded-lg text-sm font-medium hover:bg-[#7C3AED]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Capture Idea
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Filters & Sort */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-white/40" />
          <span className="text-sm text-white/40">
            {filterCategory ? `Showing ${filterCategory}` : "All ideas"}
          </span>
          {filterCategory && (
            <button
              onClick={() => setFilterCategory(null)}
              className="text-xs text-[#7C3AED] hover:text-[#7C3AED]/80"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SortDesc className="w-4 h-4 text-white/40" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
          >
            <option value="recent" className="bg-[#0D0D24]">Most Recent</option>
            <option value="upside" className="bg-[#0D0D24]">Highest Upside</option>
            <option value="ratio" className="bg-[#0D0D24]">Best Ratio</option>
          </select>
        </div>
      </div>

      {/* Ideas list */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredIdeas.map((idea, index) => {
              const config = categoryConfig[idea.category]
              return (
                <motion.div
                  key={idea.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass rounded-xl p-4 hover:bg-white/[0.06] transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="text-white font-medium">{idea.text}</span>
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
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-emerald-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {idea.upside}
                      </span>
                      <span className="text-sm text-red-400 flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" />
                        {idea.downside}
                      </span>
                      <span className="text-sm text-amber-400 flex items-center gap-1">
                        <Gauge className="w-3 h-3" />
                        {idea.effort}
                      </span>
                    </div>
                    <span className="text-xs text-white/30">
                      {(idea.upside / idea.downside).toFixed(1)}x ratio
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
