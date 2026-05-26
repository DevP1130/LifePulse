import { useState } from 'react'
import type { ConversationStarter } from '../types'

const TIER_CONFIG = {
  early:  { label: 'Early Detection', bg: 'bg-slate-100',   text: 'text-slate-600'   },
  active: { label: 'In Progress',     bg: 'bg-accent/10',   text: 'text-accent'      },
  deep:   { label: 'Deep Signal',     bg: 'bg-violet-100',  text: 'text-violet-700'  },
  post:   { label: 'Post-Event',      bg: 'bg-emerald-100', text: 'text-emerald-700' },
}

interface Props {
  starter: ConversationStarter
  loading?: boolean
}

export default function ConversationStarterCard({ starter, loading }: Props) {
  const [copied, setCopied] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)

  const tier = TIER_CONFIG[starter.tier] ?? TIER_CONFIG.active

  const handleCopy = async () => {
    await navigator.clipboard.writeText(starter.opener)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-24 mb-4" />
        <div className="space-y-2">
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-5/6" />
          <div className="h-3 bg-gray-100 rounded w-4/6" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-accent" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Conversation Starter</p>
            <p className="text-xs text-gray-400">AI-generated · {starter.generated_date}</p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tier.bg} ${tier.text}`}>
          {tier.label}
        </span>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Opener */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Opening</p>
          <p className="text-sm text-gray-800 leading-relaxed">{starter.opener}</p>
          <button
            onClick={handleCopy}
            className="mt-2.5 text-xs text-accent hover:text-accent-dark font-medium transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy to clipboard'}
          </button>
        </div>

        {/* Key context */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Context for this Call</p>
          <ul className="space-y-1.5">
            {starter.key_context.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                <span className="mt-0.5 w-3.5 h-3.5 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold flex-shrink-0 text-[10px]">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Products */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Suggested Products</p>
          <div className="flex flex-wrap gap-1.5">
            {starter.suggested_products.map((p, i) => {
              const name = p.split(' — ')[0]
              return (
                <span
                  key={i}
                  className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium"
                  title={p}
                >
                  {name}
                </span>
              )
            })}
          </div>
        </div>

        {/* Churn risk */}
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 mb-1">Churn Risk Assessment</p>
          <p className="text-xs text-amber-600 leading-relaxed">{starter.churn_risk_explanation}</p>
        </div>

        {/* Call guide (expandable) */}
        <div>
          <button
            onClick={() => setGuideOpen(v => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg
              className={`w-3 h-3 transition-transform ${guideOpen ? 'rotate-90' : ''}`}
              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
            {guideOpen ? 'Hide' : 'Show'} call guide
          </button>
          {guideOpen && (
            <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
              <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">
                {starter.call_guide}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
