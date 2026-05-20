"use client"

import { motion } from "framer-motion"
import { Sparkles, ArrowRight, TrendingUp } from "lucide-react"

interface Opportunity {
  id: number
  title: string
  category: string
  probability: number
  upside: number
  kellyScore: number
}

interface OpportunitiesListProps {
  opportunities: Opportunity[]
  onExplore?: (id: number) => void
}

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  ASYMMETRIC: {
    bg: "bg-emerald-500/20",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  "EASY WIN": {
    bg: "bg-cyan-500/20",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
  },
  GRIND: {
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  STANDARD: {
    bg: "bg-violet-500/20",
    text: "text-violet-400",
    border: "border-violet-500/30",
  },
}

export function OpportunitiesList({ opportunities, onExplore }: OpportunitiesListProps) {
  // Sort by Kelly score
  const sorted = [...opportunities].sort((a, b) => b.kellyScore - a.kellyScore)

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#7C3AED]" />
          <h3 className="font-bold text-white uppercase tracking-wider">Opportunities Identified</h3>
        </div>
        <span className="text-xs text-white/40">{opportunities.length} active</span>
      </div>

      <div className="space-y-3">
        {sorted.map((opp, index) => {
          const colors = categoryColors[opp.category] || categoryColors.STANDARD
          const isTop = index === 0

          return (
            <motion.div
              key={opp.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-4 rounded-xl bg-white/5 border transition-all hover:bg-white/10 ${
                isTop ? "border-emerald-500/30 glow-success" : "border-white/10"
              }`}
            >
              {/* Top opportunity badge */}
              {isTop && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-emerald-500 rounded-full text-xs font-bold text-white">
                  TOP
                </div>
              )}

              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <h4 className="font-medium text-white">{opp.title}</h4>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}
                >
                  {opp.category}
                </span>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-6 mb-3">
                {/* Probability arc */}
                <div className="flex items-center gap-2">
                  <div className="relative w-10 h-10">
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="20"
                        cy="20"
                        r="16"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="3"
                      />
                      <motion.circle
                        cx="20"
                        cy="20"
                        r="16"
                        fill="none"
                        stroke="#06B6D4"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 16}
                        initial={{ strokeDashoffset: 2 * Math.PI * 16 }}
                        animate={{
                          strokeDashoffset:
                            2 * Math.PI * 16 - (opp.probability / 100) * 2 * Math.PI * 16,
                        }}
                        transition={{ delay: index * 0.1 + 0.2 }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                      {opp.probability}%
                    </span>
                  </div>
                  <span className="text-xs text-white/40">Prob.</span>
                </div>

                {/* Upside */}
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-lg font-bold text-emerald-400">
                    £{opp.upside.toLocaleString()}/mo
                  </span>
                </div>

                {/* Kelly score */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">Kelly:</span>
                  <span className="text-sm font-bold text-[#FFD700]">
                    {(opp.kellyScore * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Explore button */}
              <button
                onClick={() => onExplore?.(opp.id)}
                className="w-full py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-medium text-white/70 hover:bg-[#7C3AED]/20 hover:border-[#7C3AED]/50 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                Explore
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
