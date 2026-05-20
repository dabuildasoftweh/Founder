"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Zap, Trophy, Target, Radio, Rocket, Flame, Lock, Check } from "lucide-react"

interface Achievement {
  id: number
  icon: string
  title: string
  unlocked: boolean
}

interface Milestone {
  id: number
  title: string
  unlocked: boolean
}

interface GamificationBarProps {
  level: number
  levelTitle: string
  xpCurrent: number
  xpToNextLevel: number
  tasksCompleted: number
  ideasCaptured: number
  decisionsMade: number
  achievements: Achievement[]
  milestones?: Milestone[]
  loginStreak?: number
  taskStreak?: number
  contentStreak?: number
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  flame: Flame,
  target: Target,
  radio: Radio,
  rocket: Rocket,
  zap: Zap,
}

export function GamificationBar({
  level,
  levelTitle,
  xpCurrent,
  xpToNextLevel,
  tasksCompleted,
  ideasCaptured,
  decisionsMade,
  achievements,
  milestones = [],
  loginStreak = 14,
  taskStreak = 7,
  contentStreak = 5,
}: GamificationBarProps) {
  const [showMilestones, setShowMilestones] = useState(false)
  const xpPercent = (xpCurrent / xpToNextLevel) * 100
  const recentAchievements = achievements.filter((a) => a.unlocked).slice(0, 5)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Level badge */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] flex items-center justify-center">
              <span className="text-lg font-bold text-white">{level}</span>
            </div>
            <motion.div
              className="absolute -inset-1 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] opacity-30 blur-sm -z-10"
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div>
            <div className="text-xs text-white/50 uppercase tracking-wider">Level {level}</div>
            <div className="font-bold text-white">{levelTitle}</div>
          </div>
        </div>

        {/* XP Progress bar */}
        <div className="flex-1 max-w-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-white/50">XP Progress</span>
            <span className="text-xs text-white/70">
              {xpCurrent.toLocaleString()} / {xpToNextLevel.toLocaleString()}
            </span>
          </div>
          <div className="h-3 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4]"
              initial={{ width: 0 }}
              animate={{ width: `${xpPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{
                boxShadow: "0 0 10px rgba(124, 58, 237, 0.5)",
              }}
            />
          </div>
        </div>

        {/* Streaks */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-bold text-orange-500">{loginStreak}</span>
            <span className="text-xs text-orange-500/60">login</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <Flame className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-bold text-emerald-500">{taskStreak}</span>
            <span className="text-xs text-emerald-500/60">tasks</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
            <Flame className="w-4 h-4 text-cyan-500" />
            <span className="text-sm font-bold text-cyan-500">{contentStreak}</span>
            <span className="text-xs text-cyan-500/60">content</span>
          </div>
        </div>

        {/* Today stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Target className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">{tasksCompleted}</div>
              <div className="text-xs text-white/40">Tasks</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#06B6D4]/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#06B6D4]" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">{ideasCaptured}</div>
              <div className="text-xs text-white/40">Ideas</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/20 flex items-center justify-center">
              <Radio className="w-4 h-4 text-[#7C3AED]" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">{decisionsMade}</div>
              <div className="text-xs text-white/40">Decisions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements & Milestones */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/50 uppercase tracking-wider">Achievements</span>
          <button
            onClick={() => setShowMilestones(!showMilestones)}
            className="text-xs text-[#7C3AED] hover:text-[#7C3AED]/80"
          >
            {showMilestones ? "Hide milestones" : "View all milestones"}
          </button>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {recentAchievements.map((achievement, index) => {
            const IconComponent = iconMap[achievement.icon] || Trophy
            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30"
              >
                <IconComponent className="w-4 h-4 text-[#FFD700]" />
                <span className="text-xs font-medium text-[#FFD700]">{achievement.title}</span>
              </motion.div>
            )
          })}
        </div>

        {/* Milestones panel */}
        <AnimatePresence>
          {showMilestones && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                      milestone.unlocked
                        ? "bg-emerald-500/10 border border-emerald-500/30"
                        : "bg-white/5 border border-white/10"
                    }`}
                  >
                    {milestone.unlocked ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-white/30 shrink-0" />
                    )}
                    <span className={`text-xs ${milestone.unlocked ? "text-emerald-400" : "text-white/40"}`}>
                      {milestone.title}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
