"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, Zap, Clock, Star, Flame, Plus, Trash2, X } from "lucide-react"
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
  onAddTask?: (task: Omit<Task, "done" | "kellyScore" | "xp" | "northStarImpact">) => Promise<void>
  onToggleTask?: (taskId: number, done: boolean) => Promise<void>
  onDeleteTask?: (taskId: number) => Promise<void>
}

const CATEGORIES = ["Business", "Content", "System", "Personal", "Life"]

const categoryColors: Record<string, string> = {
  Business: "#7C3AED",
  Content: "#06B6D4",
  System: "#F59E0B",
  Personal: "#10B981",
  Life: "#EC4899",
}

const groupConfig: Record<string, { color: string; target: number }> = {
  "Brick Whips": { color: "#7C3AED", target: 70 },
  "Personal Brand": { color: "#06B6D4", target: 20 },
  "System & Tools": { color: "#F59E0B", target: 5 },
  "Life": { color: "#10B981", target: 5 },
}

export function TodoView({
  tasks: initialTasks,
  streak,
  contentStreak,
  loginStreak,
  todayXP,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}: TodoViewProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [activeTab, setActiveTab] = useState<"today" | "overall">("today")
  const [xpGained, setXpGained] = useState<{ id: number; amount: number } | null>(null)
  const [totalXP, setTotalXP] = useState(todayXP)

  // Add task form state
  const [addText, setAddText] = useState("")
  const [addCategory, setAddCategory] = useState("Business")
  const [addTime, setAddTime] = useState("30m")
  const [addGroup, setAddGroup] = useState("Brick Whips")
  const [adding, setAdding] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  const handleToggle = async (task: Task) => {
    const newDone = !task.done
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: newDone } : t))

    if (newDone) {
      setXpGained({ id: task.id, amount: task.xp })
      setTotalXP(prev => prev + task.xp)
      setTimeout(() => setXpGained(null), 1500)
    } else {
      setTotalXP(prev => prev - task.xp)
    }

    await onToggleTask?.(task.id, newDone)
  }

  const handleAdd = async () => {
    if (!addText.trim() || adding) return
    setAdding(true)

    const newTask: Task = {
      id: Date.now(),
      text: addText.trim(),
      kellyScore: 0.7,
      timeEstimate: addTime,
      category: addCategory,
      done: false,
      xp: addCategory === "Business" ? 80 : addCategory === "Content" ? 70 : 50,
      northStarImpact: addCategory === "Business" ? 0.8 : 0.3,
      group: addGroup,
    }

    setTasks(prev => [newTask, ...prev])
    setAddText("")
    setShowAddForm(false)

    await onAddTask?.({
      id: newTask.id,
      text: newTask.text,
      timeEstimate: newTask.timeEstimate,
      category: newTask.category,
      group: newTask.group,
    })

    setAdding(false)
  }

  const handleDelete = async (taskId: number) => {
    const task = tasks.find(t => t.id === taskId)
    if (task?.done) setTotalXP(prev => prev - task.xp)
    setTasks(prev => prev.filter(t => t.id !== taskId))
    await onDeleteTask?.(taskId)
  }

  const getKellyColor = (score: number) => {
    if (score >= 0.8) return "bg-emerald-500"
    if (score >= 0.6) return "bg-cyan-500"
    if (score >= 0.4) return "bg-amber-500"
    return "bg-red-500"
  }

  const sortedTasks = [...tasks].sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || b.kellyScore - a.kellyScore)
  const top3Tasks = sortedTasks.filter(t => !t.done).slice(0, 3)
  const completedToday = tasks.filter(t => t.done).length
  const totalTasks = tasks.length

  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.group]) acc[task.group] = []
    acc[task.group].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">To-Do</h1>
          <div className="flex items-center gap-3">
            {/* XP badge */}
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
                    className="absolute -top-2 right-0 text-[#FFD700] font-bold text-sm pointer-events-none"
                  >
                    +{xpGained.amount} XP
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Add button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#7C3AED] text-white text-sm font-semibold"
              style={{ boxShadow: "0 0 20px rgba(124,58,237,0.4)" }}
            >
              <Plus className="w-4 h-4" />
              Add Task
            </motion.button>
          </div>
        </div>

        {/* Quick-add form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="glass rounded-xl p-4 border border-[#7C3AED]/30">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-[#7C3AED]" />
                  <span className="text-sm font-semibold text-white">New Task</span>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="ml-auto text-white/40 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Task text */}
                <input
                  autoFocus
                  type="text"
                  value={addText}
                  onChange={e => setAddText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAdd()}
                  placeholder="What needs doing?"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#7C3AED]/50 text-sm mb-3"
                />

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Category */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">Category</span>
                    <div className="flex gap-1">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setAddCategory(cat)}
                          className="px-2 py-1 rounded-lg text-xs font-medium transition-all"
                          style={{
                            background: addCategory === cat ? `${categoryColors[cat]}30` : "rgba(255,255,255,0.05)",
                            color: addCategory === cat ? categoryColors[cat] : "rgba(255,255,255,0.4)",
                            border: `1px solid ${addCategory === cat ? categoryColors[cat] + "50" : "transparent"}`,
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time estimate */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">Time</span>
                    <div className="flex gap-1">
                      {["15m", "30m", "1h", "2h", "3h+"].map(t => (
                        <button
                          key={t}
                          onClick={() => setAddTime(t)}
                          className="px-2 py-1 rounded-lg text-xs font-medium transition-all"
                          style={{
                            background: addTime === t ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.05)",
                            color: addTime === t ? "#7C3AED" : "rgba(255,255,255,0.4)",
                            border: `1px solid ${addTime === t ? "rgba(124,58,237,0.4)" : "transparent"}`,
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Group */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">Area</span>
                    <select
                      value={addGroup}
                      onChange={e => setAddGroup(e.target.value)}
                      className="px-2 py-1 rounded-lg text-xs bg-white/5 border border-white/10 text-white/70 focus:outline-none focus:border-[#7C3AED]/50"
                    >
                      {["Brick Whips", "Personal Brand", "System & Tools", "Life"].map(g => (
                        <option key={g} value={g} className="bg-[#0D0D24]">{g}</option>
                      ))}
                    </select>
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleAdd}
                    disabled={!addText.trim() || adding}
                    className="ml-auto px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-sm font-semibold disabled:opacity-40 hover:bg-[#7C3AED]/80 transition-colors"
                  >
                    {adding ? "Adding..." : "Add →"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar */}
        {totalTasks > 0 && (
          <div className="glass rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-white/50">{completedToday}/{totalTasks} tasks done today</span>
              <span className="text-white/50 font-medium">{Math.round((completedToday / totalTasks) * 100)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4]"
                initial={{ width: 0 }}
                animate={{ width: `${(completedToday / totalTasks) * 100}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
          </div>
        )}

        {/* Streaks */}
        <div className="flex items-center gap-3">
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
        {(["today", "overall"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all uppercase",
              activeTab === tab ? "bg-[#7C3AED] text-white" : "text-white/50 hover:text-white"
            )}
          >
            {tab === "today" ? "Today" : "By Area"}
          </button>
        ))}
      </div>

      {/* Task list */}
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
              {tasks.length === 0 ? (
                <div className="glass rounded-xl p-8 text-center">
                  <p className="text-white/40 mb-4">No tasks yet today.</p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/30 text-[#7C3AED] text-sm font-medium hover:bg-[#7C3AED]/30 transition-colors"
                  >
                    + Add your first task
                  </button>
                </div>
              ) : (
                <>
                  {/* Top 3 priority */}
                  {top3Tasks.length > 0 && (
                    <div className="glass rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Star className="w-5 h-5 text-[#FFD700]" />
                        <span className="font-bold text-white">Top priority</span>
                        <span className="text-white/40 text-sm">— do these first</span>
                      </div>
                      <div className="space-y-2">
                        {top3Tasks.map((task, index) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            index={index}
                            onToggle={handleToggle}
                            onDelete={handleDelete}
                            getKellyColor={getKellyColor}
                            highlight
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rest of tasks */}
                  {sortedTasks.filter(t => !top3Tasks.includes(t)).length > 0 && (
                    <div className="glass rounded-xl p-4">
                      <h3 className="font-bold text-white mb-4">Everything else</h3>
                      <div className="space-y-2">
                        {sortedTasks.filter(t => !top3Tasks.includes(t)).map((task, index) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            index={index}
                            onToggle={handleToggle}
                            onDelete={handleDelete}
                            getKellyColor={getKellyColor}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {activeTab === "overall" && (
            <motion.div
              key="overall"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {Object.keys(groupedTasks).length === 0 ? (
                <div className="glass rounded-xl p-8 text-center">
                  <p className="text-white/40">Add tasks to see them grouped by area.</p>
                </div>
              ) : (
                Object.entries(groupedTasks).map(([group, groupTasks]) => {
                  const config = groupConfig[group] || { color: "#7C3AED", target: 25 }
                  const completed = groupTasks.filter(t => t.done).length
                  const progress = groupTasks.length > 0 ? (completed / groupTasks.length) * 100 : 0

                  return (
                    <div key={group} className="glass rounded-xl p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
                          <h3 className="font-bold text-white">{group}</h3>
                          <span className="text-xs text-white/40">{completed}/{groupTasks.length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-white/10">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: config.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-white/40">{Math.round(progress)}%</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {groupTasks
                          .sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0))
                          .map((task, index) => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              index={index}
                              onToggle={handleToggle}
                              onDelete={handleDelete}
                              getKellyColor={getKellyColor}
                            />
                          ))}
                      </div>
                    </div>
                  )
                })
              )}
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
  onDelete,
  getKellyColor,
  highlight = false,
}: {
  task: Task
  index: number
  onToggle: (task: Task) => void
  onDelete: (taskId: number) => void
  getKellyColor: (score: number) => string
  highlight?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        "group flex items-center gap-3 p-3 rounded-xl transition-all",
        task.done
          ? "bg-emerald-500/10 border border-emerald-500/20"
          : highlight
          ? "bg-[#7C3AED]/10 border border-[#7C3AED]/20"
          : "bg-white/5 hover:bg-white/8 border border-transparent"
      )}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task)}
        className={cn(
          "relative w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all shrink-0",
          task.done ? "bg-emerald-500 border-emerald-500" : "border-white/30 hover:border-[#7C3AED]/60"
        )}
      >
        <AnimatePresence>
          {task.done && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Check className="w-3.5 h-3.5 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <span className={cn("font-medium block truncate", task.done ? "text-white/40 line-through" : "text-white")}>
          {task.text}
        </span>
      </div>

      {/* Category */}
      <span
        className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0 hidden sm:block"
        style={{
          background: `${categoryColors[task.category] || "#7C3AED"}20`,
          color: categoryColors[task.category] || "#7C3AED",
        }}
      >
        {task.category}
      </span>

      {/* Kelly bar */}
      <div className="w-10 h-1.5 rounded-full bg-white/10 overflow-hidden shrink-0 hidden sm:block">
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

      {/* Delete — visible on hover */}
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-red-400 shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  )
}
