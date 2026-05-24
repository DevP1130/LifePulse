interface Props {
  confidence: number
}

export default function ConfidenceBar({ confidence }: Props) {
  const pct = Math.round(confidence * 100)
  const color =
    pct >= 90 ? 'bg-emerald-500' :
    pct >= 80 ? 'bg-blue-500'    :
    pct >= 70 ? 'bg-amber-400'   : 'bg-slate-400'

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-slate-600 w-8 text-right">{pct}%</span>
    </div>
  )
}
