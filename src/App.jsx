import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import DailyReportForm from './pages/DailyReportForm'
import PreviousReports from './pages/PreviousReports'
import ReportView from './pages/ReportView'
import ResetPassword from './pages/ResetPassword'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [currentView, setCurrentView] = useState('dashboard') // 'dashboard' | 'form' | 'previous' | 'view'
  const [selectedReportId, setSelectedReportId] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setCurrentView('dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-200">
        <p className="animate-pulse font-medium">جاري تحميل المنصة...</p>
      </div>
    )
  }

  if (!session) {
    return <LoginPage onToast={showToast} />
  }

  if (recoveryMode) {
    return (
      <ResetPassword
        onDone={() => setRecoveryMode(false)}
        onToast={showToast}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans dir-rtl">
      {toast && (
        <div className={`fixed top-4 left-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium text-white shadow-2xl transition-all ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
        }`}>
          {toast.message}
        </div>
      )}

      {currentView === 'dashboard' && (
        <Dashboard
          user={session.user}
          onStartReport={() => setCurrentView('form')}
          onViewPrevious={() => setCurrentView('previous')}
          onLogout={handleLogout}
        />
      )}

      {currentView === 'form' && (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <DailyReportForm
            user={session.user}
            onBack={() => setCurrentView('dashboard')}
            onSaved={(id) => {
              setSelectedReportId(id)
              setCurrentView('view')
            }}
            onToast={showToast}
          />
        </div>
      )}

      {currentView === 'previous' && (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <PreviousReports
            user={session.user}
            onBack={() => setCurrentView('dashboard')}
            onSelectReport={(id) => {
              setSelectedReportId(id)
              setCurrentView('view')
            }}
          />
        </div>
      )}

      {currentView === 'view' && (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <ReportView
            reportId={selectedReportId}
            user={session.user}
            onBack={() => setCurrentView('previous')}
            onToast={showToast}
          />
        </div>
      )}
    </div>
  )
}