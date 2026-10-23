import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// يعيد رابط الموقع الحالي مع المسار الصحيح (يدعم /haseb/ على GitHub Pages)
const getRedirectUrl = () => {
  const base = import.meta.env.BASE_URL || '/'
  return `${window.location.origin}${base}`
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // جلب الجلسة الحالية عند التحميل
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (error) console.error('فشل جلب الجلسة:', error.message)
    })

    // الاستماع لتغيّرات حالة المصادقة (تسجيل دخول، خروج، انتهاء الجلسة)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => authListener.subscription.unsubscribe()
  }, [])

  const signUp = useCallback(async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: getRedirectUrl(),
      },
    })
    return { data, error }
  }, [])

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }, [])

  const resetPassword = useCallback(async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getRedirectUrl(),
    })
    return { data, error }
  }, [])

  return {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signOut,
    resetPassword,
  }
}
