"use client"

import { motion } from "framer-motion"
import { ArrowUp, ArrowDown, Minus } from "lucide-react"
type Momentum = "UP" | "NEUTRAL" | "DOWN"

interface MomentumIndicatorProps {
  momentum: Momentum
}

const momentumConfig = {
  UP: {
    icon: ArrowUp,
    label: "BUILDING",
    color: "#10B981",
    bgColor: "rgba(16, 185, 129, 0.2)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  NEUTRAL: {
    icon: Minus,
    label: "STEADY",
    color: "#F59E0B",
    bgColor: "rgba(245, 158, 11, 0.2)",
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  DOWN: {
    icon: ArrowDown,
    label: "COURSE CORRECT",
    color: "#EF4444",
    bgColor: "rgba(239, 68, 68, 0.2)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
}

export function MomentumIndicator({ momentum }: MomentumIndicatorProps) {
  const config = momentumConfig[momentum]
  const IconComponent = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-3 px-4 py-2 rounded-xl"
      style={{
        backgroundColor: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        boxShadow: `0 0 20px ${config.bgColor}`,
      }}
    >
      <motion.div
        animate={
          momentum === "DOWN"
            ? { scale: [1, 1.1, 1] }
            : momentum === "UP"
            ? { y: [0, -2, 0] }
            : {}
        }
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <IconComponent
          className="w-5 h-5"
          style={{ color: config.color }}
        />
      </motion.div>
      <div className="flex flex-col">
        <span className="text-xs text-white/50 uppercase tracking-wider">Momentum</span>
        <span
          className="text-sm font-bold uppercase tracking-wider"
          style={{ color: config.color }}
        >
          {config.label}
        </span>
      </div>
      {momentum === "UP" && (
        <motion.div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: config.color }}
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.div>
  )
}
