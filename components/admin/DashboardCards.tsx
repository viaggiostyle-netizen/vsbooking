"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"

type DashboardCard = {
  id: string
  title: string
  value: string
  subtitle: string
  icon?: ReactNode
}

type DashboardCardsProps = {
  cards: DashboardCard[]
}

export default function DashboardCards({ cards }: DashboardCardsProps) {
  const reduceMotion = useReducedMotion()

  const container = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduceMotion ? 0 : 0.3,
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: reduceMotion ? 0 : 0.08,
        delayChildren: reduceMotion ? 0 : 0.04,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduceMotion ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] },
    },
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      {cards.map((card) => (
        <motion.article
          key={card.id}
          variants={item}
          whileHover={reduceMotion ? undefined : { y: -4 }}
          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
          className="card min-h-[140px] rounded-2xl border border-surface bg-surface p-6 transition-shadow duration-200 hover:shadow-[0_16px_30px_rgba(0,0,0,0.15)]"
        >
          <div className="mb-2 flex items-center justify-between text-sm text-muted">
            <span>{card.title}</span>
            {card.icon}
          </div>
          <p className="text-[16px] font-medium leading-none">{card.value}</p>
          <p className="mt-1 text-[12px] font-normal text-muted">{card.subtitle}</p>
        </motion.article>
      ))}
    </motion.div>
  )
}
