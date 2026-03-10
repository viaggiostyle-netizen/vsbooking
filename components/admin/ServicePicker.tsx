"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"
import type { Service } from "@/lib/admin-organization"

type ServicePickerProps = {
    services: Service[]
    selectedId: string
    onSelect: (id: string) => void
    className?: string
}

export default function ServicePicker({
    services,
    selectedId,
    onSelect,
    className = "",
}: ServicePickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const selectedService = services.find((s) => s.id === selectedId) || services[0]

    return (
        <div className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex h-11 w-full items-center justify-between rounded-xl border border-border/40 bg-card/40 px-3 text-[13px] font-semibold transition-all hover:bg-card/60 outline-none"
            >
                <span className="truncate">
                    {selectedService?.name || "Seleccionar servicio"} • ${selectedService?.priceArs.toLocaleString("es-AR") || "0"}
                </span>
                <ChevronDown
                    size={14}
                    className={`text-muted transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-[60]"
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.98 }}
                            className="absolute left-0 right-0 top-full z-[70] mt-1 overflow-hidden rounded-xl border border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/10"
                        >
                            <div className="max-h-[160px] overflow-y-auto no-scrollbar p-1">
                                {services.map((service) => (
                                    <button
                                        key={service.id}
                                        onClick={() => {
                                            onSelect(service.id)
                                            setIsOpen(false)
                                        }}
                                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold transition-all ${service.id === selectedId
                                                ? "bg-foreground text-background"
                                                : "text-foreground hover:bg-muted/50"
                                            }`}
                                    >
                                        <span>{service.name}</span>
                                        <span className={service.id === selectedId ? "text-background/80" : "text-muted"}>
                                            ${service.priceArs.toLocaleString("es-AR")}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
