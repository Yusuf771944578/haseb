import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Mail, Lock, User, ArrowRight, LogIn, AlertCircle } from 'lucide-react'

export default function LoginPage({ onAuthenticated, onToast }) {
  const { signUp, signIn, resetPassword, loading } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'login') {
        const { data, error: err } = await signIn(email, password)
        if (err) throw err
        onAuthenticated()
      } else if (mode === 'signup') {
        const { data, error: err } = await signUp(email, password, fullName)
        if (err) throw err
        if (data.user) {
          onToast('success', 'تم إنشاء الحساب بنجاح. يمكنك تسجيل الدخول الآن.')
          setMode('login')
        }
      } else {
        const { error: err } = await resetPassword(email)
        if (err) throw err
        onToast('success', 'تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني (إذا كان موجوداً).')
      }
    } catch (err) {
      setError(err.message || 'حدث خطأ غير متوقع')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-lg p-8 sm:p-10">
        <div className="text-center mb-8">
          <span className="text-3xl">📿</span>
          <h2 className="mt-4 text-2xl font-bold text-emerald-700">حاسب نفسك</h2>
          <p className="text-sm text-slate-600">رفيقك للمحاسبة اليومية</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الاسم الكامل</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="أدخل اسمك الكامل"
                className="input-field"
                disabled={submitting}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@mail.com"
              className="input-field"
              disabled={submitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field"
              disabled={submitting}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <ArrowRight className="w-4 h-4 animate-spin" /> جاري التنفيذ...
              </>
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" /> تسجيل الدخول
              </>
            ) : (
              <>
                <User className="w-4 h-4" /> إنشاء حساب جديد
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          {mode === 'login' ? (
            <>
              ليس لديك حساب؟{' '}
              <button onClick={() => { setMode('signup'); setError('') }} className="text-emerald-600 font-semibold underline underline-offset-4">
                إنشاء حساب جديد
              </button>
              <br />
              نسيت كلمة المرور؟{' '}
              <button onClick={() => { setMode('forgot'); setError('') }} className="text-emerald-600 font-semibold underline underline-offset-4">
                                            استعادة كلمة المرور
              </button>
            </>
          ) : mode === 'signup' ? (
            <>
              لديك حساب بالفعل؟{' '}
              <button onClick={() => { setMode('login'); setError('') }} className="text-emerald-600 font-semibold underline underline-offset-4">
                                            تسجيل الدخول
              </button>
            </>
          ) : (
            <>
              '<|reserved_special_token_0|>' {' '}
              <button onClick={() => { setMode('login'); setError('') }} className="text-emerald-600 font-semibold underline underline-offset-4">
                                            العودة للتسجيل
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-xs text-slate-500 text-center">
          يتم استخدام Supabase Auth للمصادقة الحقيقية. لا يتم تخزين كلمات المرور في موقع الموقع.
        </p>
      </div>
    </div>
  )
}
