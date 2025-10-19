import { Navigate } from "react-router-dom"
import { useEffect, useState } from "react"
import supabase from "../utils/client"

export default function ProtectedRoute({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <p>Loading...</p>

  // if not logged in → redirect to login
  if (!session) return <Navigate to="/login" replace />

  return children
}
