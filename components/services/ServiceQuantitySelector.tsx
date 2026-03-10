"use client"

import { Minus, Plus } from "lucide-react"

type ServiceQuantitySelectorProps = {
  quantity: number
  onChange: (quantity: number) => void
}

export default function ServiceQuantitySelector({ quantity, onChange }: ServiceQuantitySelectorProps) {
  if (quantity <= 0) {
    return (
      <button
        onClick={() => onChange(1)}
        className="flex h-10 w-10 aspect-square items-center justify-center rounded-full bg-[#0F172A] text-white dark:bg-[#111111] hover:scale-110 hover:shadow-lg active:scale-95 transition-all duration-200 ease-out"
      >
        <Plus size={18} strokeWidth={2} />
      </button>
    )
  }

  return (
    <div className="flex h-[36px] items-center gap-[12px] rounded-[24px] bg-background px-[6px] text-foreground">
      <button
        onClick={() => onChange(Math.max(0, quantity - 1))}
        className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-border text-foreground hover:opacity-80 transition-colors"
      >
        <Minus size={14} strokeWidth={2.5} />
      </button>
      <span className="min-w-[12px] text-center text-[14px] font-[600] leading-[1]">{quantity}</span>
      <button
        onClick={() => onChange(quantity + 1)}
        className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-border text-foreground hover:opacity-80 transition-colors"
      >
        <Plus size={14} strokeWidth={2.5} />
      </button>
    </div>
  )
}
