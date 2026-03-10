export type Service = {
  id: string
  name: string
  description: string
  priceArs: number
  durationMin: number
  active: boolean
}

export type SelectedService = {
  serviceId: string
  quantity: number
}
