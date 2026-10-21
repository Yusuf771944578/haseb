import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import PreviousReports from './pages/PreviousReports'
import ReportView from './pages/ReportView'
import Toast from './components/Toast'

export default function App() {
  const { user, session, loading, signOut } = useAuth()
  const [route, setRoute] = useState('dashboard')
  const [viewReportId, setViewReportId] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 font-medium">جاري التحقق من الجلسة...</p>
        </div>
      </div>
    )
  }

  // إذا لم يكن المستخدم مسجلاً دخوله، اعرض صفحة المصادقة فقط
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <LoginPage onAuthenticated={() => setRoute('dashboard')} onToast={showToast} />
        <Toast toast={toast} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
      {/* شريط الرأس */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📿</span>
              <span className="font-bold text-xl text-emerald-700 tracking-tight">حاسب نفسك</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-sm text-slate-600">
                أهلاً، {user.user_metadata?.full_name || 'المستخدم'}
              </span>
              <button
                onClick={signOut}
                className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded border border-red-100 font-medium transition-colors"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>

          {/* التنقل الرئيسي */}
          <nav className="mt-3 flex gap-2 border-b border-slate-100 pb-2 overflow-x-auto">
            <button
              onClick={() => { setRoute('dashboard'); setViewReportId(null) }}
              className={`whitespace-nowrap px-4 py-2 text-sm rounded-lg border transition-colors ${
                route === 'dashboard'
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              📊 المحاسبة اليومية
            </button>
            <button
              onClick={() => { setRoute('reports'); setViewReportId(null) }}
              className={`whitespace-nowrap px-4 py-2 text-sm rounded-lg border transition-colors ${
                route === 'reports'
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              📅 التقارير السابقة
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {route === 'dashboard' && (
          <Dashboard
            user={user}
            onViewReport={setViewReportId}
            onToast={showToast}
            onNavigateReports={() => setRoute('reports')}
          />
        )}
        {route === 'reports' && (
          <PreviousReports user={user} onViewReport={setViewReportId} onToast={showToast} />
        )}
        {route === 'report-view' && viewReportId && (
          <ReportView reportId={viewReportId} user={user} onBack={() => setRoute('reports')} onToast={showToast} />
        )}
      </main>

      <Toast toast={toast} />
    </div>
  )
}
