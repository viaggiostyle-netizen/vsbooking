"use client"

import { motion } from "framer-motion"

export type SlotStatus = "available" | "blocked" | "booked" | "past_due"

export type Slot = {
    time: string
    status: SlotStatus
}

interface TimeSlotPickerProps {
    slots: (string | Slot)[]
    value?: string
    onChange: (time: string) => void
}

export default function TimeSlotPicker({
    slots,
    value,
    onChange,
}: TimeSlotPickerProps) {
    if (slots.length === 0) {
        return (
            <div className="py-8 text-center bg-card/50 backdrop-blur-md rounded-2xl border border-border/50">
                <p className="text-sm font-medium text-muted-foreground">No hay horarios disponibles</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full max-w-md mx-auto px-4">
            {slots.map((item) => {
                const isObject = typeof item !== "string"
                const time = isObject ? item.time : item
                const status = isObject ? item.status : "available"
                const isSelected = value === time
                const isBlocked = status !== "available"

                return (
                    <motion.button
                        key={time}
                        type="button"
                        onClick={() => {
                            if (isBlocked) return
                            if (typeof window !== "undefined" && window.navigator.vibrate) {
                                window.navigator.vibrate(5)
                            }
                            onChange(time)
                        }}
                        whileHover={!isBlocked ? {
                            scale: 1.04,
                            boxShadow: "0 10px 20px -10px rgba(0,0,0,0.15)",
                            y: -1,
                        } : {}}
                        whileTap={!isBlocked ? {
                            scale: 0.96,
                            x: [0, -1, 1, -1, 0],
                            transition: { duration: 0.1 }
                        } : {}}
                        animate={{
                            scale: isSelected ? 1.04 : 1,
                            boxShadow: isSelected
                                ? "0 15px 30px -10px rgba(0,0,0,0.3)"
                                : "0 2px 5px -2px rgba(0,0,0,0.05)",
                            opacity: status === "past_due" ? 0.2 : isBlocked ? 0.45 : 1
                        }}
                        transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 25
                        }}
                        className={`
                            relative h-12 rounded-2xl text-[14px] font-semibold border backdrop-blur-xl transition-all duration-300 overflow-hidden
                            ${isSelected
                                ? "bg-foreground text-background border-foreground z-10"
                                : status === "past_due"
                                    ? "bg-transparent text-muted/40 border-border/10 cursor-not-allowed"
                                    : status === "booked"
                                        ? "bg-muted/5 text-muted/60 border-border/20 cursor-not-allowed grayscale"
                                        : status === "blocked"
                                            ? "bg-muted/10 text-muted/50 border-border/20 cursor-not-allowed grayscale"
                                            : "bg-card/40 text-foreground border-border/60 hover:bg-card/60"
                            }
                        `}
                    >
                        {time}
                        {status === "booked" && (
                            <div className="absolute inset-x-0 top-1/2 h-[1.5px] bg-red-400/20 -rotate-[22deg] pointer-events-none" />
                        )}
                        {status === "blocked" && (
                            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-muted-foreground/30 -rotate-[22deg] pointer-events-none" />
                        )}
                    </motion.button>
                )
            })}
        </div>
    )
}
