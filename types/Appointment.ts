export type AppointmentStatus =
  | "pending"
  | "completed"
  | "no_show_with_notice"
  | "no_show"
  | "no_vino_aviso"
  | "no_vino_no_aviso"
  | "cancelled"

export type Appointment = {
  id: string
  bookingGroupId: string
  clientName: string
  clientPhone: string
  clientEmail: string
  serviceId: string
  service: string
  durationMin: number
  price: number
  originalPrice: number
  finalPrice: number
  promotionId: string | null
  date: string
  time: string
  status: AppointmentStatus
  createdAt: string
}

export type BookingPayload = {
  clientName: string
  clientPhone: string
  clientEmail: string
  date: string
  startTime: string
  services: Array<{
    serviceId: string
    serviceName: string
    durationMin: number
    priceArs: number
  }>
}
