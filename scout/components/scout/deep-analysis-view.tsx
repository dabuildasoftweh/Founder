"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  BarChart3, TrendingUp, TrendingDown, Minus, Clock, Shield, 
  AlertCircle, Lightbulb, Link2, RefreshCw 
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DeepAnalysisItem {
  id: string
  name: string
  source: string
  lastPulled: string
  confidence: string
  rawData: Record<string, number>
  calculation: string
  trend30d: "up" | "down" | "neutral"
  trend60d: "up" | "down" | "neutral"
  trend90d: "up" | "down" | "neutral"
  levers: string[]
  relatedDecisions: number[]
  relatedOpportunities: number[]
}

interface DeepAnalysisViewProps {
  items: DeepAnalysisItem[]
  lastSync: string
}

const confidenceConfig: Record<string, { color: string; icon: typeof Shield }> = {
  "Tier 1: Verified API": { color: "#10B981", icon: Shield },
  "Tier 2: Self-reported": { color: "#F59E0B", icon: AlertCircle },
  "Tier 3: Inferred": { color: "#EF4444", icon: Lightbulb },
}

const TrendIcon = ({ trend }: { trend: "up" | "down" | "neutral" }) => {
  if (trend === "up") return <TrendingUp className="w-4 h-4 text-emerald-400" />
  if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-400" />
  return <Minus className="w-4 h-4 text-white/40" />
}

export function DeepAnalysisView({ items, lastSync }: DeepAnalysisViewProps) {
  const [selectedItem, setSelectedItem] = useState<DeepAnalysisItem | null>(items[0] || null)

  // Expanded metrics list for navigation
  const allMetrics = [
    { id: "shopify-revenue", name: "Shopify Revenue", type: "metric" },
    { id: "shopify-profit", name: "Shopify Profit", type: "metric" },
    { id: "youtube-subs", name: "YouTube Subs", type: "metric" },
    { id: "youtube-views", name: "YouTube Views", type: "metric" },
    { id: "instagram-followers", name: "Instagram Followers", type: "metric" },
    { id: "instagram-views", name: "Instagram Views", type: "metric" },
    { id: "opportunity-1", name: "TikTok Shop", type: "opportunity" },
    { id: "opportunity-2", name: "CreatorX Partnership", type: "opportunity" },
  ]

  return (
    <div className="h-full flex">
      {/* Left nav */}
      <div className="w-64 shrink-0 border-r border-white/[0.06] pr-4 overflow-y-auto">
        <div className="mb-4">
          <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Metrics</h3>
          <div className="space-y-1">
            {allMetrics.filter((m) => m.type === "metric").map((metric) => (
              <button
                key={metric.id}
                onClick={() => setSelectedItem(items.find((i) => i.id === metric.id) || items[0])}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm transition-all",
                  selectedItem?.id === metric.id
                    ? "bg-[#7C3AED]/20 text-white border-l-2 border-[#7C3AED]"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                {metric.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Opportunities</h3>
          <div className="space-y-1">
            {allMetrics.filter((m) => m.type === "opportunity").map((metric) => (
              <button
                key={metric.id}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5"
              >
                {metric.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right content */}
      <div className="flex-1 pl-6 overflow-y-auto">
        {selectedItem ? (
          <motion.div
            key={selectedItem.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">{selectedItem.name}</h1>
                <div className="flex items-center gap-3 text-sm text-white/50">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {selectedItem.lastPulled}
                  </span>
                </div>
              </div>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:text-white">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {/* Source & Confidence */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="glass rounded-xl p-4">
                <span className="text-xs text-white/50 uppercase tracking-wider">Source</span>
                <p className="text-white font-mono mt-1">{selectedItem.source}</p>
              </div>
              <div className="glass rounded-xl p-4">
                <span className="text-xs text-white/50 uppercase tracking-wider">Confidence</span>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: confidenceConfig[selectedItem.confidence]?.color || "#7C3AED" }}
                  />
                  <span className="text-white font-mono">{selectedItem.confidence}</span>
                </div>
              </div>
            </div>

            {/* Raw Data */}
            <div className="glass rounded-xl p-4 mb-6">
              <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">Raw Data</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(selectedItem.rawData).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-xs text-white/40 font-mono">{key}</span>
                    <p className="text-lg font-bold text-white font-mono">
                      {key.includes("Sales") || key.includes("Revenue") || key.includes("discounts") || key.includes("returns")
                        ? `£${value.toLocaleString()}`
                        : value.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculation */}
            <div className="glass rounded-xl p-4 mb-6">
              <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">Calculation</h3>
              <code className="text-sm text-emerald-400 font-mono">{selectedItem.calculation}</code>
            </div>

            {/* Trend Analysis */}
            <div className="glass rounded-xl p-4 mb-6">
              <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">Trend Analysis</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-sm text-white/70">30 days</span>
                  <TrendIcon trend={selectedItem.trend30d} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-sm text-white/70">60 days</span>
                  <TrendIcon trend={selectedItem.trend60d} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-sm text-white/70">90 days</span>
                  <TrendIcon trend={selectedItem.trend90d} />
                </div>
              </div>
            </div>

            {/* Levers */}
            <div className="glass rounded-xl p-4 mb-6">
              <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">
                What Would Move This Metric
              </h3>
              <div className="space-y-2">
                {selectedItem.levers.map((lever, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg bg-white/5"
                  >
                    <span className="text-[#7C3AED] font-bold">{i + 1}.</span>
                    <span className="text-white/80">{lever}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Related items */}
            <div className="glass rounded-xl p-4">
              <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">
                Related Items
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedItem.relatedDecisions.map((id) => (
                  <span
                    key={`d-${id}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#7C3AED]/20 text-[#7C3AED] text-sm"
                  >
                    <Link2 className="w-3 h-3" />
                    Decision #{id}
                  </span>
                ))}
                {selectedItem.relatedOpportunities.map((id) => (
                  <span
                    key={`o-${id}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm"
                  >
                    <Link2 className="w-3 h-3" />
                    Opportunity #{id}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/40">Select a metric to view analysis</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
