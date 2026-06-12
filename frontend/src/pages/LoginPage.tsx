import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const FEATURES = [
  {
    icon: '🔍',
    label: 'Real-time signal detection',
    desc: 'Surfaces life events from transaction patterns across Capital One accounts.',
  },
  {
    icon: '🎯',
    label: 'Outreach prioritization',
    desc: 'Churn risk and confidence scoring help you reach the right customers first.',
  },
  {
    icon: '🤖',
    label: 'AI-generated briefs',
    desc: 'Personalized conversation starters and outreach emails, drafted by Claude.',
  },
]

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    navigate('/customers', { replace: true })
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 400))
    const ok = login(email, password)
    setLoading(false)
    if (ok) {
      navigate('/customers', { replace: true })
    } else {
      setError('Enter your email and password to continue.')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden md:flex w-[52%] bg-[#111111] flex-col justify-between px-14 py-12">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="white" className="w-4.5 h-4.5">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            </svg>
          </div>
          <span className="text-base font-bold text-white tracking-tight">LifePulse</span>
        </div>

        {/* Hero text */}
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-5 tracking-tight">
            Turn life events<br />into lasting<br />relationships.
          </h1>
          <p className="text-sm text-gray-400 mb-10 leading-relaxed max-w-sm">
            AI-powered signal detection across Capital One's transaction data — surface the right customers before competitors do.
          </p>

          {/* Features */}
          <div className="space-y-5">
            {FEATURES.map(f => (
              <div key={f.label} className="flex items-start gap-3.5">
                <span className="text-xl leading-none mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{f.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-[10px] text-gray-700 leading-snug">
          © 2025 Capital One Financial Corporation. Internal use only.<br />
          Authorized access only. All activity is monitored and logged.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-8 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex md:hidden justify-center mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">LifePulse</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h2>
          <p className="text-sm text-gray-400 mb-8">Relationship Manager Portal</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@capitalone.com"
                className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-dark text-white text-sm font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-300 mt-8">
            Demo: any email + any password
          </p>
        </div>
      </div>
    </div>
  )
}
