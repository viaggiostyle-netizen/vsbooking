import { notifyAdminTopic } from "@/lib/firebase/admin"

type AppointmentNotificationEvent =
  | {
      type: "created"
      clientName: string
      service: string
      date: string
      time: string
    }
  | {
      type: "modified"
      clientName: string
      service: string
      previousDate: string
      previousTime: string
      date: string
      time: string
    }
  | {
      type: "cancelled"
      clientName: string
      service: string
      date: string
      time: string
    }

export async function notifyAdminAppointmentEvent(event: AppointmentNotificationEvent) {
  let title = "Notificacion de turno"
  let body = "Hubo un cambio en los turnos."

  switch (event.type) {
    case "created":
      title = "Nuevo turno"
      body = `${event.clientName} reservo ${event.service} para el ${event.date} a las ${event.time}`
      break
    case "modified":
      title = "Turno modificado"
      body = `${event.clientName} cambio su turno de ${event.previousDate} ${event.previousTime} al ${event.date} ${event.time}`
      break
    case "cancelled":
      title = "Turno cancelado"
      body = `${event.clientName} cancelo su turno de ${event.service} el ${event.date} a las ${event.time}`
      break
  }

  return notifyAdminTopic(title, body, {
    click_action: "/admin/agenda",
    eventType: event.type,
  })
}
