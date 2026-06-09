import { useState, useEffect } from 'react'
import { api } from '../services/api'
import type { AnalyticsData } from '../types'

const EVENT_LABEL: Record<string, { label: string; icon: string }> = {
  relocation:    { label: 'Relocation',    icon: '🗺️' },
  new_baby:      { label: 'New Baby',      icon: '👶' },
  marriage:      { label: 'Marriage',      icon: '💍' },
  home_purchase: { label: 'Home Purchase', icon: '🏠' },
  job_change:    { label: 'Job Change',    icon: '💼' },
  retirement:    { label: 'Retirement',    icon: '🌅' },
}

const FUNNEL_STAGES = [
  { key: 'new',       label: 'New'       },
  { key: 'active',    label: 'Active'    },
  { key: 'contacted', label: 'Contacted' },
  { key: 'resolved',  label: 'Resolved'  },
] as const

// ── SVG bar chart: signals over time ────────────────────────────────────────

function SignalsChart({ data }: { data: { week: string; count: number }[] }) {
  const CHART_H = 100
  const W = 600
  const N = data.length
  const maxCount = Math.max(...data.map(d => d.count), 1)
  const barW = W / N
  const gridLines = [0.25, 0.5, 0.75, 1]

  return (
    <svg viewBox={`0 0 ${W} 136`} className="w-full">
      {/* Grid */}
      {gridLines.map(f => (
        <line
          key={f}
          x1={0} y1={CHART_H - f * CHART_H}
          x2={W} y2={CHART_H - f * CHART_H}
          stroke="#F3F4F6" strokeWidth="1"
        />
      ))}
      {/* Y-axis max label */}
      <text x={0} y={8} fontSize="8.5" fill="#D1D5DB">{maxCount}</text>

      {/* Bars */}
      {data.map((d, i) => {
        const bh = Math.max((d.count / maxCount) * CHART_H, d.count > 0 ? 2 : 0)
        const x = i * barW + barW * 0.18
        const w = barW * 0.64
        return (
          <g key={i}>
            {bh > 0 && (
              <rect
                x={x} y={CHART_H - bh}
                width={w} height={bh}
                rx="2" fill="#5B5EA6" opacity="0.8"
              />
            )}
            {d.count > 0 && (
              <text
                x={x + w / 2} y={CHART_H - bh - 4}
                textAnchor="middle" fontSize="8.5" fill="#9CA3AF"
              >
                {d.count}
              </text>
            )}
            <text
              x={i * barW + barW / 2} y={CHART_H + 16}
              textAnchor="middle" fontSize="8" fill="#D1D5DB"
            >
              {d.week}
            </text>
          </g>
        )
      })}

      {/* Axis */}
      <line x1={0} y1={CHART_H} x2={W} y2={CHART_H} stroke="#E5E7EB" strokeWidth="1" />
    </svg>
  )
}

// ── SVG bar chart: confidence distribution ───────────────────────────────────

function ConfidenceChart({ data }: { data: { label: string; count: number }[] }) {
  const CHART_H = 100
  const W = 260
  const maxCount = Math.max(...data.map(d => d.count), 1)
  const barW = W / data.length

  return (
    <svg viewBox={`0 0 ${W} 130`} className="w-full">
      {[0.5, 1].map(f => (
        <line
          key={f}
          x1={0} y1={CHART_H - f * CHART_H}
          x2={W} y2={CHART_H - f * CHART_H}
          stroke="#F3F4F6" strokeWidth="1"
        />
      ))}
      {data.map((d, i) => {
        const bh = Math.max((d.count / maxCount) * CHART_H, d.count > 0 ? 2 : 0)
        const x = i * barW + barW * 0.12
        const w = barW * 0.76
        return (
          <g key={i}>
            {bh > 0 && (
              <rect
                x={x} y={CHART_H - bh}
                width={w} height={bh}
                rx="2" fill="#5B5EA6" opacity={0.5 + (i / data.length) * 0.5}
              />
            )}
            <text
              x={x + w / 2} y={CHART_H - bh - 4}
              textAnchor="middle" fontSize="9" fill="#9CA3AF"
            >
              {d.count > 0 ? d.count : ''}
            </text>
            <text
              x={i * barW + barW / 2} y={CHART_H + 14}
              textAnchor="middle" fontSize="7.5" fill="#D1D5DB"
            >
              {d.label.split('–')[0]}–
            </text>
            <text
              x={i * barW + barW / 2} y={CHART_H + 24}
              textAnchor="middle" fontSize="7.5" fill="#D1D5DB"
            >
              {d.label.split('–')[1]}
            </text>
          </g>
        )
      })}
      <line x1={0} y1={CHART_H} x2={W} y2={CHART_H} stroke="#E5E7EB" strokeWidth="1" />
    </svg>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getAnalytics()
      .then(setData)
      .catch(() => setError('Failed to load analytics data.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="px-8 py-8 flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-sm">Loading analytics…</span>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="px-8 py-8">
        <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl px-6 py-5 text-sm">
          {error ?? 'No data available.'}
        </div>
      </div>
    )
  }

  const funnel = data.pipeline_funnel
  const funnelMax = Math.max(funnel.new, 1)

  const eventRows = Object.entries(data.event_breakdown).sort(
    ([, a], [, b]) => b.count - a.count
  )

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Portfolio-level view across {data.total_customers} monitored customers
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Customers',      value: data.total_customers,                           sub: 'under monitoring'      },
          { label: 'Signals Logged', value: data.total_signals,                             sub: 'across all events'     },
          { label: 'Avg Confidence', value: `${Math.round(data.avg_confidence * 100)}%`,   sub: 'detection accuracy', accent: true },
          { label: 'Avg Churn Risk', value: `${Math.round(data.avg_churn_risk * 100)}%`,   sub: 'retention priority', warn: data.avg_churn_risk > 0.55 },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 px-5 py-4">
            <p className={`text-2xl font-bold ${s.accent ? 'text-accent' : s.warn ? 'text-amber-500' : 'text-gray-900'}`}>
              {s.value}
            </p>
            <p className="text-xs font-semibold text-gray-700 mt-1">{s.label}</p>
            <p className="text-xs text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Row 2: signals chart + pipeline funnel */}
      <div className="grid grid-cols-3 gap-6 mb-6">

        {/* Signals over time */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 px-6 py-5">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Signals Detected</h2>
              <p className="text-xs text-gray-400 mt-0.5">Weekly count over the last 12 weeks</p>
            </div>
            <span className="text-2xl font-bold text-gray-900 tabular-nums">{data.total_signals}</span>
          </div>
          <SignalsChart data={data.signals_by_week} />
        </div>

        {/* Pipeline funnel */}
        <div className="bg-white rounded-xl border border-gray-100 px-6 py-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Pipeline Funnel</h2>
            <p className="text-xs text-gray-400 mt-0.5">Status progression across portfolio</p>
          </div>
          <div className="space-y-3">
            {FUNNEL_STAGES.map(({ key, label }, idx) => {
              const count = funnel[key]
              const prev = idx > 0 ? funnel[FUNNEL_STAGES[idx - 1].key] : null
              const retainPct = prev && prev > 0 ? Math.round((count / prev) * 100) : null
              const barPct = (count / funnelMax) * 100

              return (
                <div key={key}>
                  {retainPct !== null && (
                    <div className="flex items-center gap-1.5 mb-1.5 pl-0.5">
                      <div className="w-px h-3 bg-gray-200 ml-1" />
                      <span className="text-[10px] text-gray-400">{retainPct}% advanced</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-16 flex-shrink-0">{label}</span>
                    <div className="flex-1 h-6 bg-gray-50 rounded-md overflow-hidden">
                      <div
                        className="h-full bg-accent/80 rounded-md transition-all flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(barPct, count > 0 ? 8 : 0)}%` }}
                      >
                        {barPct > 20 && (
                          <span className="text-[10px] font-semibold text-white">{count}</span>
                        )}
                      </div>
                    </div>
                    {barPct <= 20 && (
                      <span className="text-xs font-semibold text-gray-700 tabular-nums w-4">{count}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-gray-50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Overall conversion</span>
              <span className="font-semibold text-gray-900">
                {funnel.new > 0 ? Math.round((funnel.resolved / funnel.new) * 100) : 0}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-800 rounded-full"
                style={{ width: `${funnel.new > 0 ? (funnel.resolved / funnel.new) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: conversion by event type + confidence distribution */}
      <div className="grid grid-cols-3 gap-6">

        {/* Conversion by event type */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 px-6 py-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Outreach Rate by Event Type</h2>
            <p className="text-xs text-gray-400 mt-0.5">Customers contacted or resolved per event category</p>
          </div>

          <div className="space-y-4">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1 pb-1 border-b border-gray-50">
              <span className="col-span-3">Event Type</span>
              <span className="col-span-1 text-right">Count</span>
              <span className="col-span-5 text-center">Contacted</span>
              <span className="col-span-1 text-right">Rate</span>
              <span className="col-span-2 text-right">Avg Conf</span>
            </div>

            {eventRows.map(([type, stats]) => {
              const cfg = EVENT_LABEL[type]
              if (!cfg) return null
              return (
                <div key={type} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3 flex items-center gap-1.5">
                    <span className="text-sm leading-none">{cfg.icon}</span>
                    <span className="text-xs text-gray-700 font-medium">{cfg.label}</span>
                  </div>
                  <span className="col-span-1 text-xs text-gray-400 text-right tabular-nums">
                    {stats.count}
                  </span>
                  <div className="col-span-5 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent/40 rounded-full relative"
                      style={{ width: `${stats.contacted_pct * 100}%` }}
                    >
                      {stats.resolved_pct > 0 && (
                        <div
                          className="absolute inset-y-0 left-0 bg-gray-700 rounded-full"
                          style={{ width: `${(stats.resolved_pct / Math.max(stats.contacted_pct, 0.001)) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>
                  <span className="col-span-1 text-xs font-semibold text-gray-700 text-right tabular-nums">
                    {Math.round(stats.contacted_pct * 100)}%
                  </span>
                  <span className="col-span-2 text-xs text-gray-400 text-right tabular-nums">
                    {Math.round(stats.avg_confidence * 100)}%
                  </span>
                </div>
              )
            })}

            {/* Legend */}
            <div className="flex items-center gap-4 text-[10px] text-gray-400 pt-1 border-t border-gray-50">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full bg-accent/40 inline-block" />
                Contacted
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full bg-gray-700 inline-block" />
                Resolved
              </span>
            </div>
          </div>
        </div>

        {/* Confidence distribution */}
        <div className="bg-white rounded-xl border border-gray-100 px-6 py-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Confidence Distribution</h2>
            <p className="text-xs text-gray-400 mt-0.5">Detection confidence across portfolio</p>
          </div>
          <ConfidenceChart data={data.confidence_distribution} />
          <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-xs">
            <span className="text-gray-400">Portfolio avg</span>
            <span className="font-semibold text-gray-900">
              {Math.round(data.avg_confidence * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Row 4: At-Risk Portfolio Segmentation */}
      <div className="mt-6 bg-white rounded-xl border border-gray-100 px-6 py-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">At-Risk Portfolio Segmentation</h2>
            <p className="text-xs text-gray-400 mt-0.5">Customers clustered by churn risk · annual revenue at stake</p>
          </div>
          <span className="text-[10px] font-semibold px-2 py-1 border border-gray-200 text-gray-400 rounded-full uppercase tracking-wide">
            Responsible AI
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          {([ 'high', 'medium', 'low' ] as const).map(tier => {
            const seg = data.risk_segments[tier]
            const barColor = tier === 'high' ? 'bg-gray-800' : tier === 'medium' ? 'bg-accent/60' : 'bg-gray-200'
            const labelColor = tier === 'high' ? 'text-gray-900' : tier === 'medium' ? 'text-accent' : 'text-gray-400'
            return (
              <div key={tier} className="border border-gray-100 rounded-xl px-5 py-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${labelColor}`}>{seg.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{seg.count}</p>
                    <p className="text-xs text-gray-400">{Math.round(seg.pct * 100)}% of portfolio</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Annual value</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">
                      ${(seg.annual_value_at_risk / 1000).toFixed(0)}k
                    </p>
                    <p className="text-[10px] text-gray-400">at risk</p>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${seg.pct * 100}%` }} />
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-gray-50 rounded-lg px-4 py-3 text-[11px] text-gray-400 leading-relaxed">
          <span className="font-semibold text-gray-500">Model note — </span>
          Churn risk scores are generated from transaction signal patterns and account tenure. Scores above 65% indicate customers statistically likely to open a primary account at a competing institution within 90 days of a life event. All scores require RM validation. High-risk customers without outreach within 7 days of detection show a 3.2× higher attrition rate in back-testing.
        </div>
      </div>
    </div>
  )
}
