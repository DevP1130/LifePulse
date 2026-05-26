import type { EventSignal } from '../types'

const TYPE_ICON: Record<string, string> = {
  // Relocation
  TRUCK_RENTAL:      '🚚',
  STORAGE_UNIT:      '📦',
  ADDRESS_CHANGE:    '📬',
  SHIPPING_SERVICE:  '📮',
  NEW_UTILITY:       '⚡',
  TEMP_HOUSING:      '🏨',
  FURNITURE:         '🛋️',
  NEW_CITY_MERCHANT: '📍',
  // New Baby
  MATERNITY_STORE:   '🤰',
  BABY_REGISTRY:     '🍼',
  BABY_GEAR:         '🧸',
  BABY_FURNITURE:    '🪑',
  HOSPITAL_BILL:     '🏥',
  PEDIATRICIAN:      '👶',
  CHILDCARE_DEPOSIT: '🏫',
  // Marriage
  ENGAGEMENT_RING:   '💍',
  WEDDING_VENUE:     '🏛️',
  WEDDING_PLANNER:   '📋',
  BRIDAL_STORE:      '👰',
  CATERING_DEPOSIT:  '🍽️',
  HONEYMOON_BOOKING: '✈️',
  WEDDING_REGISTRY:  '🎁',
  // Home Purchase
  HOME_INSPECTION:   '🔍',
  APPRAISAL_FEE:     '📊',
  REAL_ESTATE_ATTY:  '⚖️',
  DOWN_PAYMENT:      '🏠',
  HOME_IMPROVEMENT:  '🔨',
}

const TYPE_COLOR: Record<string, string> = {
  // Relocation
  TRUCK_RENTAL:      'bg-violet-100 border-violet-200',
  STORAGE_UNIT:      'bg-blue-50 border-blue-200',
  ADDRESS_CHANGE:    'bg-rose-50 border-rose-200',
  SHIPPING_SERVICE:  'bg-orange-50 border-orange-200',
  NEW_UTILITY:       'bg-yellow-50 border-yellow-200',
  TEMP_HOUSING:      'bg-teal-50 border-teal-200',
  FURNITURE:         'bg-purple-50 border-purple-200',
  NEW_CITY_MERCHANT: 'bg-emerald-50 border-emerald-200',
  // New Baby
  MATERNITY_STORE:   'bg-pink-50 border-pink-200',
  BABY_REGISTRY:     'bg-pink-50 border-pink-200',
  BABY_GEAR:         'bg-pink-50 border-pink-200',
  BABY_FURNITURE:    'bg-pink-50 border-pink-200',
  HOSPITAL_BILL:     'bg-red-50 border-red-200',
  PEDIATRICIAN:      'bg-red-50 border-red-200',
  CHILDCARE_DEPOSIT: 'bg-pink-100 border-pink-300',
  // Marriage
  ENGAGEMENT_RING:   'bg-rose-50 border-rose-200',
  WEDDING_VENUE:     'bg-rose-50 border-rose-200',
  WEDDING_PLANNER:   'bg-rose-50 border-rose-200',
  BRIDAL_STORE:      'bg-rose-50 border-rose-200',
  CATERING_DEPOSIT:  'bg-orange-50 border-orange-200',
  HONEYMOON_BOOKING: 'bg-sky-50 border-sky-200',
  WEDDING_REGISTRY:  'bg-rose-50 border-rose-200',
  // Home Purchase
  HOME_INSPECTION:   'bg-amber-50 border-amber-200',
  APPRAISAL_FEE:     'bg-amber-50 border-amber-200',
  REAL_ESTATE_ATTY:  'bg-slate-50 border-slate-200',
  DOWN_PAYMENT:      'bg-green-50 border-green-200',
  HOME_IMPROVEMENT:  'bg-amber-50 border-amber-200',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface Props {
  signals: EventSignal[]
}

export default function SignalFeed({ signals }: Props) {
  const sorted = [...signals].sort(
    (a, b) => new Date(b.detected_date).getTime() - new Date(a.detected_date).getTime()
  )

  return (
    <div className="relative">
      {/* vertical spine */}
      <div className="absolute left-4 top-3 bottom-3 w-px bg-gray-100" />

      <div className="space-y-4">
        {sorted.map((sig) => (
          <div key={sig.id} className="flex gap-4 relative">
            {/* Timeline dot */}
            <div className="flex-shrink-0 w-8 flex justify-center pt-1.5 z-10">
              <div className="w-2 h-2 rounded-full bg-accent ring-2 ring-white" />
            </div>

            {/* Signal card */}
            <div className="flex-1 pb-1">
              <div className={`rounded-lg border px-3.5 py-3 ${TYPE_COLOR[sig.signal_type] ?? 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm">{TYPE_ICON[sig.signal_type] ?? '🔍'}</span>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {sig.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">{sig.merchant}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{sig.description}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-semibold text-gray-700">
                      ${sig.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(sig.detected_date)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
