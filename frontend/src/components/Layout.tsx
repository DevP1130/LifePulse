import Sidebar from './Sidebar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#F7F8FA]">
      <div className="no-print">
        <Sidebar />
      </div>
      <main className="flex-1 ml-56 overflow-auto print:ml-0">
        {children}
      </main>
    </div>
  )
}
