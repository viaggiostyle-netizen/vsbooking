import type { DateBlock } from "@/types/DateBlock"
import type { Settings } from "@/types/Settings"
import type { TimeBlock } from "@/types/TimeBlock"
import type { WorkBlock } from "@/types/WorkBlock"

export type OrganizationState = {
  timezone: string
  settings: Settings
  recurringBlocks: WorkBlock[]
  manualDateBlocks: DateBlock[]
  manualTimeBlocks: TimeBlock[]
}
