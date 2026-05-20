"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { User } from "lucide-react"

interface TopBarProps {
  userName: string
  situationReport: string
  northStarCurrent: number
  northStarTarget: number
  currency: string
}

export function TopBar({
  userName,
  situationReport,
  northStarCurrent,
  northStarTarget,
  currency,
}: TopBarProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const progressPercent = (northStarCurrent / northStarTarget) * 100

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const dateString = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  const timeString = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  return (
    <div className="relative">
      {/* North Star progress bar spanning full width */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
        <motion.div
          className="h-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4]"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{
            boxShadow: "0 0 10px rgba(124, 58, 237, 0.5)",
          }}
        />
      </div>

      <div className="flex items-center justify-between px-6 py-4">
        {/* Left - Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <motion.div
              className="w-2 h-2 rounded-full bg-[#7C3AED]"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-xl font-bold tracking-wider text-white">SCOUT</span>
          </div>
        </div>

        {/* Center - Date/Time and Situation Report */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 text-white/80">
            <span className="font-medium">{dateString}</span>
            <span className="text-white/30">|</span>
            <span className="font-mono text-[#06B6D4]">{timeString}</span>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-white/50 mt-1"
          >
            {situationReport}
          </motion.p>
        </div>

        {/* Right - North Star mini + Profile */}
        <div className="flex items-center gap-4">
          {/* North Star mini display */}
          <div className="group relative">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
              <span className="text-xs text-white/50">Target:</span>
              <span className="font-bold text-white">
                {currency}{northStarCurrent.toLocaleString()}
              </span>
              <span className="text-white/30">/</span>
              <span className="text-xs text-white/50">
                {currency}{(northStarTarget / 1000).toFixed(0)}K
              </span>
            </div>
            
            {/* Hover tooltip */}
            <div className="absolute top-full right-0 mt-2 p-3 rounded-xl bg-[#0D0D24] border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 min-w-48">
              <div className="text-xs text-white/50 mb-1">North Star Goal</div>
              <div className="text-lg font-bold text-white">
                {currency}{northStarTarget.toLocaleString()}/month
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7C3AED] to-[#FFD700] rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="text-xs text-white/40 mt-1">
                {progressPercent.toFixed(1)}% complete
              </div>
            </div>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
            <motion.div
              className="w-2 h-2 rounded-full bg-emerald-500"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-xs font-medium text-emerald-400">LIVE</span>
          </div>

          {/* Profile */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/70">{userName}</span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
