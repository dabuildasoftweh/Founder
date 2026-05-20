"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Minus, Plus, AlertCircle, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface Business {
  id: number
  name: string
  status: "ACTIVE" | "BUILDING" | "PAUSED" | "RESEARCH"
  monthlyRevenue: number
  monthlyProfit: number
  margin: number
  trend: "up" | "down" | "neutral"
  trendPercent: number
  contributionTarget: number
  currentContribution: number
  issues: string[]
  opportunities: string[]
}

interface BusinessesViewProps {
  businesses: Business[]
}

const statusColors: Record<string, string> = {
  ACTIVE: "#10B981",
  BUILDING: "#06B6D4",
  PAUSED: "#F59E0B",
  RESEARCH: "#8B5CF6",
}

export function BusinessesView({ businesses }: BusinessesViewProps) {
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)

  const totalRevenue = businesses.reduce((acc, b) => acc + b.monthlyRevenue, 0)
  const totalProfit = businesses.reduce((acc, b) => acc + b.monthlyProfit, 0)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-4">Businesses</h1>
        
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="glass rounded-xl p-4">
            <span className="text-xs text-white/50 uppercase tracking-wider">Total Monthly Revenue</span>
            <p className="text-2xl font-bold text-white mt-1">£{totalRevenue.toLocaleString()}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <span className="text-xs text-white/50 uppercase tracking-wider">Total Monthly Profit</span>
            <p className="text-2xl font-bold text-emerald-400 mt-1">£{totalProfit.toLocaleString()}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <span className="text-xs text-white/50 uppercase tracking-wider">Active Streams</span>
            <p className="text-2xl font-bold text-white mt-1">{businesses.filter((b) => b.status === "ACTIVE").length}</p>
          </div>
        </div>
      </div>

      {/* Business cards grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {businesses.map((business, index) => (
            <motion.div
              key={business.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedBusiness(business)}
              className="glass rounded-2xl p-5 cursor-pointer hover:bg-white/[0.06] transition-all"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">{business.name}</h3>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${statusColors[business.status]}20`,
                    color: statusColors[business.status],
                  }}
                >
                  {business.status}
                </span>
              </div>

              {/* Contribution arc */}
              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                  />
                  <motion.circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="#7C3AED"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 56}
                    initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
                    animate={{
                      strokeDashoffset:
                        2 * Math.PI * 56 - (business.currentContribution / 100) * 2 * Math.PI * 56,
                    }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-white">{business.currentContribution}%</span>
                  <span className="text-xs text-white/50">of goal</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <span className="text-xs text-white/50">Revenue</span>
                  <p className="text-lg font-bold text-white">£{business.monthlyRevenue.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-xs text-white/50">Profit</span>
                  <p className="text-lg font-bold text-emerald-400">£{business.monthlyProfit.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-xs text-white/50">Margin</span>
                  <p className="text-lg font-bold text-white">{business.margin}%</p>
                </div>
                <div>
                  <span className="text-xs text-white/50">Trend</span>
                  <div className="flex items-center gap-1">
                    {business.trend === "up" && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                    {business.trend === "down" && <TrendingDown className="w-4 h-4 text-red-400" />}
                    {business.trend === "neutral" && <Minus className="w-4 h-4 text-white/40" />}
                    <span
                      className={cn(
                        "text-lg font-bold",
                        business.trend === "up" && "text-emerald-400",
                        business.trend === "down" && "text-red-400",
                        business.trend === "neutral" && "text-white/40"
                      )}
                    >
                      {business.trendPercent > 0 ? "+" : ""}{business.trendPercent}%
                    </span>
                  </div>
                </div>
              </div>

              {/* North star contribution */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/50">North Star Contribution</span>
                  <span className="text-xs text-[#7C3AED]">{business.contributionTarget}% target</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-[#7C3AED]"
                    initial={{ width: 0 }}
                    animate={{ width: `${(business.currentContribution / business.contributionTarget) * 100}%` }}
                  />
                </div>
              </div>

              {/* Issues & Opportunities */}
              <div className="space-y-2">
                {business.issues.map((issue, i) => (
                  <div
                    key={`issue-${i}`}
                    className="flex items-center gap-2 px-2 py-1 rounded-lg bg-red-500/10 text-xs text-red-400"
                  >
                    <AlertCircle className="w-3 h-3" />
                    {issue}
                  </div>
                ))}
                {business.opportunities.map((opp, i) => (
                  <div
                    key={`opp-${i}`}
                    className="flex items-center gap-2 px-2 py-1 rounded-lg bg-emerald-500/10 text-xs text-emerald-400"
                  >
                    <Sparkles className="w-3 h-3" />
                    {opp}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}

          {/* Add new business card */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: businesses.length * 0.1 }}
            className="glass rounded-2xl p-5 border-2 border-dashed border-white/10 hover:border-[#7C3AED]/30 transition-all flex flex-col items-center justify-center min-h-[300px]"
          >
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <Plus className="w-6 h-6 text-white/40" />
            </div>
            <span className="text-white/40 font-medium">Add Revenue Stream</span>
          </motion.button>
        </div>
      </div>
    </div>
  )
}
