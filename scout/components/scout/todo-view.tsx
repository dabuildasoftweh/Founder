"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, Zap, Clock, Target, Star, Flame, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface Task {
  id: number
  text: string
  kellyScore: number
  timeEstimate: string
  category: string
  done: boolean
  xp: number
  northStarImpact: number
  group: string
}

interface TodoViewProps {
  tasks: Task[]
  streak: number
  contentStreak: number
  loginStreak: number
  todayXP: number
}

const categoryColors: Record<string, string> = {
  Business: "#7C3AED",
  Content: "#06B6D4",
  System: "#F59E0B",
  Personal: "#10B981",
}

const groupConfig: Record<string, { color: string; target: number }> = {
  "Brick Whips": { color: "#7C3AED", target: 70 },
  "Personal Brand": { color: "#06B6D4", target: 20 },
  "System & Tools": { color: "#F59E0B", target: 5 },
  "Life": { color: "#10B981", target: 5 },
}

export function TodoView({ tasks: initialTasks, streak, contentStreak, loginStreak, todayXP }: TodoViewProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [activeTab, setActiveTab] = useState<"overall" | "week" | "today">("today")
  const [xpGained, setXpGained] = useState<{ id: number; amount: number } | null>(null)
  const [totalXP, setTotalXP] = useState(todayXP)

  const handleToggle = (task: Task) => {
    if (!task.done) {
      setXpGained({ id: task.id, amount: task.xp })
      setTotalXP((prev) => prev + task.xp)
      setTimeout(() => setXpGained(null), 1500)
    } else {
      setTotalXP((prev) => prev - task.xp)
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t))
    )
  }

  const getKellyColor = (score: number) => {
    if (score >= 0.8) return "bg-emerald-500"
    if (score >= 0.6) return "bg-cyan-500"
    if (score >= 0.4) return "bg-amber-500"
    return "bg-red-500"
  }

  // Sort by Kelly score for today view
  const sortedTasks = [...tasks].sort((a, b) => b.kellyScore - a.kellyScore)
  const top3Tasks = sortedTasks.filter((t) => !t.done).slice(0, 3)
  const completedToday = tasks.filter((t) => t.done).length
  const totalTasks = tasks.length

  // Group tasks by category for overall view
  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.group]) acc[task.group] = []
    acc[task.group].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  // Calculate north star progress
  const northStarTasks = tasks.filter((t) => t.northStarImpact > 0.5).length
  const weeksToGoal = 12 // Mock calculation

  return (
    <div className="h-full flex flex-col">
      {/* Header with progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">To-Do</h1>
          <div className="relative">
            <motion.div
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFD700]/20 border border-[#FFD700]/30"
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

        {/* Progress summary */}
        <div className="glass rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">{northStarTasks} tasks this week move you toward £100K/month</span>
            <span className="text-emerald-400">At this pace: North Star reached in {weeksToGoal} weeks</span>
          </div>
        </div>

        {/* Streak indicators */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-orange-500">{loginStreak}d login</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <Flame className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-500">{streak}d tasks</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
            <Flame className="w-4 h-4 text-cyan-500" />
            <span className="text-sm font-medium text-cyan-500">{contentStreak}d content</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 p-1 bg-white/5 rounded-lg w-fit">
        {(["overall", "week", "today"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all uppercase",
              activeTab === tab
                ? "bg-[#7C3AED] text-white"
                : "text-white/50 hover:text-white"
            )}
          >
            {tab === "overall" ? "Overall" : tab === "week" ? "This Week" : "Today"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === "today" && (
            <motion.div
              key="today"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Top 3 priority */}
              <div className="glass rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-[#FFD700]" />
                  <span className="font-bold text-white">{"Complete these 3 and you've done 80% of today's value"}</span>
                </div>
                <div className="space-y-2">
                  {top3Tasks.map((task, index) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      index={index}
                      onToggle={handleToggle}
                      getKellyColor={getKellyColor}
                      highlight
                    />
                  ))}
                </div>
              </div>

              {/* Remaining tasks */}
              <div className="glass rounded-xl p-4">
                <h3 className="font-bold text-white mb-4">Other Tasks</h3>
                <div className="space-y-2">
                  {sortedTasks.filter((t) => !top3Tasks.includes(t)).map((task, index) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      index={index}
                      onToggle={handleToggle}
                      getKellyColor={getKellyColor}
                    />
                  ))}
                </div>
              </div>

              {/* Completion stats */}
              <div className="flex items-center justify-between text-sm text-white/50">
                <span>{completedToday}/{totalTasks} completed</span>
                <div className="h-2 w-32 rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-[#7C3AED]"
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedToday / totalTasks) * 100}%` }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "overall" && (
            <motion.div
              key="overall"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {Object.entries(groupedTasks).map(([group, groupTasks]) => {
                const config = groupConfig[group] || { color: "#7C3AED", target: 25 }
                const completed = groupTasks.filter((t) => t.done).length
                const progress = (completed / groupTasks.length) * 100

                return (
                  <div key={group} className="glass rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                        <h3 className="font-bold text-white">{group}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/50">{config.target}% of goal</span>
                        <div className="h-2 w-20 rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${progress}%`, backgroundColor: config.color }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {groupTasks.map((task, index) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          index={index}
                          onToggle={handleToggle}
                          getKellyColor={getKellyColor}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </motion.div>
          )}

          {activeTab === "week" && (
            <motion.div
              key="week"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-7 gap-2"
            >
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
                const dayCapacity = 8 // hours
                const usedCapacity = i < 5 ? 4 + Math.random() * 3 : 0
                
                return (
                  <div key={day} className="glass rounded-xl p-3">
                    <div className="text-center mb-3">
                      <div className="text-xs text-white/50 uppercase">{day}</div>
                      <div className="text-lg font-bold text-white">{18 + i}</div>
                    </div>
                    
                    {/* Capacity bar */}
                    <div className="mb-3">
                      <div className="h-2 w-full rounded-full bg-white/10">
                        <motion.div
                          className={cn(
                            "h-full rounded-full",
                            usedCapacity / dayCapacity > 0.8 ? "bg-red-500" : "bg-emerald-500"
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((usedCapacity / dayCapacity) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-white/30 mt-1 text-center">
                        {usedCapacity.toFixed(1)}h / {dayCapacity}h
                      </div>
                    </div>

                    {/* Task indicators */}
                    <div className="space-y-1">
                      {i < 5 && Array.from({ length: Math.floor(Math.random() * 3) + 1 }).map((_, j) => (
                        <div
                          key={j}
                          className="h-1.5 rounded-full"
                          style={{ 
                            backgroundColor: Object.values(categoryColors)[j % Object.values(categoryColors).length],
                            opacity: 0.6
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function TaskRow({
  task,
  index,
  onToggle,
  getKellyColor,
  highlight = false,
}: {
  task: Task
  index: number
  onToggle: (task: Task) => void
  getKellyColor: (score: number) => string
  highlight?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "group flex items-center gap-4 p-3 rounded-xl transition-all",
        task.done
          ? "bg-emerald-500/10 border border-emerald-500/20"
          : highlight
          ? "bg-[#7C3AED]/10 border border-[#7C3AED]/20"
          : "bg-white/5 hover:bg-white/10"
      )}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task)}
        className={cn(
          "relative w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all shrink-0",
          task.done
            ? "bg-emerald-500 border-emerald-500"
            : "border-white/30 hover:border-[#7C3AED]/50"
        )}
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

      {/* Task content */}
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            "font-medium transition-all block",
            task.done ? "text-white/40 line-through" : "text-white"
          )}
        >
          {task.text}
        </span>
        {task.northStarImpact > 0 && !task.done && (
          <span className="text-xs text-emerald-400">
            +{task.northStarImpact}% toward £100K goal
          </span>
        )}
      </div>

      {/* Category chip */}
      <span
        className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
        style={{
          backgroundColor: `${categoryColors[task.category] || "#7C3AED"}20`,
          color: categoryColors[task.category] || "#7C3AED",
        }}
      >
        {task.category}
      </span>

      {/* Kelly score */}
      <div className="w-12 h-2 rounded-full bg-white/10 overflow-hidden shrink-0">
        <motion.div
          className={cn("h-full rounded-full", getKellyColor(task.kellyScore))}
          initial={{ width: 0 }}
          animate={{ width: `${task.kellyScore * 100}%` }}
        />
      </div>

      {/* Time */}
      <div className="flex items-center gap-1 text-xs text-white/40 shrink-0">
        <Clock className="w-3 h-3" />
        {task.timeEstimate}
      </div>

      {/* XP */}
      <div className="flex items-center gap-1 text-xs text-[#FFD700] shrink-0">
        <Zap className="w-3 h-3" />
        {task.xp}
      </div>
    </motion.div>
  )
}
