"use client"

import { create } from "zustand"
import { buildConsecutiveTimes } from "@/lib/availability"
import { calculateFinalPrice } from "@/lib/pricing"
import {
  fetchAppointmentsFromSupabase,
  patchAppointmentInSupabase,
  upsertAppointmentsToSupabase,
} from "@/lib/supabase/appointments"
import { rememberLocalAppointmentMutation } from "@/lib/notifications/in-app-appointment-events"
import { createId } from "@/lib/utils"
import type { Appointment, BookingPayload } from "@/types/Appointment"
import type { Promotion } from "@/types/promotion"
import type { Service } from "@/types/service"
import { validateBookingContact } from "@/lib/validation/booking"

type CreateAppointmentArgs = {
  payload: BookingPayload
  promotions: Promotion[]
  groupId?: string
  manualActiveIds?: string[]
}

type StoreState = {
  appointments: Appointment[]
  lastCreatedGroupId: string | null
  hydrateAppointments: () => void
  replaceAppointments: (appointments: Appointment[]) => void
  createAppointment: (args: CreateAppointmentArgs) => Promise<string>
  findByEmail: (email: string) => Appointment[]
  cancelAppointment: (id: string) => void
  modifyAppointment: (id: string, patch: { date: string; time: string }) => void
  getBookingGroup: (groupId: string) => Appointment[]
}

type AdminAppointment = {
  id: string
  clientName: string
  clientPhone: string
  service: string
  price: number
  promotionId: string | null
  originalPrice: number
  finalPrice: number
  date: string
  time: string
  status: Appointment["status"]
  createdAt: string
}



const PUBLIC_KEY = "barber-public-appointments-v1"
const ADMIN_KEY = "barber-local-store-v2"

export const useAppointmentsStore = create<StoreState>((set, get) => ({
  appointments: [],
  lastCreatedGroupId: null,
  hydrateAppointments: () => {
    const local = readPublicAppointments()
    set({ appointments: local })

    void fetchAppointmentsFromSupabase().then((remote) => {
      if (!remote) return
      persistPublicAppointments(remote)
      syncWithAdminAppointments(remote)
      set({ appointments: remote })
    })
  },
  replaceAppointments: (appointments) => {
    persistPublicAppointments(appointments)
    syncWithAdminAppointments(appointments)
    set({ appointments })
  },
  createAppointment: async ({ payload, promotions, groupId, manualActiveIds = [] }) => {
    const bookingGroupId = groupId ?? createId()

    const serviceDurations = payload.services.map((service) => service.durationMin)
    const times = buildConsecutiveTimes(payload.startTime, serviceDurations)

    const created = payload.services.map((service, index) => {
      const pricing = calculateFinalPrice(
        service.priceArs,
        promotions,
        service.serviceName,
        payload.date,
        service.groupQuantity || 1,
        manualActiveIds
      )

      return {
        id: createId(),
        bookingGroupId,
        clientName: payload.clientName,
        clientPhone: payload.clientPhone,
        clientEmail: payload.clientEmail.toLowerCase().trim(),
        serviceId: service.serviceId,
        service: service.serviceName,
        durationMin: service.durationMin,
        price: pricing.finalPrice,
        originalPrice: pricing.originalPrice,
        finalPrice: pricing.finalPrice,
        promotionId: pricing.promotionId,
        date: payload.date,
        time: times[index],
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      }
    })

    const next = [...get().appointments, ...created]
    created.forEach((appointment) => {
      rememberLocalAppointmentMutation({
        eventType: "created",
        appointmentId: appointment.id,
        bookingGroupId: appointment.bookingGroupId,
        date: appointment.date,
        time: appointment.time,
      })
    })
    persistPublicAppointments(next)
    syncWithAdminAppointments(next)
    set({
      appointments: next,
      lastCreatedGroupId: bookingGroupId,
    })

    try {
      await upsertAppointmentsToSupabase(created)
    } catch (error) {
      const createdIds = new Set(created.map((item) => item.id))
      const rollback = get().appointments.filter((item) => !createdIds.has(item.id))
      persistPublicAppointments(rollback)
      syncWithAdminAppointments(rollback)
      set({ appointments: rollback, lastCreatedGroupId: null })
      throw error
    }

    return bookingGroupId
  },
  findByEmail: (email) => {
    const normalized = email.toLowerCase().trim()
    if (!normalized) return []
    return get()
      .appointments.filter((appointment) => appointment.clientEmail === normalized)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
  },
  cancelAppointment: (id) => {
    const current = get().appointments.find((appointment) => appointment.id === id)
    if (current) {
      rememberLocalAppointmentMutation({
        eventType: "cancelled",
        appointmentId: current.id,
        bookingGroupId: current.bookingGroupId,
        date: current.date,
        time: current.time,
      })
    }
    const next = get().appointments.map((appointment) =>
      appointment.id === id ? { ...appointment, status: "cancelled" as const } : appointment
    )
    persistPublicAppointments(next)
    syncWithAdminAppointments(next)
    void patchAppointmentInSupabase(id, { status: "cancelled" }, { clientEmail: current?.clientEmail })
    set({ appointments: next })
  },
  modifyAppointment: (id, patch) => {
    const current = get().appointments.find((appointment) => appointment.id === id)
    if (current) {
      rememberLocalAppointmentMutation({
        eventType: "modified",
        appointmentId: current.id,
        bookingGroupId: current.bookingGroupId,
        date: patch.date,
        time: patch.time,
      })
    }
    const next = get().appointments.map((appointment) =>
      appointment.id === id ? { ...appointment, date: patch.date, time: patch.time } : appointment
    )
    persistPublicAppointments(next)
    syncWithAdminAppointments(next)
    void patchAppointmentInSupabase(id, patch, { clientEmail: current?.clientEmail })
    set({ appointments: next })
  },
  getBookingGroup: (groupId) =>
    get()
      .appointments.filter((appointment) => appointment.bookingGroupId === groupId)
      .sort((a, b) => a.time.localeCompare(b.time)),
}))
export function buildBookingPayload(
  client: { name: string; phone: string; email: string },
  date: string,
  startTime: string,
  selectedServices: Array<{ service: Service; quantity: number }>
): BookingPayload {
  const validation = validateBookingContact({
    name: client.name,
    phone: client.phone,
    email: client.email,
  })

  if (!validation.ok) {
    const message =
      (!validation.name.valid && validation.name.message) ||
      (!validation.phone.valid && validation.phone.message) ||
      (!validation.email.valid && validation.email.message) ||
      "Datos de cliente invalidos."
    throw new Error(message)
  }

  const services = selectedServices.flatMap(({ service, quantity }) =>
    Array.from({ length: quantity }, () => ({
      serviceId: service.id,
      serviceName: service.name,
      durationMin: service.durationMin,
      priceArs: service.priceArs,
      groupQuantity: quantity,
    }))
  )

  return {
    clientName: validation.name.normalized,
    clientPhone: validation.phone.normalized,
    clientEmail: validation.email.normalized,
    date,
    startTime,
    services,
  }
}

function readPublicAppointments(): Appointment[] {
  if (typeof window === "undefined") return []
  const raw = localStorage.getItem(PUBLIC_KEY)
  const fromPublic = raw ? parsePublicAppointments(raw) : []
  const fromAdmin = readAdminAppointments()

  const map = new Map<string, Appointment>()
  fromAdmin.forEach((item) => map.set(item.id, item))
  fromPublic.forEach((item) => map.set(item.id, item))

  return [...map.values()]
}

function parsePublicAppointments(raw: string) {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isPublicAppointment)
  } catch {
    return []
  }
}

function persistPublicAppointments(appointments: Appointment[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(PUBLIC_KEY, JSON.stringify(appointments))
}

function syncWithAdminAppointments(publicAppointments: Appointment[]) {
  if (typeof window === "undefined") return

  const adminAppointments = publicAppointments.map(toAdminAppointment)

  localStorage.setItem(
    ADMIN_KEY,
    JSON.stringify({
      appointments: adminAppointments,
    })
  )
}

function toAdminAppointment(appointment: Appointment): AdminAppointment {
  return {
    id: appointment.id,
    clientName: appointment.clientName,
    clientPhone: appointment.clientPhone,
    service: appointment.service,
    price: appointment.finalPrice,
    promotionId: appointment.promotionId,
    originalPrice: appointment.originalPrice,
    finalPrice: appointment.finalPrice,
    date: appointment.date,
    time: appointment.time,
    status: appointment.status,
    createdAt: appointment.createdAt,
  }
}

function isPublicAppointment(value: unknown): value is Appointment {
  if (!value || typeof value !== "object") return false
  const appointment = value as Partial<Appointment>

  return (
    typeof appointment.id === "string" &&
    typeof appointment.bookingGroupId === "string" &&
    typeof appointment.clientName === "string" &&
    typeof appointment.clientPhone === "string" &&
    typeof appointment.clientEmail === "string" &&
    typeof appointment.serviceId === "string" &&
    typeof appointment.service === "string" &&
    typeof appointment.durationMin === "number" &&
    typeof appointment.price === "number" &&
    typeof appointment.originalPrice === "number" &&
    typeof appointment.finalPrice === "number" &&
    typeof appointment.date === "string" &&
    typeof appointment.time === "string" &&
    typeof appointment.createdAt === "string" &&
    (appointment.status === "pending" ||
      appointment.status === "completed" ||
      appointment.status === "no_show_with_notice" ||
      appointment.status === "no_show" ||
      appointment.status === "no_vino_aviso" ||
      appointment.status === "no_vino_no_aviso" ||
      appointment.status === "cancelled")
  )
}

function readAdminAppointments(): Appointment[] {
  if (typeof window === "undefined") return []
  const raw = localStorage.getItem(ADMIN_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as { appointments?: unknown[] }
    if (!Array.isArray(parsed.appointments)) return []

    return parsed.appointments
      .map((item) => normalizeAdminAppointment(item))
      .filter((item): item is Appointment => item !== null)
  } catch {
    return []
  }
}

function normalizeAdminAppointment(value: unknown): Appointment | null {
  if (!value || typeof value !== "object") return null
  const item = value as Partial<AdminAppointment>
  if (
    typeof item.id !== "string" ||
    typeof item.clientName !== "string" ||
    typeof item.clientPhone !== "string" ||
    typeof item.service !== "string" ||
    typeof item.price !== "number" ||
    typeof item.originalPrice !== "number" ||
    typeof item.finalPrice !== "number" ||
    typeof item.date !== "string" ||
    typeof item.time !== "string" ||
    typeof item.createdAt !== "string" ||
    !item.status
  ) {
    return null
  }

  return {
    id: item.id,
    bookingGroupId: item.id,
    clientName: item.clientName,
    clientPhone: item.clientPhone,
    clientEmail: "",
    serviceId: item.service,
    service: item.service,
    durationMin: 40,
    price: item.finalPrice,
    originalPrice: item.originalPrice,
    finalPrice: item.finalPrice,
    promotionId: item.promotionId ?? null,
    date: item.date,
    time: item.time,
    status: item.status,
    createdAt: item.createdAt,
  }
}
