"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Timer, Calculator, FileText, ArrowRightLeft, Play, Pause, RotateCcw, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuickToolsProps {
  isOpen: boolean
  onClose: () => void
}

type ToolTab = "timer" | "calc" | "note" | "convert"

export function QuickTools({ isOpen, onClose }: QuickToolsProps) {
  const [activeTab, setActiveTab] = useState<ToolTab>("timer")

  const tabs = [
    { id: "timer" as ToolTab, icon: Timer, label: "Timer" },
    { id: "calc" as ToolTab, icon: Calculator, label: "Calc" },
    { id: "note" as ToolTab, icon: FileText, label: "Note" },
    { id: "convert" as ToolTab, icon: ArrowRightLeft, label: "Convert" },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: -20 }}
            className="fixed left-[240px] top-1/2 -translate-y-1/2 w-80 glass rounded-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <span className="font-bold text-white text-sm">Quick Tools</span>
              <button
                onClick={onClose}
                className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-white/50 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1 py-3 transition-all",
                      activeTab === tab.id
                        ? "text-[#7C3AED] border-b-2 border-[#7C3AED]"
                        : "text-white/50 hover:text-white"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-wider">{tab.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Content */}
            <div className="p-4">
              <AnimatePresence mode="wait">
                {activeTab === "timer" && <PomodoroTimer key="timer" />}
                {activeTab === "calc" && <SimpleCalculator key="calc" />}
                {activeTab === "note" && <QuickNote key="note" />}
                {activeTab === "convert" && <UnitConverter key="convert" />}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function PomodoroTimer() {
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [sessions, setSessions] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      if (!isBreak) {
        setSessions((prev) => prev + 1)
        setTimeLeft(5 * 60)
        setIsBreak(true)
      } else {
        setTimeLeft(25 * 60)
        setIsBreak(false)
      }
      setIsRunning(false)
    }

    return () => clearInterval(interval)
  }, [isRunning, timeLeft, isBreak])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  const reset = () => {
    setTimeLeft(isBreak ? 5 * 60 : 25 * 60)
    setIsRunning(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="text-center"
    >
      <div className="mb-2">
        <span className={cn(
          "text-xs uppercase tracking-wider",
          isBreak ? "text-emerald-400" : "text-[#7C3AED]"
        )}>
          {isBreak ? "Break" : "Focus"}
        </span>
      </div>
      
      <div className="text-5xl font-bold text-white font-mono mb-4">
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </div>

      <div className="flex items-center justify-center gap-3 mb-4">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all",
            isRunning
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
          )}
        >
          {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
        <button
          onClick={reset}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="text-sm text-white/50">
        Sessions today: <span className="text-white font-bold">{sessions}</span>
      </div>
    </motion.div>
  )
}

function SimpleCalculator() {
  const [display, setDisplay] = useState("0")
  const [previousValue, setPreviousValue] = useState<number | null>(null)
  const [operator, setOperator] = useState<string | null>(null)
  const [newNumber, setNewNumber] = useState(true)

  const handleNumber = (num: string) => {
    if (newNumber) {
      setDisplay(num)
      setNewNumber(false)
    } else {
      setDisplay(display === "0" ? num : display + num)
    }
  }

  const handleOperator = (op: string) => {
    setPreviousValue(parseFloat(display))
    setOperator(op)
    setNewNumber(true)
  }

  const calculate = () => {
    if (previousValue === null || operator === null) return
    
    const current = parseFloat(display)
    let result = 0

    switch (operator) {
      case "+": result = previousValue + current; break
      case "-": result = previousValue - current; break
      case "*": result = previousValue * current; break
      case "/": result = previousValue / current; break
    }

    setDisplay(String(result))
    setPreviousValue(null)
    setOperator(null)
    setNewNumber(true)
  }

  const clear = () => {
    setDisplay("0")
    setPreviousValue(null)
    setOperator(null)
    setNewNumber(true)
  }

  const buttons = [
    "7", "8", "9", "/",
    "4", "5", "6", "*",
    "1", "2", "3", "-",
    "0", ".", "=", "+",
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="bg-white/5 rounded-lg p-3 mb-3 text-right">
        <span className="text-2xl font-mono text-white">{display}</span>
      </div>
      
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={clear}
          className="col-span-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30"
        >
          Clear
        </button>
        {buttons.map((btn) => (
          <button
            key={btn}
            onClick={() => {
              if (btn === "=") calculate()
              else if (["+", "-", "*", "/"].includes(btn)) handleOperator(btn)
              else handleNumber(btn)
            }}
            className={cn(
              "py-3 rounded-lg text-sm font-medium transition-all",
              ["+", "-", "*", "/", "="].includes(btn)
                ? "bg-[#7C3AED]/20 text-[#7C3AED] hover:bg-[#7C3AED]/30"
                : "bg-white/5 text-white hover:bg-white/10"
            )}
          >
            {btn}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

function QuickNote() {
  const [notes, setNotes] = useState<string[]>([
    "Follow up with supplier about Q4 pricing",
    "Research TikTok Shop integration docs",
    "Book Africa trip flights",
  ])
  const [newNote, setNewNote] = useState("")

  const addNote = () => {
    if (!newNote.trim()) return
    setNotes((prev) => [newNote, ...prev].slice(0, 5))
    setNewNote("")
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addNote()}
          placeholder="Quick note..."
          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#7C3AED]/50"
        />
        <button
          onClick={addNote}
          className="px-3 py-2 bg-[#7C3AED] text-white rounded-lg text-sm font-medium hover:bg-[#7C3AED]/80"
        >
          Add
        </button>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {notes.map((note, i) => (
          <div
            key={i}
            className="p-2 rounded-lg bg-white/5 text-sm text-white/70"
          >
            {note}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function UnitConverter() {
  const [fromValue, setFromValue] = useState("1000")
  const [fromCurrency, setFromCurrency] = useState("GBP")
  const [toCurrency, setToCurrency] = useState("USD")

  const rates: Record<string, number> = {
    GBP: 1,
    USD: 1.27,
    EUR: 1.17,
    AUD: 1.93,
  }

  const converted = (parseFloat(fromValue) || 0) * (rates[toCurrency] / rates[fromCurrency])

  const currencies = ["GBP", "USD", "EUR", "AUD"]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs text-white/50 block mb-1">From</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={fromValue}
              onChange={(e) => setFromValue(e.target.value)}
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#7C3AED]/50"
            />
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none"
            >
              {currencies.map((c) => (
                <option key={c} value={c} className="bg-[#0D0D24]">{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-center">
          <ArrowRightLeft className="w-4 h-4 text-white/30" />
        </div>

        <div>
          <label className="text-xs text-white/50 block mb-1">To</label>
          <div className="flex gap-2">
            <div className="flex-1 px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-white text-sm font-mono">
              {converted.toFixed(2)}
            </div>
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none"
            >
              {currencies.map((c) => (
                <option key={c} value={c} className="bg-[#0D0D24]">{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
