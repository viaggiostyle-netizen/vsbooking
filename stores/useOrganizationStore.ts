"use client"

import { create } from "zustand"
import type { DateBlock } from "@/types/DateBlock"
import type { OrganizationState } from "@/types/organization"
import type { TimeBlock } from "@/types/TimeBlock"
import type { WorkBlock } from "@/types/WorkBlock"
import { readOrganizationData } from "@/lib/admin-organization"
import { DEFAULT_SETTINGS, readSettingsStorage } from "@/lib/settings-storage"

type OrganizationStore = OrganizationState & {
  hydrateOrganization: () => void
}

const WORK_BLOCKS_KEY = "barber-work-blocks-v1"
const DATE_BLOCKS_KEY = "barber-date-blocks-v1"
const TIME_BLOCKS_KEY = "barber-time-blocks-v1"

export const useOrganizationStore = create<OrganizationStore>((set) => ({
  timezone: "America/Argentina/Buenos_Aires",
  settings: DEFAULT_SETTINGS,
  recurringBlocks: [],
  manualDateBlocks: [],
  manualTimeBlocks: [],
  hydrateOrganization: () =>
    set(() => {
      const organizationData = readOrganizationData()
      const recurringBlocks = mapSchedulesToWorkBlocks(organizationData.schedules)
      return {
        settings: readSettingsStorage(),
        recurringBlocks:
          recurringBlocks.length > 0 ? recurringBlocks : readList(WORK_BLOCKS_KEY, isWorkBlock),
        manualDateBlocks: readList(DATE_BLOCKS_KEY, isDateBlock),
        manualTimeBlocks: readList(TIME_BLOCKS_KEY, isTimeBlock),
      }
    }),
}))

function readList<T>(key: string, guard: (value: unknown) => value is T): T[] {
  if (typeof window === "undefined") return []
  const raw = localStorage.getItem(key)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(guard)
  } catch {
    return []
  }
}

function isWorkBlock(value: unknown): value is WorkBlock {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<WorkBlock>

  return (
    typeof item.id === "string" &&
    Array.isArray(item.daysOfWeek) &&
    typeof item.startTime === "string" &&
    typeof item.endTime === "string" &&
    typeof item.enabled === "boolean" &&
    typeof item.createdAt === "string"
  )
}

function isDateBlock(value: unknown): value is DateBlock {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<DateBlock>

  return (
    typeof item.id === "string" &&
    typeof item.startDate === "string" &&
    typeof item.endDate === "string" &&
    typeof item.reason === "string" &&
    typeof item.createdAt === "string"
  )
}

function isTimeBlock(value: unknown): value is TimeBlock {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<TimeBlock>

  return (
    typeof item.id === "string" &&
    typeof item.date === "string" &&
    typeof item.time === "string" &&
    typeof item.reason === "string" &&
    typeof item.createdAt === "string"
  )
}

function mapSchedulesToWorkBlocks(
  schedules: ReturnType<typeof readOrganizationData>["schedules"]
): WorkBlock[] {
  const dayToWeekNumber = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  } as const

  const blocks: WorkBlock[] = []
  Object.entries(schedules).forEach(([dayKey, daySchedule]) => {
    if (!daySchedule.active) return
    daySchedule.blocks.forEach((block) => {
      blocks.push({
        id: `${dayKey}-${block.id}`,
        daysOfWeek: [dayToWeekNumber[dayKey as keyof typeof dayToWeekNumber]],
        startTime: block.start,
        endTime: block.end,
        enabled: true,
        createdAt: new Date().toISOString(),
      })
    })
  })

  return blocks
}
