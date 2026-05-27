import type { EventSignal } from '../types'

interface Props {
  signals: EventSignal[]
}

const TYPE_ICON: Record<string, string> = {
  TRUCK_RENTAL: '🚚', STORAGE_UNIT: '📦', ADDRESS_CHANGE: '📬',
  SHIPPING_SERVICE: '📮', NEW_UTILITY: '⚡', TEMP_HOUSING: '🏨',
  FURNITURE: '🛋️', NEW_CITY_MERCHANT: '📍',
  MATERNITY_STORE: '🤰', BABY_REGISTRY: '🍼', BABY_GEAR: '🧸',
  BABY_FURNITURE: '🪑', HOSPITAL_BILL: '🏥', PEDIATRICIAN: '👶',
  CHILDCARE_DEPOSIT: '🏫',
  ENGAGEMENT_RING: '💍', WEDDING_VENUE: '🏛️', WEDDING_PLANNER: '📋',
  BRIDAL_STORE: '👰', CATERING_DEPOSIT: '🍽️', HONEYMOON_BOOKING: '✈️',
  WEDDING_REGISTRY: '🎁',
  HOME_INSPECTION: '🔍', APPRAISAL_FEE: '📊', REAL_ESTATE_ATTY: '⚖️',
  DOWN_PAYMENT: '🏠', HOME_IMPROVEMENT: '🔨',
}

function shortLabel(sig: EventSignal): string {
  const name = sig.merchant.split(' — ')[0].split(' — ')[0]
  const words = name.split(' ')
  return words.slice(0, 2).join(' ')
}

export default function SignalTimeline({ signals }: Props) {
  if (signals.length === 0) return null

  const DAYS = 90
  const today = new Date()
  const rangeStart = new Date(today)
  rangeStart.setDate(today.getDate() - DAYS)

  const sorted = [...signals].sort(
    (a, b) => new Date(a.detected_date).getTime() - new Date(b.detected_date).getTime()
  )

  const pct = (dateStr: string) => {
    const ms = new Date(dateStr).getTime() - rangeStart.getTime()
    const total = today.getTime() - rangeStart.getTime()
    return Math.max(1, Math.min(99, (ms / total) * 100))
  }

  // Determine if signals are clustered (span < 14 days = tight pattern)
  const firstMs = new Date(sorted[0].detected_date).getTime()
  const lastMs = new Date(sorted[sorted.length - 1].detected_date).getTime()
  const spanDays = (lastMs - firstMs) / 86_400_000
  const isClustered = signals.length >= 3 && spanDays < 14

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Signal Pattern</p>
        {isClustered && (
          <span className="text-[10px] font-semibold px-2 py-0.5 bg-accent/10 text-accent rounded-full">
            Clustered — strong pattern
          </span>
        )}
      </div>

      {/* Timeline container with room for labels above and below */}
      <div className="relative" style={{ height: '72px' }}>
        {/* Horizontal axis line — vertically centered */}
        <div className="absolute left-0 right-0" style={{ top: '36px' }}>
          <div className="relative h-px bg-gray-200">
            {/* 30-day tick */}
            <div className="absolute h-2 w-px bg-gray-300" style={{ left: '33.3%', top: '-4px' }} />
            {/* 60-day tick */}
            <div className="absolute h-2 w-px bg-gray-300" style={{ left: '66.6%', top: '-4px' }} />
            {/* Today end-cap */}
            <div className="absolute w-1.5 h-1.5 rounded-full bg-gray-300" style={{ right: '-3px', top: '-3px' }} />
          </div>
        </div>

        {/* Signal dots + labels */}
        {sorted.map((sig, idx) => {
          const left = pct(sig.detected_date)
          const above = idx % 2 === 0
          const icon = TYPE_ICON[sig.signal_type] ?? '🔍'
          const label = shortLabel(sig)

          return (
            <div
              key={sig.id}
              className="absolute -translate-x-1/2"
              style={{ left: `${left}%`, top: '36px' }}
            >
              {/* Dot */}
              <div className="relative -translate-y-1/2 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-accent ring-2 ring-white shadow-sm z-10" />
              </div>

              {/* Label — alternates above and below the axis */}
              <div
                className={`absolute -translate-x-1/2 left-1/2 flex flex-col items-center gap-0.5 ${
                  above ? 'bottom-full mb-1' : 'top-full mt-1'
                }`}
              >
                <span className="text-sm leading-none">{icon}</span>
                <span className="text-[9px] font-medium text-gray-500 whitespace-nowrap leading-tight">
                  {label}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Date axis labels */}
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
        <span>90d ago</span>
        <span>60d ago</span>
        <span>30d ago</span>
        <span>Today</span>
      </div>
    </div>
  )
}
