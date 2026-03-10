"use client"

import Link from "next/link"
import { Clock3 } from "lucide-react"
import { formatMoney } from "@/lib/utils"

type FooterBarProps = {
  label: string
  price: number
  duration: number
  href: string
}

export default function FooterBar({ label, price, duration, href }: FooterBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card px-[16px] py-[16px]">
      <div className="mx-auto flex w-full max-w-[480px] items-center justify-between">
        <div className="min-w-0 pr-[16px]">
          <p className="truncate text-[13px] font-[500] text-muted">{label}</p>
          <div className="mt-[4px] flex items-center gap-[10px]">
            <p className="text-[22px] font-[600] leading-[1] text-foreground">{formatMoney(price)}</p>
            <p className="flex items-center gap-[6px] text-[14px] text-muted">
              <Clock3 size={14} />
              {duration} min
            </p>
          </div>
        </div>
        <Link href={href} className="shrink-0">
          <button className="h-[44px] rounded-full border border-foreground bg-foreground px-[24px] text-[15px] font-[600] text-background transition hover:opacity-90">
            Continuar
          </button>
        </Link>
      </div>
    </div>
  )
}
