"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, Zap, Calendar, Target, Users, Briefcase, Sparkles } from "lucide-react"

interface Task {
  id: number
  text: string
  kellyScore: number
  timeEstimate: string
  category: string
  done: boolean
  xp: number
}

interface TaskListProps {
  tasks: Task[]
  streak: number
  todayXP: number
  onToggleTask?: (id: number) => void
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  growth: Target,
  admin: Briefcase,
  content: Sparkles,
  meetings: Users,
  product: Zap,
}

export function TaskList({ tasks: initialTasks, streak, todayXP, onToggleTask }: TaskListProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [xpGained, setXpGained] = useState<{ id: number; amount: number } | null>(null)
  const [totalXP, setTotalXP] = useState(todayXP)

  const completedCount = tasks.filter((t) => t.done).length
  const totalCount = tasks.length
  const completionPercent = (completedCount / totalCount) * 100

  const handleToggle = (task: Task) => {
    if (!task.done) {
      // Show XP animation
      setXpGained({ id: task.id, amount: task.xp })
      setTotalXP((prev) => prev + task.xp)
      setTimeout(() => setXpGained(null), 1500)
    } else {
      setTotalXP((prev) => prev - task.xp)
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t))
    )
    onToggleTask?.(task.id)
  }

  const getKellyColor = (score: number) => {
    if (score >= 0.8) return "bg-emerald-500"
    if (score >= 0.6) return "bg-cyan-500"
    if (score >= 0.4) return "bg-amber-500"
    return "bg-red-500"
  }

  return (
    <div className="glass rounded-2xl p-6">
      {/* Header with completion ring */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">Today</h2>
          
          {/* Mini completion ring */}
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
                stroke="#7C3AED"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 16}
                initial={{ strokeDashoffset: 2 * Math.PI * 16 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 16 - (completionPercent / 100) * 2 * Math.PI * 16 }}
                transition={{ duration: 0.5 }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
              {completedCount}/{totalCount}
            </span>
          </div>
        </div>

        {/* XP Counter */}
        <div className="relative">
          <motion.div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFD700]/20 border border-[#FFD700]/30"
            animate={xpGained ? { scale: [1, 1.1, 1] } : {}}
          >
            <Zap className="w-4 h-4 text-[#FFD700]" />
            <span className="text-sm font-bold text-[#FFD700]">{totalXP} XP</span>
          </motion.div>
          
          <AnimatePresence>
            {xpGained && (
              <motion.div
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: 1, y: -30 }}
                exit={{ opacity: 0, y: -50 }}
                className="absolute -top-2 right-0 text-[#FFD700] font-bold text-sm"
              >
                +{xpGained.amount} XP
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {tasks.map((task, index) => {
          const CategoryIcon = categoryIcons[task.category] || Zap
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`group flex items-center gap-4 p-3 rounded-xl transition-all ${
                task.done
                  ? "bg-emerald-500/10 border border-emerald-500/20"
                  : "bg-white/5 hover:bg-white/10"
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => handleToggle(task)}
                className={`relative w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                  task.done
                    ? "bg-emerald-500 border-emerald-500"
                    : "border-white/30 hover:border-[#7C3AED]/50"
                }`}
              >
                <AnimatePresence>
                  {task.done && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Check className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>

              {/* Task text */}
              <span
                className={`flex-1 font-medium transition-all ${
                  task.done ? "text-white/40 line-through" : "text-white"
                }`}
              >
                {task.text}
              </span>

              {/* Kelly score bar */}
              <div className="w-12 h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${getKellyColor(task.kellyScore)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${task.kellyScore * 100}%` }}
                  transition={{ delay: index * 0.05 + 0.2 }}
                />
              </div>

              {/* Time estimate */}
              <div className="flex items-center gap-1 text-xs text-white/40">
                <Calendar className="w-3 h-3" />
                {task.timeEstimate}
              </div>

              {/* Category icon */}
              <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center">
                <CategoryIcon className="w-3 h-3 text-white/60" />
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Streak indicator */}
      <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔥</span>
          <span className="font-bold text-white">STREAK: {streak} days</span>
        </div>
        <div className="flex items-center gap-2 text-white/50">
          <span className="text-sm">{"TODAY'S XP:"}</span>
          <span className="font-bold text-[#FFD700]">{totalXP}</span>
        </div>
      </div>
    </div>
  )
}
