"use client"

import { useState, useRef, useEffect } from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { createPortal } from "react-dom"
import RangeCalendar from "./RangeCalendar"
import { motion } from "framer-motion"

type RangeDatePickerProps = {
    startDate: string
    endDate: string
    onChange: (start: string, end: string) => void
    isBlocked?: (date: string) => boolean
    className?: string
    placeholder?: string
}

export default function RangeDatePicker({ startDate, endDate, onChange, isBlocked, className, placeholder }: RangeDatePickerProps) {
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const [panelStyle, setPanelStyle] = useState<{
        top: number
        left: number
        width: number
    } | null>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node
            const clickedInsideTrigger = containerRef.current?.contains(target)
            const clickedInsidePanel = panelRef.current?.contains(target)

            if (!clickedInsideTrigger && !clickedInsidePanel) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    useEffect(() => {
        if (!open) return

        const updatePanelPosition = () => {
            const trigger = buttonRef.current
            if (!trigger) return

            const rect = trigger.getBoundingClientRect()
            const viewportWidth = window.innerWidth
            const viewportHeight = window.innerHeight

            const desktop = viewportWidth >= 640
            const width = desktop ? 320 : Math.min(320, viewportWidth - 24)
            const estimatedHeight = 430
            const spaceBelow = viewportHeight - rect.bottom
            const shouldOpenUp = spaceBelow < estimatedHeight && rect.top > estimatedHeight

            const left = Math.min(
                Math.max(12, rect.left + rect.width / 2 - width / 2),
                viewportWidth - width - 12
            )

            const top = shouldOpenUp
                ? Math.max(8, rect.top - estimatedHeight - 8)
                : Math.max(
                    8,
                    Math.min(Math.max(8, viewportHeight - estimatedHeight - 8), rect.bottom + 8)
                )

            setPanelStyle({ top, left, width })
        }

        updatePanelPosition()

        window.addEventListener("resize", updatePanelPosition)
        window.addEventListener("scroll", updatePanelPosition, true)

        return () => {
            window.removeEventListener("resize", updatePanelPosition)
            window.removeEventListener("scroll", updatePanelPosition, true)
        }
    }, [open])

    const formatDate = (dateKey: string) => {
        if (!dateKey) return ""
        const [y, m, d] = dateKey.split("-")
        return `${d}/${m}/${y}`
    }

    const displayText = startDate && endDate
        ? `${formatDate(startDate)} - ${formatDate(endDate)}`
        : startDate
            ? `Desde ${formatDate(startDate)}...`
            : placeholder || "Seleccionar rango de fechas"

    return (
        <div ref={containerRef} className="relative w-full">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className={`flex h-10 w-full items-center justify-between rounded-xl border border-border/30 bg-card/30 px-4 text-[13px] font-bold text-foreground transition-all hover:bg-card/50 ${className || ""}`}
            >
                <span className={startDate ? "text-foreground" : "text-muted/40"}>
                    {displayText}
                </span>
                <CalendarIcon size={14} className="text-muted/60" />
            </button>

            {open && typeof document !== "undefined" && panelStyle &&
                createPortal(
                    <>
                        <div className="fixed inset-0 z-[90] bg-black/5 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
                        <motion.div
                            ref={panelRef}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: "spring", damping: 20, stiffness: 300 }}
                            className="fixed z-[100] overflow-auto rounded-3xl border border-border/50 bg-card/90 shadow-2xl backdrop-blur-2xl max-h-[600px]"
                            style={{ top: panelStyle.top, left: panelStyle.left, width: panelStyle.width }}
                        >
                            <div className="p-2">
                                <div className="flex items-center justify-between px-3 py-2">
                                    <p className="text-[11px] font-bold text-muted/50 uppercase tracking-widest leading-none">Seleccionar Rango</p>
                                    {startDate && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onChange("", ""); }}
                                            className="text-[10px] font-bold text-red-500/60 hover:text-red-500 transition-colors"
                                        >
                                            Limpiar
                                        </button>
                                    )}
                                </div>
                                <RangeCalendar
                                    startDate={startDate}
                                    endDate={endDate}
                                    onChange={onChange}
                                    isBlocked={isBlocked}
                                />

                                {startDate && endDate && (
                                    <div className="p-2">
                                        <button
                                            onClick={() => setOpen(false)}
                                            className="flex h-9 w-full items-center justify-center rounded-xl bg-[var(--accent)] text-white text-[11px] font-bold uppercase tracking-widest transition-all hover:bg-[var(--accent-strong)] active:scale-[0.98]"
                                        >
                                            Aplicar Rango
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>,
                    document.body
                )}
        </div>
    )
}
