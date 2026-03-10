export type PromotionType = "percentage" | "fixed"
export type PromotionMode = "automatic" | "manual"

export type Promotion = {
  id: string
  name: string
  description: string
  type: PromotionType
  value: number
  applicationMode: PromotionMode
  applicableServices: string[]
  startDate: string
  endDate: string
  active: boolean
  createdAt: string
}
