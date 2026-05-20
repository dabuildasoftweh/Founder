"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface CalendarEvent {
  id: number
  title: string
  date: string
  time: string
  duration: number
  category: string
  urgent?: boolean
  isCountdown?: boolean
}

interface CalendarViewProps {
  events: CalendarEvent[]
}

const categoryColors: Record<string, string> = {
  work: "#7C3AED",
  content: "#06B6D4",
  personal: "#10B981",
  milestone: "#FFD700",
  urgent: "#EF4444",
}

export function CalendarView({ events }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 20)) // May 2026
  const [viewMode, setViewMode] = useState<"month" | "week">("month")
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const today = new Date(2026, 4, 20)
  
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: Date[] = []
    
    // Pad start with previous month days
    const startPadding = firstDay.getDay()
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i))
    }
    
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }
    
    // Pad end to complete grid
    const endPadding = 42 - days.length
    for (let i = 1; i <= endPadding; i++) {
      days.push(new Date(year, month + 1, i))
    }
    
    return days
  }, [currentDate])

  const getEventsForDay = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0]
    return events.filter((e) => e.date === dateStr)
  }

  const countdownEvents = events.filter((e) => e.isCountdown)
  const africaTripDays = Math.ceil(
    (new Date("2026-07-22").getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Calculate available deep work hours today
  const todayEvents = getEventsForDay(today)
  const bookedHours = todayEvents.reduce((acc, e) => acc + e.duration / 60, 0)
  const availableHours = 10 - bookedHours // Assume 10-hour work day

  // Next 3 upcoming events
  const upcomingEvents = events
    .filter((e) => new Date(e.date) >= today && !e.isCountdown)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3)

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Header with upcoming strip */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("month")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                viewMode === "month" 
                  ? "bg-[#7C3AED] text-white" 
                  : "text-white/50 hover:text-white"
              )}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                viewMode === "week" 
                  ? "bg-[#7C3AED] text-white" 
                  : "text-white/50 hover:text-white"
              )}
            >
              Week
            </button>
          </div>
        </div>

        {/* Next up strip */}
        <div className="glass rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Next Up</span>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <Clock className="w-3 h-3" />
              <span>Available today: <span className="text-emerald-400 font-medium">{availableHours.toFixed(1)}h deep work</span></span>
            </div>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 shrink-0"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: categoryColors[event.category] || "#7C3AED" }}
                />
                <span className="text-sm text-white">{event.title}</span>
                <span className="text-xs text-white/40">{event.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Countdown chips */}
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            animate={{ boxShadow: ["0 0 10px #FFD700", "0 0 20px #FFD700", "0 0 10px #FFD700"] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="px-4 py-2 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30"
          >
            <span className="text-sm font-medium text-[#FFD700]">
              AFRICA TRIP: {africaTripDays} days
            </span>
          </motion.div>
        </div>
      </div>

      {/* Calendar navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
          className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-bold text-white">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <button
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
          className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="flex-1">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-white/40 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {daysInMonth.map((day, index) => {
            const isCurrentMonth = day.getMonth() === currentDate.getMonth()
            const isToday = day.toDateString() === today.toDateString()
            const dayEvents = getEventsForDay(day)
            
            return (
              <motion.button
                key={index}
                onClick={() => setSelectedDay(day)}
                whileHover={{ scale: 1.05 }}
                className={cn(
                  "aspect-square rounded-lg p-1 flex flex-col items-start transition-all relative overflow-hidden",
                  isCurrentMonth ? "bg-white/5" : "bg-white/[0.02]",
                  isToday && "ring-2 ring-[#7C3AED]",
                  "hover:bg-white/10"
                )}
              >
                <span className={cn(
                  "text-xs font-medium mb-1",
                  isCurrentMonth ? "text-white" : "text-white/30",
                  isToday && "text-[#7C3AED]"
                )}>
                  {day.getDate()}
                </span>
                
                {/* Event indicators */}
                <div className="flex flex-wrap gap-0.5">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="w-full h-1 rounded-full"
                      style={{ backgroundColor: categoryColors[event.category] || "#7C3AED" }}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[8px] text-white/50">+{dayEvents.length - 3}</span>
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Day detail panel */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-0 top-0 bottom-0 w-96 bg-[#0D0D24] border-l border-white/10 p-6 z-50 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </h3>
                <p className="text-sm text-white/50">
                  {getEventsForDay(selectedDay).length} events
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {getEventsForDay(selectedDay).length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-sm text-white/40">No events scheduled</p>
                </div>
              ) : (
                getEventsForDay(selectedDay).map((event) => (
                  <div
                    key={event.id}
                    className="p-4 rounded-xl bg-white/5 border-l-4"
                    style={{ borderLeftColor: categoryColors[event.category] || "#7C3AED" }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white">{event.title}</span>
                      {event.urgent && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
                          Urgent
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-white/50">
                      <span>{event.time}</span>
                      <span>{event.duration} min</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
