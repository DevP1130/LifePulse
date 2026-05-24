import { createContext, useContext, useState } from 'react'

interface User {
  name: string
  email: string
  initials: string
}

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const MOCK_USER: User = {
  name: 'Morgan Hayes',
  email: 'demo@capitalone.com',
  initials: 'MH',
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('lp_user')
      return stored ? (JSON.parse(stored) as User) : null
    } catch {
      return null
    }
  })

  const login = (email: string, password: string): boolean => {
    if (!email.trim() || !password.trim()) return false
    setUser(MOCK_USER)
    localStorage.setItem('lp_user', JSON.stringify(MOCK_USER))
    return true
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('lp_user')
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
