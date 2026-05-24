import type { EventType } from '../types'

const CONFIG: Record<EventType, { label: string; bg: string; text: string; dot: string }> = {
  relocation:       { label: 'Relocation',         bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
  new_baby:         { label: 'Growing Family',      bg: 'bg-pink-100',   text: 'text-pink-700',   dot: 'bg-pink-500'   },
  home_purchase:    { label: 'Home Purchase',        bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  job_change:       { label: 'Career Transition',   bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  financial_stress: { label: 'Financial Stress',    bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500'    },
  marriage:         { label: 'Marriage',             bg: 'bg-emerald-100',text: 'text-emerald-700',dot: 'bg-emerald-500'},
  divorce:          { label: 'Life Restructuring',  bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
}

interface Props {
  eventType: EventType
  size?: 'sm' | 'md'
}

export default function EventBadge({ eventType, size = 'md' }: Props) {
  const c = CONFIG[eventType]
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${c.bg} ${c.text} ${padding}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}
