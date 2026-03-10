"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, User, Phone, CheckCircle2 } from "lucide-react"
import ServicePicker from "@/components/admin/ServicePicker"
import DatePicker from "@/components/booking/DatePicker"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import type { Service } from "@/lib/admin-organization"

type AppointmentCreateModalProps = {
    open: boolean
    onClose: () => void
    services: Service[]
    availableSlots: string[]
    isDateBlocked: (dateKey: string) => boolean
    onSelectDate: (date: string) => void
    selectedDate: string
    selectedTime: string
    onSelectTime: (time: string) => void
    onSubmit: (data: { clientName: string; phone: string; serviceId: string; date: string; time: string }) => Promise<void>
    isSaving: boolean
    error?: string
}

export default function AppointmentCreateModal({
    open,
    onClose,
    services,
    availableSlots,
    isDateBlocked,
    onSelectDate,
    selectedDate,
    selectedTime,
    onSelectTime,
    onSubmit,
    isSaving,
    error,
}: AppointmentCreateModalProps) {
    const [clientName, setClientName] = useState("")
    const [phone, setPhone] = useState("")
    const [serviceId, setServiceId] = useState("")
    const [isSuccess, setIsSuccess] = useState(false)
    const selectedServiceId = serviceId || services[0]?.id || ""

    const handleClose = () => {
        setIsSuccess(false)
        setClientName("")
        setPhone("")
        setServiceId("")
        onClose()
    }

    const handleFormSubmit = async () => {
        if (!clientName || !serviceId || !selectedDate || !selectedTime) return

        await onSubmit({
            clientName,
            phone,
            serviceId: selectedServiceId,
            date: selectedDate,
            time: selectedTime,
        })

        if (!error) {
            setIsSuccess(true)
        }
    }

    return (
        <Modal open={open} onClose={handleClose} align="top" className="max-w-[360px] p-0 border-none shadow-none bg-transparent">
            <div className="glass-card animate-apple-in">
                <AnimatePresence mode="wait">
                    {!isSuccess ? (
                        <motion.div
                            key="create-form"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="p-4"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[17px] font-bold tracking-tight">Nuevo Turno</h3>
                                <button onClick={handleClose} className="p-1.5 hover:bg-muted/30 rounded-full transition-colors text-muted">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted/50 uppercase tracking-widest ml-1">Cliente</label>
                                    <div className="relative">
                                        <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/60" />
                                        <input
                                            value={clientName}
                                            onChange={(e) => setClientName(e.target.value)}
                                            placeholder="Nombre completo"
                                            className="h-9 w-full rounded-lg border border-border/30 bg-card/30 pl-9 pr-3 text-[12px] font-semibold outline-none focus:ring-1 focus:ring-foreground/10 placeholder:text-muted/30"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-muted/50 uppercase tracking-widest ml-1">Teléfono</label>
                                        <div className="relative">
                                            <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/60" />
                                            <input
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="Opcional"
                                                className="h-9 w-full rounded-lg border border-border/30 bg-card/30 pl-9 pr-3 text-[12px] font-semibold outline-none focus:ring-1 focus:ring-foreground/10 placeholder:text-muted/30"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-muted/50 uppercase tracking-widest ml-1">Servicio</label>
                                        <ServicePicker
                                            services={services}
                                            selectedId={selectedServiceId}
                                            onSelect={setServiceId}
                                            className="!h-9 !py-0 !text-[12px]"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted/50 uppercase tracking-widest ml-1">Fecha</label>
                                    <DatePicker
                                        value={selectedDate}
                                        onChange={onSelectDate}
                                        isBlocked={isDateBlocked}
                                        selectedDayTone="white"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-bold text-muted/50 uppercase tracking-widest">Horario</label>
                                        {selectedTime && <span className="text-[10px] font-black text-foreground border-b border-foreground/30">{selectedTime}</span>}
                                    </div>
                                    <div className="grid grid-cols-5 gap-1 max-h-[85px] overflow-y-auto no-scrollbar pt-1">
                                        {availableSlots.length === 0 ? (
                                            <p className="col-span-5 text-center py-2 text-[10px] text-muted italic">Selecciona una fecha</p>
                                        ) : (
                                            availableSlots.map(slot => (
                                                <button
                                                    key={slot}
                                                    onClick={() => onSelectTime(slot)}
                                                    className={`time-slot !text-[10px] !py-1.5 !px-0 ${selectedTime === slot ? 'selected' : ''}`}
                                                >
                                                    {slot}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 flex gap-2">
                                <Button
                                    disabled={isSaving || !clientName || !selectedTime}
                                    onClick={handleFormSubmit}
                                    className="w-full h-10 rounded-xl border border-[#0F172A] bg-[#0F172A] text-[#F2F2F2] hover:bg-[#0F172A] active:scale-[0.98] transition-all text-[13px] disabled:border-[#0F172A] disabled:bg-[#0F172A] disabled:opacity-70 dark:border-[#2563EB] dark:bg-[#2563EB] dark:text-[#EDEDED] dark:hover:bg-[#2563EB] dark:disabled:border-[#2563EB] dark:disabled:bg-[#2563EB]"
                                >
                                    Guardar turno
                                </Button>
                            </div>

                            {error && (
                                <p className="mt-2 text-center text-[10px] font-medium text-red-500">{error}</p>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="p-6 text-center"
                        >
                            <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="text-emerald-500" size={32} />
                            </div>
                            <h3 className="text-[22px] font-bold">¡Turno creado!</h3>
                            <p className="mt-2.5 text-[14px] text-muted leading-relaxed">
                                El turno de <strong>{clientName}</strong> ha sido agendado correctamente para el día {selectedDate} a las {selectedTime}.
                            </p>

                            <Button
                                onClick={onClose}
                                className="mt-8 w-full h-12 rounded-2xl font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]"
                            >
                                Cerrar
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Modal>
    )
}
