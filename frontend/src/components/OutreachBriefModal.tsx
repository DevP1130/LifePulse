import { useEffect, useRef } from 'react'
import type { OutreachBrief } from '../types'
import EventBadge from './EventBadge'

interface Props {
  brief: OutreachBrief
  onClose: () => void
}

const URGENCY_STYLE: Record<string, string> = {
  Critical: 'bg-red-50 border-red-200 text-red-700',
  High:     'bg-amber-50 border-amber-200 text-amber-700',
  Medium:   'bg-blue-50 border-blue-200 text-blue-700',
}

export default function OutreachBriefModal({ brief, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  const urgencyStyle = URGENCY_STYLE[brief.urgency_level] ?? URGENCY_STYLE.Medium

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-[#1a2a6c] text-white px-7 py-5 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-medium text-blue-300 mb-1 uppercase tracking-wider">
                Outreach Brief
              </div>
              <h2 className="text-xl font-bold">{brief.customer_name}</h2>
              <div className="mt-2 flex items-center gap-2">
                <EventBadge eventType={brief.event_type} size="sm" />
                <span className="text-blue-300 text-xs">·</span>
                <span className="text-blue-200 text-xs">Generated {brief.generated_date}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-blue-300 hover:text-white transition-colors mt-1"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 scrollbar-thin">
          <div className="px-7 py-6 space-y-7">

            {/* Urgency banner */}
            <div className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${urgencyStyle}`}>
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-semibold text-sm">{brief.urgency_level} Priority</p>
                <p className="text-xs mt-0.5 opacity-80">{brief.urgency_rationale}</p>
              </div>
            </div>

            {/* Summary */}
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Situation Summary
              </h3>
              <p className="text-slate-700 text-sm leading-relaxed">{brief.summary}</p>
            </section>

            {/* Signal transactions */}
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Detection Signals
              </h3>
              <div className="space-y-2">
                {brief.signal_transactions.slice(0, 6).map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2.5 border border-slate-100"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-700">{txn.merchant}</p>
                      <p className="text-xs text-slate-400">{txn.category} · {txn.date}</p>
                    </div>
                    <span className={`text-sm font-semibold ${txn.transaction_type === 'credit' ? 'text-emerald-600' : 'text-slate-700'}`}>
                      {txn.transaction_type === 'credit' ? '+' : '-'}${txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Recommended products */}
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Recommended Products
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {brief.recommended_products.map((p, i) => (
                  <div key={i} className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <p className="text-sm font-semibold text-[#1a2a6c]">{p.name}</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{p.rationale}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Talking points */}
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Talking Points
              </h3>
              <ul className="space-y-2">
                {brief.talking_points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-[#1a2a6c] text-white text-xs flex items-center justify-center font-semibold">
                      {i + 1}
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </section>

            {/* Draft message */}
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Draft Outreach
              </h3>
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                <p className="text-xs text-slate-500 mb-2">
                  <span className="font-semibold text-slate-700">Subject: </span>
                  {brief.draft_subject}
                </p>
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {brief.draft_message}
                </pre>
              </div>
              <button className="mt-3 text-xs text-[#1a2a6c] font-medium hover:underline">
                Copy to clipboard
              </button>
            </section>

          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0 flex justify-between items-center">
          <span className="text-xs text-slate-400">
            LifePulse AI · For internal use only
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1a2a6c] text-white text-sm font-medium rounded-lg hover:bg-[#243580] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
