"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  User, Link2, Bell, Palette, Shield, Database, 
  Check, ExternalLink, RefreshCw 
} from "lucide-react"
import { cn } from "@/lib/utils"

type SettingsTab = "profile" | "connections" | "notifications" | "appearance" | "privacy" | "data"

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile")

  const tabs = [
    { id: "profile" as SettingsTab, icon: User, label: "Profile" },
    { id: "connections" as SettingsTab, icon: Link2, label: "Connections" },
    { id: "notifications" as SettingsTab, icon: Bell, label: "Notifications" },
    { id: "appearance" as SettingsTab, icon: Palette, label: "Appearance" },
    { id: "privacy" as SettingsTab, icon: Shield, label: "Privacy" },
    { id: "data" as SettingsTab, icon: Database, label: "Data" },
  ]

  const connections = [
    { id: "shopify", name: "Shopify", status: "connected", lastSync: "2 min ago" },
    { id: "youtube", name: "YouTube", status: "connected", lastSync: "5 min ago" },
    { id: "instagram", name: "Instagram", status: "connected", lastSync: "3 min ago" },
    { id: "tiktok", name: "TikTok", status: "not_connected", lastSync: null },
    { id: "notion", name: "Notion", status: "connected", lastSync: "1 hour ago" },
    { id: "calendar", name: "Google Calendar", status: "connected", lastSync: "10 min ago" },
  ]

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className="w-56 shrink-0 border-r border-white/[0.06] pr-4">
        <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>
        <nav className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                  activeTab === tab.id
                    ? "bg-[#7C3AED]/10 text-white"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className={cn("w-4 h-4", activeTab === tab.id && "text-[#7C3AED]")} />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 pl-6 overflow-y-auto">
        {activeTab === "profile" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-xl font-bold text-white mb-6">Profile Settings</h2>
            
            <div className="glass rounded-xl p-6 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] flex items-center justify-center text-2xl font-bold text-white">
                  J
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Joshua</h3>
                  <p className="text-sm text-white/50">Level 12 Commander</p>
                  <button className="text-sm text-[#7C3AED] mt-1">Change avatar</button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white/50 block mb-1">Display Name</label>
                  <input
                    type="text"
                    defaultValue="Joshua"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#7C3AED]/50"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/50 block mb-1">Email</label>
                  <input
                    type="email"
                    defaultValue="joshua@example.com"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#7C3AED]/50"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/50 block mb-1">Time Zone</label>
                  <select className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none">
                    <option value="UTC" className="bg-[#0D0D24]">UTC</option>
                    <option value="GMT" className="bg-[#0D0D24]">GMT (London)</option>
                    <option value="EST" className="bg-[#0D0D24]">EST (New York)</option>
                    <option value="PST" className="bg-[#0D0D24]">PST (Los Angeles)</option>
                  </select>
                </div>
              </div>
            </div>

            <button className="px-6 py-2 bg-[#7C3AED] text-white rounded-lg font-medium hover:bg-[#7C3AED]/80">
              Save Changes
            </button>
          </motion.div>
        )}

        {activeTab === "connections" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-xl font-bold text-white mb-6">Data Connections</h2>
            
            <div className="space-y-3">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className="glass rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-white">{connection.name.charAt(0)}</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{connection.name}</h3>
                      {connection.lastSync && (
                        <p className="text-xs text-white/40">Last sync: {connection.lastSync}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {connection.status === "connected" ? (
                      <>
                        <span className="flex items-center gap-1 text-xs text-emerald-400">
                          <Check className="w-3 h-3" />
                          Connected
                        </span>
                        <button className="p-2 rounded-lg bg-white/5 text-white/50 hover:text-white">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button className="px-4 py-1.5 rounded-lg bg-[#7C3AED]/20 text-[#7C3AED] text-sm font-medium hover:bg-[#7C3AED]/30">
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button className="mt-6 flex items-center gap-2 text-sm text-white/50 hover:text-white">
              <ExternalLink className="w-4 h-4" />
              Request new integration
            </button>
          </motion.div>
        )}

        {activeTab === "notifications" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-xl font-bold text-white mb-6">Notification Preferences</h2>
            
            <div className="glass rounded-xl p-6 space-y-4">
              {[
                { id: "daily_brief", label: "Daily Morning Brief", description: "Receive your daily briefing at 7am" },
                { id: "task_reminders", label: "Task Reminders", description: "Get reminded about upcoming tasks" },
                { id: "metric_alerts", label: "Metric Alerts", description: "Notify when metrics change significantly" },
                { id: "decision_nudges", label: "Decision Nudges", description: "Remind about open decisions after 5 days" },
                { id: "streak_warnings", label: "Streak Warnings", description: "Warn before losing a streak" },
              ].map((setting) => (
                <div key={setting.id} className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white">{setting.label}</h3>
                    <p className="text-sm text-white/40">{setting.description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7C3AED]"></div>
                  </label>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "appearance" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-xl font-bold text-white mb-6">Appearance</h2>
            
            <div className="glass rounded-xl p-6">
              <h3 className="font-medium text-white mb-4">Theme</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "dark", label: "Dark Space", color: "#07071A" },
                  { id: "midnight", label: "Midnight", color: "#0D1117" },
                  { id: "deep", label: "Deep Purple", color: "#1a0a2e" },
                ].map((theme) => (
                  <button
                    key={theme.id}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all",
                      theme.id === "dark" ? "border-[#7C3AED]" : "border-white/10 hover:border-white/30"
                    )}
                  >
                    <div
                      className="w-full h-12 rounded-lg mb-2"
                      style={{ backgroundColor: theme.color }}
                    />
                    <span className="text-sm text-white">{theme.label}</span>
                  </button>
                ))}
              </div>

              <h3 className="font-medium text-white mt-6 mb-4">Accent Color</h3>
              <div className="flex items-center gap-3">
                {["#7C3AED", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"].map((color) => (
                  <button
                    key={color}
                    className={cn(
                      "w-10 h-10 rounded-full transition-all",
                      color === "#7C3AED" && "ring-2 ring-white ring-offset-2 ring-offset-[#07071A]"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "privacy" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-xl font-bold text-white mb-6">Privacy & Security</h2>
            
            <div className="glass rounded-xl p-6 space-y-6">
              <div>
                <h3 className="font-medium text-white mb-2">Two-Factor Authentication</h3>
                <p className="text-sm text-white/40 mb-3">Add an extra layer of security to your account</p>
                <button className="px-4 py-2 rounded-lg bg-[#7C3AED]/20 text-[#7C3AED] text-sm font-medium">
                  Enable 2FA
                </button>
              </div>

              <div className="border-t border-white/10 pt-6">
                <h3 className="font-medium text-white mb-2">Data Export</h3>
                <p className="text-sm text-white/40 mb-3">Download all your data in a portable format</p>
                <button className="px-4 py-2 rounded-lg bg-white/5 text-white text-sm font-medium hover:bg-white/10">
                  Export Data
                </button>
              </div>

              <div className="border-t border-white/10 pt-6">
                <h3 className="font-medium text-red-400 mb-2">Danger Zone</h3>
                <p className="text-sm text-white/40 mb-3">Permanently delete your account and all data</p>
                <button className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30">
                  Delete Account
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "data" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-xl font-bold text-white mb-6">Data Management</h2>
            
            <div className="glass rounded-xl p-6">
              <h3 className="font-medium text-white mb-4">Sync Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Last full sync</span>
                  <span className="text-white">3 minutes ago</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Data points synced</span>
                  <span className="text-white">12,847</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Storage used</span>
                  <span className="text-white">128 MB / 1 GB</span>
                </div>
              </div>

              <button className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[#7C3AED]/20 text-[#7C3AED] font-medium hover:bg-[#7C3AED]/30">
                <RefreshCw className="w-4 h-4" />
                Force Full Sync
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
