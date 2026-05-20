"use client"

import { motion } from "framer-motion"

interface NorthStarRingProps {
  current: number
  target: number
  currency?: string
  secondaryTarget?: number
  secondaryLabel?: string
  velocityMonths?: number
}

export function NorthStarRing({
  current,
  target,
  currency = "£",
  secondaryTarget,
  secondaryLabel,
  velocityMonths,
}: NorthStarRingProps) {
  const percentage = Math.min((current / target) * 100, 100)
  const remaining = target - current
  
  // Color shifts based on progress
  const getProgressColor = () => {
    if (percentage < 25) return "#EF4444" // red
    if (percentage < 50) return "#F59E0B" // orange
    if (percentage < 75) return "#EAB308" // yellow
    return "#FFD700" // gold
  }

  const circumference = 2 * Math.PI * 85
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="glass rounded-2xl p-6 glow-violet">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">North Star</h3>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-pulse-glow" />
          <span className="text-xs text-white/40">TRACKING</span>
        </div>
      </div>

      <div className="relative w-full aspect-square max-w-[240px] mx-auto">
        {/* Outer decorative ring */}
        <motion.div
          className="absolute inset-0 rounded-full border border-white/5"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        >
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/20 rounded-full"
              style={{
                top: "50%",
                left: "50%",
                transform: `rotate(${i * 30}deg) translateY(-115px)`,
              }}
            />
          ))}
        </motion.div>

        {/* Secondary ring (if provided) */}
        {secondaryTarget && (
          <svg className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)]" viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r="95"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="2"
            />
            <motion.circle
              cx="100"
              cy="100"
              r="95"
              fill="none"
              stroke="rgba(124, 58, 237, 0.3)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 95}
              initial={{ strokeDashoffset: 2 * Math.PI * 95 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 95 - ((current / secondaryTarget) * 2 * Math.PI * 95) }}
              transition={{ duration: 2, ease: "easeOut" }}
              transform="rotate(-90 100 100)"
            />
          </svg>
        )}

        {/* Main progress ring */}
        <svg className="absolute inset-4 w-[calc(100%-32px)] h-[calc(100%-32px)]" viewBox="0 0 200 200">
          {/* Background ring */}
          <circle
            cx="100"
            cy="100"
            r="85"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="8"
          />
          
          {/* Progress ring */}
          <motion.circle
            cx="100"
            cy="100"
            r="85"
            fill="none"
            stroke={getProgressColor()}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 2, ease: "easeOut" }}
            transform="rotate(-90 100 100)"
            style={{
              filter: `drop-shadow(0 0 10px ${getProgressColor()})`,
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <span className="text-4xl font-bold text-white">
              {currency}{current.toLocaleString()}
            </span>
            <div className="text-xs text-white/40 mt-1">
              of {currency}{target.toLocaleString()}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Stats below ring */}
      <div className="mt-4 space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-white/50">Remaining</span>
          <span className="text-white/80 font-medium">{currency}{remaining.toLocaleString()}</span>
        </div>
        
        {secondaryLabel && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-white/50">Secondary</span>
            <span className="text-[#7C3AED] font-medium text-xs">{secondaryLabel}</span>
          </div>
        )}

        {velocityMonths && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">At current rate</span>
              <div className="flex items-center gap-2">
                <motion.span
                  className="text-[#06B6D4] font-bold"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 }}
                >
                  Month {velocityMonths}
                </motion.span>
                <svg className="w-4 h-4 text-[#06B6D4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
