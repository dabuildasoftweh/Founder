"use client"

import { motion } from "framer-motion"
import { TrendingUp, Bell, Brain, Ghost, Trophy, Radio, Milestone, Settings } from "lucide-react"

interface IntelItem {
  id: number
  type: string
  text: string
  time: string
  category: string
}

interface IntelFeedProps {
  items: IntelItem[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const typeIcons: Record<string, React.ComponentType<any>> = {
  metric: TrendingUp,
  reminder: Bell,
  pattern: Brain,
  zombie: Ghost,
  achievement: Trophy,
  insight: Brain,
  milestone: Milestone,
  system: Settings,
  warning: Ghost,
  commitment: Bell,
  growth: TrendingUp,
}

const categoryColors: Record<string, string> = {
  growth: "#10B981",
  commitment: "#F59E0B",
  insight: "#7C3AED",
  warning: "#EF4444",
  achievement: "#FFD700",
  milestone: "#06B6D4",
  system: "#6B7280",
}

export function IntelFeed({ items }: IntelFeedProps) {
  return (
    <div className="glass rounded-2xl p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-[#06B6D4] animate-pulse-glow" />
          <h3 className="font-bold text-white uppercase tracking-wider">Intel</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-white/40">LIVE</span>
        </div>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
        {items.map((item, index) => {
          const IconComponent = typeIcons[item.type] || typeIcons[item.category] || Radio
          const color = categoryColors[item.category] || "#7C3AED"

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative pl-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              {/* Left border accent */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-full"
                style={{ backgroundColor: color }}
              />

              <div className="flex items-start gap-3">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <IconComponent className="w-3 h-3" style={{ color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80">{item.text}</p>
                  <span className="text-xs text-white/40">{item.time}</span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
