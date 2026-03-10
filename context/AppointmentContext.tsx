"use client"

import { createContext, useContext, useEffect, useMemo, useReducer } from "react"
import {
  isCompletedStatus,
  isNoShowStatus,
  isNoShowWithNoticeStatus,
  toCanonicalAppointmentStatus,
} from "@/lib/appointment-status"
import { Appointment, AppointmentStatus } from "@/types/Appointment"

type ClientStats = {
  completed: number
  noShowWarned: number
  noShow: number
  cancelled: number
}

export type Client = {
  id: string
  name: string
  phone: string
  stats: ClientStats
  history: Appointment[]
}

type State = {
  appointments: Appointment[]
  clients: Client[]
}

type CreateAppointmentInput = Omit<Appointment, "status" | "createdAt"> & { id?: string }

type EditClientInput = {
  clientId: string
  name: string
  phone: string
}

type Action =
  | { type: "SET_APPOINTMENTS"; payload: Appointment[] }
  | { type: "CREATE_APPOINTMENT"; payload: CreateAppointmentInput }
  | { type: "UPDATE_APPOINTMENT"; payload: { id: string; patch: Partial<Omit<Appointment, "id">> } }
  | { type: "DELETE_APPOINTMENT"; payload: { id: string } }
  | { type: "SET_APPOINTMENT_STATUS"; payload: { id: string; status: AppointmentStatus } }
  | { type: "EDIT_CLIENT"; payload: EditClientInput }
  | { type: "DELETE_CLIENT"; payload: { clientId: string } }
  | { type: "LOAD_STORAGE"; payload: { appointments: Appointment[] } }

type StoreValue = {
  appointments: Appointment[]
  clients: Client[]
  setAppointments: (appointments: Appointment[]) => void
  createAppointment: (input: CreateAppointmentInput) => void
  updateAppointment: (id: string, patch: Partial<Omit<Appointment, "id">>) => void
  deleteAppointment: (id: string) => void
  setAppointmentStatus: (id: string, status: AppointmentStatus) => void
  editClient: (input: EditClientInput) => void
  deleteClient: (clientId: string) => void
  isTimeBooked: (date: string, time: string) => boolean
}

const STORAGE_KEY = "barber-local-store-v2"
const StoreContext = createContext<StoreValue | undefined>(undefined)

export function AppointmentProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { appointments: [], clients: [] })

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<{ appointments: Appointment[] }>
        const appointments = Array.isArray(parsed.appointments)
          ? parsed.appointments.map(normalizeAppointment).filter((item): item is Appointment => item !== null)
          : []
        dispatch({ type: "LOAD_STORAGE", payload: { appointments } })
      } catch (e) {
        console.error("Failed to load storage", e)
      }
    }
  }, [])

  const value = useMemo<StoreValue>(() => {
    return {
      appointments: state.appointments,
      clients: state.clients,
      setAppointments: (appointments) =>
        dispatch({ type: "SET_APPOINTMENTS", payload: appointments }),
      createAppointment: (input) => dispatch({ type: "CREATE_APPOINTMENT", payload: input }),
      updateAppointment: (id, patch) => dispatch({ type: "UPDATE_APPOINTMENT", payload: { id, patch } }),
      deleteAppointment: (id) => dispatch({ type: "DELETE_APPOINTMENT", payload: { id } }),
      setAppointmentStatus: (id, status) => dispatch({ type: "SET_APPOINTMENT_STATUS", payload: { id, status } }),
      editClient: (input) => dispatch({ type: "EDIT_CLIENT", payload: input }),
      deleteClient: (clientId) => dispatch({ type: "DELETE_CLIENT", payload: { clientId } }),
      isTimeBooked: (date, time) =>
        state.appointments.some(
          (item) => item.date === date && item.time === time && item.status !== "cancelled"
        ),
    }
  }, [state])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useAppointments() {
  const context = useContext(StoreContext)
  if (!context) throw new Error("useAppointments must be used inside AppointmentProvider")

  return {
    appointments: context.appointments,
    setAppointments: context.setAppointments,
    createAppointment: context.createAppointment,
    updateAppointment: context.updateAppointment,
    deleteAppointment: context.deleteAppointment,
    setAppointmentStatus: context.setAppointmentStatus,
    isTimeBooked: context.isTimeBooked,
  }
}

export function useClients() {
  const context = useContext(StoreContext)
  if (!context) throw new Error("useClients must be used inside AppointmentProvider")

  return {
    clients: context.clients,
    editClient: context.editClient,
    deleteClient: context.deleteClient,
  }
}

function reducer(state: State, action: Action): State {
  let nextAppointments = state.appointments

  switch (action.type) {
    case "SET_APPOINTMENTS": {
      nextAppointments = action.payload
      break
    }

    case "CREATE_APPOINTMENT": {
      nextAppointments = [
        ...state.appointments,
        {
          status: "pending",
          createdAt: new Date().toISOString(),
          ...action.payload,
          id: action.payload.id || createId(),
          promotionId: action.payload.promotionId ?? null,
        },
      ]
      break
    }

    case "UPDATE_APPOINTMENT": {
      nextAppointments = state.appointments.map((item) =>
        item.id === action.payload.id ? { ...item, ...action.payload.patch } : item
      )
      break
    }

    case "DELETE_APPOINTMENT": {
      nextAppointments = state.appointments.filter((item) => item.id !== action.payload.id)
      break
    }

    case "SET_APPOINTMENT_STATUS": {
      nextAppointments = state.appointments.map((item) =>
        item.id === action.payload.id ? { ...item, status: action.payload.status } : item
      )
      break
    }

    case "EDIT_CLIENT": {
      const target = state.clients.find((item) => item.id === action.payload.clientId)
      if (!target) return state

      const normalizedPhone = normalizePhone(action.payload.phone)
      const conflict = state.clients.some(
        (item) => item.id !== target.id && normalizePhone(item.phone) === normalizedPhone
      )
      if (conflict) return state

      nextAppointments = state.appointments.map((appointment) => {
        if (normalizePhone(appointment.clientPhone) !== normalizePhone(target.phone)) return appointment

        return {
          ...appointment,
          clientName: action.payload.name.trim() || appointment.clientName,
          clientPhone: normalizedPhone || appointment.clientPhone,
        }
      })
      break
    }

    case "DELETE_CLIENT": {
      const target = state.clients.find((item) => item.id === action.payload.clientId)
      if (!target) return state

      const targetPhone = normalizePhone(target.phone)
      nextAppointments = state.appointments.filter(
        (appointment) => normalizePhone(appointment.clientPhone) !== targetPhone
      )
      break
    }

    case "LOAD_STORAGE": {
      nextAppointments = action.payload.appointments
      break
    }

    default:
      return state
  }

  const nextState: State = {
    appointments: nextAppointments,
    clients: buildClientsFromAppointments(nextAppointments),
  }

  persistState(nextState)
  return nextState
}


function persistState(state: State) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ appointments: state.appointments }))
}

function buildClientsFromAppointments(appointments: Appointment[]): Client[] {
  const byPhone = new Map<string, Client>()

  const shouldCreate = (status: AppointmentStatus) =>
    toCanonicalAppointmentStatus(status) === "completed" ||
    toCanonicalAppointmentStatus(status) === "no_show_with_notice" ||
    toCanonicalAppointmentStatus(status) === "no_show"

  const sorted = [...appointments].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))

  sorted.forEach((appointment) => {
    const phoneKey = normalizePhone(appointment.clientPhone)
    if (!phoneKey || !shouldCreate(appointment.status)) return

    if (!byPhone.has(phoneKey)) {
      byPhone.set(phoneKey, {
        id: createId(),
        name: appointment.clientName,
        phone: phoneKey,
        stats: { completed: 0, noShowWarned: 0, noShow: 0, cancelled: 0 },
        history: [],
      })
    }
  })

  sorted.forEach((appointment) => {
    const phoneKey = normalizePhone(appointment.clientPhone)
    if (!phoneKey) return

    const client = byPhone.get(phoneKey)
    if (!client) return

    if (isCompletedStatus(appointment.status)) client.stats.completed += 1
    if (isNoShowWithNoticeStatus(appointment.status)) {
      client.stats.noShowWarned += 1
      client.stats.cancelled += 1
    }
    if (isNoShowStatus(appointment.status)) client.stats.noShow += 1
    if (toCanonicalAppointmentStatus(appointment.status) === "cancelled") {
      client.stats.cancelled += 1
    }

    client.history.push(appointment)
    client.name = appointment.clientName
    client.phone = phoneKey
  })

  return [...byPhone.values()].sort((a, b) => a.name.localeCompare(b.name, "es"))
}

function normalizeAppointment(value: unknown): Appointment | null {
  if (!value || typeof value !== "object") return null

  const item = value as Partial<Appointment>
  if (typeof item.id !== "string") return null
  if (typeof item.clientName !== "string") return null
  if (typeof item.clientPhone !== "string") return null
  if (typeof item.service !== "string") return null
  if (typeof item.price !== "number") return null
  if (typeof item.date !== "string") return null
  if (typeof item.time !== "string") return null

  if (
    item.status !== "pending" &&
    item.status !== "completed" &&
    item.status !== "no_show_with_notice" &&
    item.status !== "no_show" &&
    item.status !== "no_vino_aviso" &&
    item.status !== "no_vino_no_aviso" &&
    item.status !== "cancelled"
  ) {
    return null
  }

  const originalPrice = typeof item.originalPrice === "number" ? item.originalPrice : item.price
  const finalPrice = typeof item.finalPrice === "number" ? item.finalPrice : item.price

  return {
    id: item.id,
    bookingGroupId: typeof item.bookingGroupId === "string" ? item.bookingGroupId : item.id,
    clientName: item.clientName,
    clientPhone: item.clientPhone,
    clientEmail: typeof item.clientEmail === "string" ? item.clientEmail : "",
    serviceId: typeof item.serviceId === "string" ? item.serviceId : "",
    service: item.service,
    durationMin: typeof item.durationMin === "number" ? item.durationMin : 0,
    price: item.price,
    promotionId: item.promotionId ?? null,
    originalPrice,
    finalPrice,
    date: item.date,
    time: item.time,
    status: item.status,
    createdAt:
      typeof item.createdAt === "string"
        ? item.createdAt
        : `${item.date}T${item.time || "00:00"}:00`,
  }
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "")
  if (!digits) return ""

  let normalized = digits
  while (normalized.startsWith("549549")) {
    normalized = normalized.slice(3)
  }

  return normalized
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
