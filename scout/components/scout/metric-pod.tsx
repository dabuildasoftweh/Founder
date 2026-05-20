"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { ShoppingBag, Play, Eye, Camera, TrendingUp, ArrowUp, ArrowDown, Wallet, Rocket, X } from "lucide-react"

interface MetricPodProps {
  id?: string
  platform: string
  icon: string
  value: number
  displayValue?: string
  prefix?: string
  suffix?: string
  delta?: number
  deltaLabel?: string
  trend?: number[]
  monthlyData?: number[]
  color: string
  label?: string
  chip?: string
  negative?: boolean
  isProjection?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconMap: Record<string, React.ComponentType<any>> = {
  "shopping-bag": ShoppingBag,
  "youtube": Play,
  "eye": Eye,
  "instagram": Camera,
  "trending-up": TrendingUp,
  "wallet": Wallet,
  "rocket": Rocket,
}

export function MetricPod({
  platform,
  icon,
  value,
  displayValue,
  prefix = "",
  suffix = "",
  delta,
  deltaLabel,
  trend,
  monthlyData,
  color,
  label,
  chip,
  negative = false,
  isProjection = false,
}: MetricPodProps) {
  const [expanded, setExpanded] = useState(false)
  const IconComponent = iconMap[icon] || TrendingUp
  const isPositive = delta !== undefined ? delta >= 0 && !negative : true
  const chartData = trend?.map((v, i) => ({ value: v, index: i })) || []
  const barData = monthlyData?.map((v, i) => ({ 
    value: v, 
    month: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i] 
  })) || []

  const formattedValue = displayValue || `${prefix}${value.toLocaleString()}${suffix}`

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        onClick={() => isProjection && setExpanded(true)}
        className={`glass rounded-xl p-4 relative overflow-hidden group ${isProjection ? "cursor-pointer" : ""}`}
        style={{
          ["--pod-color" as string]: color,
        }}
      >
        {/* Glow effect on hover */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at center, ${color}15 0%, transparent 70%)`,
          }}
        />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${color}20` }}
            >
              <IconComponent className="w-4 h-4" style={{ color }} />
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: color }}
            />
          </div>

          {/* Value */}
          <motion.div
            className="text-2xl font-bold text-white mb-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {formattedValue}
          </motion.div>

          {/* Platform name */}
          <div className="text-xs text-white/50 mb-1">{platform}</div>

          {/* Label or Chip */}
          {label && <div className="text-[10px] text-white/30 mb-2">{label}</div>}
          {chip && (
            <div 
              className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium mb-2"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {chip}
            </div>
          )}

          {/* Delta */}
          {delta !== undefined && (
            <div className="flex items-center gap-1 text-xs mb-2">
              <span className={isPositive ? "text-emerald-400" : "text-red-400"}>
                {isPositive ? (
                  <ArrowUp className="w-3 h-3 inline" />
                ) : (
                  <ArrowDown className="w-3 h-3 inline" />
                )}
                {isPositive ? "+" : ""}{prefix}{Math.abs(delta).toLocaleString()}
              </span>
              {deltaLabel && <span className="text-white/30">{deltaLabel}</span>}
            </div>
          )}

          {/* Sparkline */}
          {trend && (
            <div className="h-8 mt-2 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Monthly bar chart for all-time revenue */}
          {monthlyData && (
            <div className="h-10 mt-2 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </motion.div>

      {/* Expanded projection modal */}
      <AnimatePresence>
        {expanded && isProjection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-2xl p-6 w-full max-w-lg mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">{platform}</h3>
                <button
                  onClick={() => setExpanded(false)}
                  className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="text-3xl font-bold text-white mb-2">{formattedValue}</div>
              <p className="text-sm text-white/50 mb-6">{chip}</p>

              {/* Projection graph */}
              <div className="h-40 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { month: "Jun", value: 32000 },
                    { month: "Jul", value: 45000 },
                    { month: "Aug", value: 58000 },
                    { month: "Sep", value: 85000 },
                    { month: "Oct", value: 120000 },
                    { month: "Nov", value: 187000 },
                  ]}>
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickFormatter={(v) => `£${v/1000}k`} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#0D0D24", 
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px"
                      }}
                      labelStyle={{ color: "white" }}
                      formatter={(value: unknown) => [`£${Number(value).toLocaleString()}`, "Projected"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={color}
                      strokeWidth={2}
                      dot={{ fill: color, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-white/50">
                  <span>Current monthly</span>
                  <span className="text-white">£47,820</span>
                </div>
                <div className="flex justify-between text-white/50">
                  <span>Growth rate</span>
                  <span className="text-emerald-400">+32% MoM</span>
                </div>
                <div className="flex justify-between text-white/50">
                  <span>Confidence</span>
                  <span className="text-amber-400">Medium</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

interface MetricsGridProps {
  metrics: MetricPodProps[]
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <MetricPod {...metric} />
        </motion.div>
      ))}
    </div>
  )
}
