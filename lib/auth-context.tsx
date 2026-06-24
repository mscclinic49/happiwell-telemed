'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'

type AuthContextType = {
  user: User | null
  role: string | null
  identityVerified: boolean
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  identityVerified: false,
  loading: true,
  signOut: async () => {},
})

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [identityVerified, setIdentityVerified] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadUser(u: User | null) {
    setUser(u)
    if (u) {
      const { data } = await sb.from('hw_users').select('role, identity_verified').eq('id', u.id).single()
      setRole(data?.role ?? null)
      setIdentityVerified(data?.identity_verified ?? false)
    } else {
      setRole(null)
      setIdentityVerified(false)
    }
    setLoading(false)
  }

  useEffect(() => {
    sb.auth.getUser().then(({ data: { user } }) => loadUser(user))
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, session) => {
      loadUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signOut() { await sb.auth.signOut() }

  return (
    <AuthContext.Provider value={{ user, role, identityVerified, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
