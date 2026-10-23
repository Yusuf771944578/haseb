import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Lock, ShieldCheck } from 'lucide-react'

export default function ResetPassword({ onDone, onToast }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل.')
      return
    }

    if (password !== confirm) {
      setError('كلمتا المرور غير متطابقتين.')
      return
    }

    setSaving(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    if (onToast) onToast('success', 'تم تحديث كلمة المرور بنجاح')
    if (onDone) onDone()
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 dir-rtl font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white">تعيين كلمة مرور جديدة</h1>
          <p className="text-sm text-slate-400 mt-1">اختر كلمة مرور قوية لحسابك ثم تابع إلى المنصة.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" /> كلمة المرور الجديدة
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" /> تأكيد كلمة المرور
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={6}
              required
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            {saving ? 'جاري حفظ كلمة المرور...' : 'حفظ كلمة المرور'}
          </button>
        </form>
      </div>
    </div>
  )
}
