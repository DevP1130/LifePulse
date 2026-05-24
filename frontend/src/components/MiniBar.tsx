interface Props {
  value: number       // 0–1
  variant?: 'confidence' | 'risk'
}

export default function MiniBar({ value, variant = 'confidence' }: Props) {
  const pct = Math.round(value * 100)
  const color =
    variant === 'risk'
      ? pct >= 70 ? 'bg-red-400' : pct >= 50 ? 'bg-amber-400' : 'bg-emerald-400'
      : pct >= 85 ? 'bg-accent' : pct >= 70 ? 'bg-accent/70' : 'bg-slate-400'

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 tabular-nums w-7">{pct}%</span>
    </div>
  )
}
