"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Tag, FileText, CheckCircle2, Percent, DollarSign, Activity } from "lucide-react"
import Modal from "@/components/ui/Modal"
import Button from "@/components/ui/Button"
import DatePicker from "@/components/booking/DatePicker"
import type { Promotion, PromotionInput, PromotionMode, PromotionType } from "@/lib/promotionUtils"

type PromotionModalProps = {
    open: boolean
    onClose: () => void
    onSave: (data: PromotionInput) => void
    editingPromotion: Promotion | null
    services: string[]
}

export default function PromotionModal({
    open,
    onClose,
    onSave,
    editingPromotion,
    services,
}: PromotionModalProps) {
    const initialState = buildInitialState(editingPromotion)
    const [name, setName] = useState(initialState.name)
    const [description, setDescription] = useState(initialState.description)
    const [type, setType] = useState<PromotionType>(initialState.type)
    const [value, setValue] = useState(initialState.value)
    const [applicationMode, setApplicationMode] = useState<PromotionMode>(initialState.applicationMode)
    const [applicableServices, setApplicableServices] = useState<string[]>(initialState.applicableServices)
    const [startDate, setStartDate] = useState(initialState.startDate)
    const [endDate, setEndDate] = useState(initialState.endDate)
    const [active, setActive] = useState(initialState.active)
    const [requiredQuantity, setRequiredQuantity] = useState(initialState.requiredQuantity ? String(initialState.requiredQuantity) : "")
    const [isSuccess, setIsSuccess] = useState(false)
    const [error, setError] = useState("")

    const handleSave = () => {
        const numericValue = Number(value)

        if (!name.trim()) return setError("El nombre es obligatorio")
        if (!description.trim()) return setError("La descripción es obligatoria")
        if (!Number.isFinite(numericValue) || numericValue <= 0) return setError("El valor debe ser mayor que 0")
        if (!startDate) return setError("Fecha inicio obligatoria")
        if (!endDate) return setError("Fecha fin obligatoria")
        if (endDate < startDate) return setError("La fecha fin debe ser mayor o igual a inicio")

        onSave({
            name: name.trim(),
            description: description.trim(),
            type,
            value: numericValue,
            applicationMode,
            applicableServices,
            startDate,
            endDate,
            active,
            requiredQuantity: requiredQuantity ? Number(requiredQuantity) : undefined,
        })

        setIsSuccess(true)
    }

    return (
        <Modal open={open} onClose={onClose} align="top" className="max-w-[540px] p-0 border-none shadow-none bg-transparent">
            <div className="glass-card animate-apple-in max-h-[90vh] overflow-y-auto no-scrollbar">
                <AnimatePresence mode="wait">
                    {!isSuccess ? (
                        <motion.div
                            key="promotion-form"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="p-5"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-[18px] font-bold tracking-tight">
                                    {editingPromotion ? "Editar Promoción" : "Nueva Promoción"}
                                </h3>
                                <button onClick={onClose} className="p-1.5 hover:bg-muted/30 rounded-full transition-colors text-muted">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Nombre */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted/50 uppercase tracking-widest ml-1">Nombre de la oferta</label>
                                    <div className="relative">
                                        <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/60" />
                                        <input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Ej: Descuento Prime"
                                            className="h-10 w-full rounded-xl border border-border/30 bg-card/30 pl-10 pr-4 text-[13px] font-semibold outline-none focus:ring-1 focus:ring-foreground/10 placeholder:text-muted/30"
                                        />
                                    </div>
                                </div>

                                {/* Descripción */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted/50 uppercase tracking-widest ml-1">Descripción</label>
                                    <div className="relative">
                                        <FileText size={14} className="absolute left-3 top-3 text-muted/60" />
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Breve detalle de la promoción..."
                                            rows={2}
                                            className="w-full rounded-xl border border-border/30 bg-card/30 pl-10 pr-4 pt-2.5 pb-2 text-[13px] font-semibold outline-none focus:ring-1 focus:ring-foreground/10 placeholder:text-muted/30 resize-none"
                                        />
                                    </div>
                                </div>

                                {/* Tipo y Valor */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted/50 uppercase tracking-widest ml-1">Tipo de descuento</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setType("percentage")}
                                                className={`h-10 rounded-xl border text-[12px] font-bold transition-all flex items-center justify-center gap-2 ${type === "percentage"
                                                    ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm"
                                                    : "border-border/30 bg-card/30 text-muted hover:bg-card/50"
                                                    }`}
                                            >
                                                <Percent size={14} />
                                                Porcentaje
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setType("fixed")}
                                                className={`h-10 rounded-xl border text-[12px] font-bold transition-all flex items-center justify-center gap-2 ${type === "fixed"
                                                    ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm"
                                                    : "border-border/30 bg-card/30 text-muted hover:bg-card/50"
                                                    }`}
                                            >
                                                <DollarSign size={14} />
                                                Monto fijo
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted/50 uppercase tracking-widest ml-1">Valor beneficio</label>
                                        <div className="relative">
                                            {type === "percentage" ? (
                                                <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/60" />
                                            ) : (
                                                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/60" />
                                            )}
                                            <input
                                                value={value}
                                                onChange={(e) => setValue(e.target.value)}
                                                placeholder="0"
                                                className="h-10 w-full rounded-xl border border-border/30 bg-card/30 pl-10 pr-4 text-[13px] font-semibold outline-none focus:ring-1 focus:ring-foreground/10 placeholder:text-muted/30"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Cantidad Mínima */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted/50 uppercase tracking-widest ml-1">Cantidad mínima sugerida (opcional)</label>
                                    <div className="relative">
                                        <Activity size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/60" />
                                        <input
                                            value={requiredQuantity}
                                            onChange={(e) => setRequiredQuantity(e.target.value)}
                                            placeholder="Ej: 2"
                                            className="h-10 w-full rounded-xl border border-border/30 bg-card/30 pl-10 pr-4 text-[13px] font-semibold outline-none focus:ring-1 focus:ring-foreground/10 placeholder:text-muted/30"
                                        />
                                    </div>
                                    <p className="text-[11px] text-muted ml-1">Si se define, la promoción solo aplicará si el cliente selecciona esta cantidad o más del servicio requerido.</p>
                                </div>

                                {/* Fechas */}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="space-y-1.5 min-w-0">
                                        <label className="text-[10px] font-bold text-muted/50 uppercase tracking-widest ml-1">Vigente desde</label>
                                        <DatePicker
                                            value={startDate}
                                            onChange={setStartDate}
                                            isBlocked={() => false}
                                            className="!h-10 !text-[13px]"
                                        />
                                    </div>
                                    <div className="space-y-1.5 min-w-0">
                                        <label className="text-[10px] font-bold text-muted/50 uppercase tracking-widest ml-1">Vigente hasta</label>
                                        <DatePicker
                                            value={endDate}
                                            onChange={setEndDate}
                                            isBlocked={() => false}
                                            className="!h-10 !text-[13px]"
                                        />
                                    </div>
                                </div>

                                {/* Modo de Aplicación y Estado */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted/50 uppercase tracking-widest ml-1">Modo de aplicación</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setApplicationMode("automatic")}
                                                className={`h-10 rounded-xl border text-[12px] font-bold transition-all ${applicationMode === "automatic"
                                                    ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm"
                                                    : "border-border/30 bg-card/30 text-muted hover:bg-card/50"
                                                    }`}
                                            >
                                                Auto
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setApplicationMode("manual")}
                                                className={`h-10 rounded-xl border text-[12px] font-bold transition-all ${applicationMode === "manual"
                                                    ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm"
                                                    : "border-border/30 bg-card/30 text-muted hover:bg-card/50"
                                                    }`}
                                            >
                                                Manual
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted/50 uppercase tracking-widest ml-1">Estado de la oferta</label>
                                        <div
                                            onClick={() => setActive(!active)}
                                            className="h-10 w-full rounded-xl border border-border/30 bg-card/30 px-3 flex items-center justify-between cursor-pointer hover:bg-card/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Activity size={14} className={active ? "text-emerald-500" : "text-muted/60"} />
                                                <span className="text-[13px] font-bold">{active ? "Activa" : "Inactiva"}</span>
                                            </div>
                                            <div className={`relative h-5 w-9 rounded-full transition-colors ${active ? "bg-emerald-500" : "bg-muted/30"}`}>
                                                <motion.span
                                                    animate={{ x: active ? 16 : 0 }}
                                                    initial={false}
                                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                    className="absolute top-[2px] left-[2px] h-4 w-4 rounded-full bg-white shadow-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Servicios */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted/50 uppercase tracking-widest ml-1">Servicios aplicables</label>
                                    <div className="rounded-xl border border-border/30 bg-card/10 p-2 max-h-[100px] overflow-y-auto no-scrollbar">
                                        <div className="flex flex-wrap gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setApplicableServices([])}
                                                className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all ${applicableServices.length === 0
                                                    ? "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_28%,transparent)]"
                                                    : "bg-surface/50 text-muted border border-border/20"
                                                    }`}
                                            >
                                                Todos
                                            </button>
                                            {services.map((service) => {
                                                const isSelected = applicableServices.includes(service)
                                                return (
                                                    <button
                                                        key={service}
                                                        type="button"
                                                        onClick={() =>
                                                            setApplicableServices((prev) =>
                                                                isSelected ? prev.filter((s) => s !== service) : [...prev, service]
                                                            )
                                                        }
                                                        className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all ${isSelected
                                                            ? "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_28%,transparent)]"
                                                            : "bg-surface/50 text-muted border border-border/20"
                                                            }`}
                                                    >
                                                        {service}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>


                            </div>

                            {error && (
                                <p className="mt-4 text-center text-[11px] font-medium text-red-500">{error}</p>
                            )}

                            <div className="mt-6 flex gap-2">
                                <Button
                                    onClick={handleSave}
                                    className="w-full h-11 rounded-2xl !border-[#2563EB] !bg-[#2563EB] !text-[#F2F2F2] hover:!bg-[#2563EB] active:scale-[0.98] transition-all text-[14px] dark:!border-[#2563EB] dark:!bg-[#2563EB] dark:!text-[#F2F2F2]"
                                >
                                    {editingPromotion ? "Actualización de oferta" : "Publicar promoción"}
                                </Button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="p-8 text-center"
                        >
                            <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-5">
                                <CheckCircle2 className="text-emerald-500" size={32} />
                            </div>
                            <h3 className="text-[22px] font-bold">¡Operación exitosa!</h3>
                            <p className="mt-3 text-[14px] text-muted leading-relaxed">
                                La promoción <strong>{name}</strong> ha sido {editingPromotion ? "actualizada" : "creada"} correctamente y está lista para aplicarse.
                            </p>

                            <Button
                                onClick={onClose}
                                className="mt-8 w-full h-12 rounded-2xl font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]"
                            >
                                Cerrar ventana
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Modal>
    )
}

function buildInitialState(editingPromotion: Promotion | null) {
    if (editingPromotion) {
        return {
            name: editingPromotion.name,
            description: editingPromotion.description,
            type: editingPromotion.type,
            value: String(editingPromotion.value),
            applicationMode: editingPromotion.applicationMode,
            applicableServices: [...editingPromotion.applicableServices],
            startDate: editingPromotion.startDate,
            endDate: editingPromotion.endDate,
            active: editingPromotion.active,
            requiredQuantity: editingPromotion.requiredQuantity || null,
        }
    }

    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })

    return {
        name: "",
        description: "",
        type: "percentage" as PromotionType,
        value: "",
        applicationMode: "automatic" as PromotionMode,
        applicableServices: [] as string[],
        startDate: today,
        endDate: today,
        active: true,
        requiredQuantity: null,
    }
}
