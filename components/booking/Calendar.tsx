"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { formatMonthYear, toDateKey } from "@/lib/date"

type CalendarProps = {
  value: string
  onSelect: (date: string) => void
  isBlocked: (date: string) => boolean
  selectedDayTone?: "accent" | "white" | "ink"
}

export default function Calendar({
  value,
  onSelect,
  isBlocked,
  selectedDayTone = "accent",
}: CalendarProps) {
  const selectedDate = useMemo(() => dateFromKey(value), [value])
  const [monthCursor, setMonthCursor] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  )

  const days = useMemo(() => {
    const firstDay = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1)
    const offset = (firstDay.getDay() + 6) % 7
    const start = new Date(firstDay)
    start.setDate(start.getDate() - offset)

    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start)
      day.setDate(start.getDate() + index)
      return day
    })
  }, [monthCursor])

  return (
    <div className="w-full rounded-[24px] border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between px-1">
        <button
          onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-muted/20 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-[14px] font-bold tracking-tight text-foreground/90 capitalize">{formatMonthYear(monthCursor)}</p>
        <button
          onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-muted/20 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mb-3 grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted/30">
        {"lu ma mi ju vi sa do".split(" ").map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-2.5 gap-x-1.5 py-1">
        {days.map((day) => {
          const key = toDateKey(day)
          const currentMonth = day.getMonth() === monthCursor.getMonth()
          const blocked = isBlocked(key)
          const selected = key === value
          const selectedClass =
            selectedDayTone === "white"
              ? "scale-105 font-bold bg-white text-[#0f172a] shadow-[0_6px_16px_rgba(0,0,0,0.2)]"
              : selectedDayTone === "ink"
                ? "scale-105 font-bold bg-[#0f172a] text-white shadow-[0_8px_20px_rgba(15,23,42,0.32)] dark:bg-[#F2F2F2] dark:text-[#111111] dark:shadow-[0_8px_20px_rgba(242,242,242,0.22)]"
                : "scale-105 font-bold bg-[var(--accent)] text-white shadow-[0_8px_20px_rgba(37,99,235,0.28)] dark:bg-[#F2F2F2] dark:text-[#111111] dark:shadow-[0_8px_20px_rgba(242,242,242,0.22)]"

          return (
            <button
              key={key}
              onClick={() => !blocked && onSelect(key)}
              disabled={blocked}
              className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold transition-all duration-300 ${selected
                ? selectedClass
                : blocked
                  ? "text-muted/10 cursor-not-allowed"
                  : currentMonth
                    ? "text-foreground/80 hover:bg-muted/20"
                    : "text-muted/30"
                }`}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number)
  if (!year || !month || !day) return new Date()
  return new Date(year, month - 1, day)
}
