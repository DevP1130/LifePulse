import Sidebar from './Sidebar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#F7F8FA]">
      <Sidebar />
      <main className="flex-1 ml-56 overflow-auto">
        {children}
      </main>
    </div>
  )
}
