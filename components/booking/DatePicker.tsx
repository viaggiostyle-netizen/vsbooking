"use client"

import { useState, useRef, useEffect } from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import Calendar from "./Calendar"

type DatePickerProps = {
  value: string
  onChange: (date: string) => void
  isBlocked: (date: string) => boolean
  className?: string
  selectedDayTone?: "accent" | "white" | "ink"
}

export default function DatePicker({
  value,
  onChange,
  isBlocked,
  className,
  selectedDayTone = "accent",
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // FIX CRÍTICO: detector correcto de click afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  function handleSelect(date: string) {
    onChange(date)
    setOpen(false)
  }

  const formatDisplayDate = (dateKey: string) => {
    if (!dateKey) return "Seleccionar fecha"
    const [y, m, d] = dateKey.split("-")
    if (!y || !m || !d) return "Seleccionar fecha"
    return `${d}/${m}/${y}`
  }

  return (
    <div ref={containerRef} className="relative w-full" onClick={(e) => e.stopPropagation()}>
      {/* Input / Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-10 w-full items-center justify-between rounded-xl border border-border/50 bg-card/60 px-3 text-[13px] font-semibold hover:bg-card/80 transition-colors outline-none cursor-pointer ${className || ""}`}
      >
        <span className={value ? "text-foreground" : "text-muted/40"}>
          {formatDisplayDate(value)}
        </span>
        <CalendarIcon size={14} className="text-muted/70" />
      </button>

      {/* Calendario Desplegable */}
      {open && (
        <div className="calendar-dropdown mt-2 w-full">
          <Calendar
            value={value}
            onSelect={handleSelect}
            isBlocked={isBlocked}
            selectedDayTone={selectedDayTone}
          />
        </div>
      )}
    </div>
  )
}
