"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { formatMonthYear, toDateKey } from "@/lib/date"

type RangeCalendarProps = {
    startDate: string // YYYY-MM-DD
    endDate: string   // YYYY-MM-DD
    onChange: (start: string, end: string) => void
    isBlocked?: (date: string) => boolean
}

export default function RangeCalendar({ startDate, endDate, onChange, isBlocked }: RangeCalendarProps) {
    const initialDate = useMemo(() => {
        if (startDate) return dateFromKey(startDate)
        return new Date()
    }, [startDate])

    const [monthCursor, setMonthCursor] = useState(
        () => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
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

    const handleDayClick = (key: string) => {
        if (isBlocked && isBlocked(key)) return

        if (!startDate || (startDate && endDate)) {
            // Start new selection
            onChange(key, "")
        } else {
            // We have a start date, picking end date
            if (key === startDate) {
                onChange("", "")
            } else if (key < startDate) {
                onChange(key, "")
            } else {
                onChange(startDate, key)
            }
        }
    }

    return (
        <div className="w-full rounded-[24px] border border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-4 select-none">
            <div className="mb-4 flex items-center justify-between px-1">
                <button
                    type="button"
                    onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-muted/20 transition-colors"
                >
                    <ChevronLeft size={18} />
                </button>
                <p className="text-[14px] font-bold tracking-tight text-foreground/90 capitalize">
                    {formatMonthYear(monthCursor)}
                </p>
                <button
                    type="button"
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

            <div className="grid grid-cols-7 gap-y-1 py-1">
                {days.map((day) => {
                    const key = toDateKey(day)
                    const currentMonth = day.getMonth() === monthCursor.getMonth()
                    const blocked = isBlocked ? isBlocked(key) : false

                    const isStart = key === startDate
                    const isEnd = key === endDate
                    const isInRange = startDate && endDate && key > startDate && key < endDate

                    return (
                        <div key={key} className="relative flex justify-center py-1">
                            {/* Range Background Row */}
                            {isInRange && (
                                <div className="absolute inset-y-1 left-0 right-0 bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]" />
                            )}
                            {isStart && endDate && (
                                <div className="absolute inset-y-1 left-1/2 right-0 bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]" />
                            )}
                            {isEnd && (
                                <div className="absolute inset-y-1 left-0 right-1/2 bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]" />
                            )}

                            <button
                                type="button"
                                onClick={() => handleDayClick(key)}
                                disabled={blocked}
                                className={`z-10 flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold transition-all duration-300 ${isStart || isEnd
                                        ? "bg-[color-mix(in_srgb,var(--accent)_90%,white_10%)] text-white font-bold shadow-md shadow-[rgba(37,99,235,0.28)] scale-110"
                                        : blocked
                                            ? "text-muted/10 cursor-not-allowed"
                                            : isInRange
                                                ? "text-foreground font-bold"
                                                : currentMonth
                                                    ? "text-foreground/80 hover:bg-muted/20"
                                                    : "text-muted/30"
                                    }`}
                            >
                                {day.getDate()}
                            </button>
                        </div>
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
