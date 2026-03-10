"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { TimeBlock } from "@/types/TimeBlock"
import { isTimeBlocked as isTimeBlockedUtil } from "@/lib/scheduleUtils"

type TimeBlockContextValue = {
  timeBlocks: TimeBlock[]
  createTimeBlock: (input: Omit<TimeBlock, "id" | "createdAt">) => void
  deleteTimeBlock: (id: string) => void
  isTimeBlocked: (date: string, time: string) => boolean
}

const STORAGE_KEY = "barber-time-blocks-v1"
const TimeBlockContext = createContext<TimeBlockContextValue | undefined>(undefined)

export function TimeBlockProvider({ children }: { children: React.ReactNode }) {
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>(() => readTimeBlocks())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timeBlocks))
  }, [timeBlocks])

  const value = useMemo<TimeBlockContextValue>(() => {
    return {
      timeBlocks,
      createTimeBlock: (input) =>
        setTimeBlocks((prev) => [...prev, { ...input, id: createId(), createdAt: new Date().toISOString() }]),
      deleteTimeBlock: (id) => setTimeBlocks((prev) => prev.filter((item) => item.id !== id)),
      isTimeBlocked: (date, time) => isTimeBlockedUtil(date, time, timeBlocks),
    }
  }, [timeBlocks])

  return <TimeBlockContext.Provider value={value}>{children}</TimeBlockContext.Provider>
}

export function useTimeBlocks() {
  const context = useContext(TimeBlockContext)
  if (!context) throw new Error("useTimeBlocks must be used inside TimeBlockProvider")
  return context
}

function readTimeBlocks(): TimeBlock[] {
  if (typeof window === "undefined") return []
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isTimeBlock)
  } catch {
    return []
  }
}

function isTimeBlock(value: unknown): value is TimeBlock {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<TimeBlock>
  if (typeof item.id !== "string") return false
  if (typeof item.date !== "string") return false
  if (typeof item.time !== "string") return false
  if (typeof item.reason !== "string") return false
  if (typeof item.createdAt !== "string") return false
  return true
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
