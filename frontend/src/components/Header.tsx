export default function Header() {
  return (
    <header className="bg-[#1a2a6c] text-white shadow-lg">
      <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight">LifePulse</span>
          </div>
          <span className="text-slate-400 text-sm font-medium px-2 border-l border-slate-600">
            Relationship Intelligence
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 bg-slate-700/60 px-3 py-1 rounded-full">
            Demo — Capital One Internal
          </span>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-xs font-semibold">
              RM
            </div>
            <span className="text-sm text-slate-200">Morgan Hayes</span>
          </div>
        </div>
      </div>
    </header>
  )
}
