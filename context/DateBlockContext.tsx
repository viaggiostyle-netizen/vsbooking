"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { DateBlock } from "@/types/DateBlock"
import { isDateBlocked as isDateBlockedUtil } from "@/lib/scheduleUtils"

type DateBlockContextValue = {
  dateBlocks: DateBlock[]
  createDateBlock: (input: Omit<DateBlock, "id" | "createdAt">) => void
  deleteDateBlock: (id: string) => void
  isDateBlocked: (date: string) => boolean
}

const STORAGE_KEY = "barber-date-blocks-v1"
const DateBlockContext = createContext<DateBlockContextValue | undefined>(undefined)

export function DateBlockProvider({ children }: { children: React.ReactNode }) {
  const [dateBlocks, setDateBlocks] = useState<DateBlock[]>(() => readDateBlocks())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dateBlocks))
  }, [dateBlocks])

  const value = useMemo<DateBlockContextValue>(() => {
    return {
      dateBlocks,
      createDateBlock: (input) =>
        setDateBlocks((prev) => [...prev, { ...input, id: createId(), createdAt: new Date().toISOString() }]),
      deleteDateBlock: (id) => setDateBlocks((prev) => prev.filter((item) => item.id !== id)),
      isDateBlocked: (date) => isDateBlockedUtil(date, dateBlocks),
    }
  }, [dateBlocks])

  return <DateBlockContext.Provider value={value}>{children}</DateBlockContext.Provider>
}

export function useDateBlocks() {
  const context = useContext(DateBlockContext)
  if (!context) throw new Error("useDateBlocks must be used inside DateBlockProvider")
  return context
}

function readDateBlocks(): DateBlock[] {
  if (typeof window === "undefined") return []
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isDateBlock)
  } catch {
    return []
  }
}

function isDateBlock(value: unknown): value is DateBlock {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<DateBlock>
  if (typeof item.id !== "string") return false
  if (typeof item.startDate !== "string") return false
  if (typeof item.endDate !== "string") return false
  if (typeof item.reason !== "string") return false
  if (typeof item.createdAt !== "string") return false
  return true
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
