import { Users, UserCheck, Repeat2 } from "lucide-react"

type ClientStatsProps = {
  total: number
  attended: number
  recurrent: number
}

export default function ClientStats({ total, attended, recurrent }: ClientStatsProps) {
  const cards = [
    { label: "Total", value: total, icon: <Users size={16} /> },
    { label: "Atendidos", value: attended, icon: <UserCheck size={16} /> },
    { label: "Recurrentes", value: recurrent, icon: <Repeat2 size={16} /> },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <article key={card.label} className="h-24 rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between text-sm text-muted">
            <span>{card.label}</span>
            {card.icon}
          </div>
          <p className="text-2xl font-semibold leading-none">{card.value}</p>
        </article>
      ))}
    </div>
  )
}
