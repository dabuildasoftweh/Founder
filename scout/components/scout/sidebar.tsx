"use client"

import { motion, AnimatePresence } from "framer-motion"
import { 
  Home, Calendar, CheckSquare, Lightbulb, Zap, 
  BarChart3, Building2, MessageSquare, Wrench, Settings,
  ChevronLeft, ChevronRight, Radio
} from "lucide-react"
import { cn } from "@/lib/utils"

export type NavItem = 
  | "dashboard" 
  | "calendar" 
  | "todo" 
  | "ideas" 
  | "decisions"
  | "analysis"
  | "businesses"
  | "assistant"
  | "tools"
  | "settings"

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  activeItem: NavItem
  onNavigate: (item: NavItem) => void
  user: {
    name: string
    level: number
    levelTitle: string
    avatar?: string
  }
  lastSync: string
}

const mainNavItems = [
  { id: "dashboard" as NavItem, icon: Home, label: "Dashboard" },
  { id: "calendar" as NavItem, icon: Calendar, label: "Calendar" },
  { id: "todo" as NavItem, icon: CheckSquare, label: "To-Do" },
  { id: "ideas" as NavItem, icon: Lightbulb, label: "Ideas" },
  { id: "decisions" as NavItem, icon: Zap, label: "Decisions" },
]

const intelligenceNavItems = [
  { id: "analysis" as NavItem, icon: BarChart3, label: "Deep Analysis" },
  { id: "businesses" as NavItem, icon: Building2, label: "Businesses" },
  { id: "assistant" as NavItem, icon: MessageSquare, label: "AI Assistant" },
]

const toolsNavItems = [
  { id: "tools" as NavItem, icon: Wrench, label: "Quick Tools" },
  { id: "settings" as NavItem, icon: Settings, label: "Settings" },
]

export function Sidebar({ collapsed, onToggle, activeItem, onNavigate, user, lastSync }: SidebarProps) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 60 : 220 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-white/[0.02] border-r border-white/[0.06]"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-3 h-3 rounded-full bg-[#7C3AED]"
            style={{ boxShadow: "0 0 10px #7C3AED" }}
          />
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-bold text-white tracking-widest"
              >
                SCOUT
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {/* Main section */}
        <NavSection label="MAIN" collapsed={collapsed}>
          {mainNavItems.map((item) => (
            <NavButton
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeItem === item.id}
              collapsed={collapsed}
              onClick={() => onNavigate(item.id)}
            />
          ))}
        </NavSection>

        {/* Intelligence section */}
        <NavSection label="INTELLIGENCE" collapsed={collapsed}>
          {intelligenceNavItems.map((item) => (
            <NavButton
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeItem === item.id}
              collapsed={collapsed}
              onClick={() => onNavigate(item.id)}
            />
          ))}
        </NavSection>

        {/* Tools section */}
        <NavSection label="TOOLS" collapsed={collapsed}>
          {toolsNavItems.map((item) => (
            <NavButton
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeItem === item.id}
              collapsed={collapsed}
              onClick={() => onNavigate(item.id)}
            />
          ))}
        </NavSection>
      </nav>

      {/* User section */}
      <div className="border-t border-white/[0.06] p-3">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="relative">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] flex items-center justify-center text-white font-bold text-sm">
              {user.name.charAt(0)}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#07071A] flex items-center justify-center">
              <span className="text-[8px] font-bold text-[#7C3AED]">{user.level}</span>
            </div>
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex-1 min-w-0"
              >
                <div className="text-sm font-medium text-white truncate">{user.name}</div>
                <div className="text-xs text-white/40">{user.levelTitle}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Live indicator */}
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-3 flex items-center gap-2"
            >
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flex items-center gap-1"
              >
                <Radio className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-medium text-emerald-400 uppercase">Live</span>
              </motion.div>
              <span className="text-[10px] text-white/30">Synced {lastSync}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute top-20 -right-3 w-6 h-6 rounded-full bg-[#0D0D24] border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-[#7C3AED]/50 transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </motion.aside>
  )
}

function NavSection({ 
  label, 
  collapsed, 
  children 
}: { 
  label: string
  collapsed: boolean
  children: React.ReactNode 
}) {
  return (
    <div className="mb-4">
      <AnimatePresence mode="wait">
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 mb-2"
          >
            <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
              {label}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="space-y-1 px-2">
        {children}
      </div>
    </div>
  )
}

function NavButton({
  icon: Icon,
  label,
  active,
  collapsed,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active: boolean
  collapsed: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative group",
        active 
          ? "bg-[#7C3AED]/10 text-white" 
          : "text-white/50 hover:text-white hover:bg-white/5",
        collapsed && "justify-center px-0"
      )}
    >
      {/* Active indicator */}
      {active && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-[#7C3AED]"
          style={{ boxShadow: "0 0 10px #7C3AED" }}
        />
      )}
      
      <Icon className={cn("w-5 h-5 shrink-0", active && "text-[#7C3AED]")} />
      
      <AnimatePresence mode="wait">
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="text-sm font-medium"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Tooltip for collapsed state */}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 rounded-md bg-[#0D0D24] border border-white/10 text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </button>
  )
}
