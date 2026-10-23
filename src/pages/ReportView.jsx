import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  ArrowLeft, Copy, Share2, RefreshCw, Check, X, CheckCircle2,
  Calendar, TrendingUp, FileText
} from 'lucide-react'

export default function ReportView({ reportId, user, onBack, onToast }) {
  const [report, setReport] = useState(null)
  const [items, setItems] = useState([])
  const [tasks, setTasks] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reportText, setReportText] = useState('')
  const [copyConfirmation, setCopyConfirmation] = useState(false)

  useEffect(() => {
    loadReport()
  }, [reportId, user.id])

  const loadReport = async () => {
    setLoading(true)
    const [rRes, iRes, tRes, pRes] = await Promise.all([
      supabase.from('daily_reports').select('*').eq('id', reportId).eq('user_id', user.id).maybeSingle(),
      supabase.from('daily_report_items').select('*').eq('report_id', reportId),
      supabase.from('daily_tasks').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
      supabase.from('profiles').select('circle_name, full_name').eq('id', user.id).maybeSingle(),
    ])

    setReport(rRes.data || null)
    setItems(iRes.data || [])
    setTasks(tRes.data || [])
    setProfile(pRes.data || null)
    setLoading(false)
  }

  // بناء نص التقرير تلقائياً بعد تحميل البيانات (وليس من حالة قديمة قبل التحديث)
  useEffect(() => {
    if (!report) {
      setReportText('')
      return
    }

    const completed = items.filter(i => i.is_completed).length
    const total = items.length
    const pct = total === 0 ? 0 : Math.round((completed / total) * 1000) / 10

    const orderMap = {}
    tasks.forEach(t => { orderMap[t.id] = t.sort_order ?? 999 })

    const ordered = [...items].sort((a, b) => {
      const ao = orderMap[a.task_id] ?? 999
      const bo = orderMap[b.task_id] ?? 999
      if (ao !== bo) return ao - bo
      return (a.task_title || '').localeCompare(b.task_title || '', 'ar')
    })

    const lines = []
    lines.push('📊 [تقرير إنجاز طالب - حاسب نفسك]')
    lines.push(`👤 الطالب: ${user.user_metadata?.full_name || profile?.full_name || 'المستخدم'}`)
    lines.push(`📅 اليوم والتاريخ الميلادي: ${report.gregorian_date || report.report_date}`)
    lines.push(`🌙 الموافق هجرياً: ${report.hijri_date || 'غير متاح'}`)
    lines.push(`🕌 الحلقة: ${profile?.circle_name || 'غير محدد'}`)
    lines.push(`📈 نتيجة الإنجاز: ${completed} من ${total} (${pct}%)`)
    lines.push('📋 تفاصيل الأعمال اليومية:')

    ordered.forEach(it => {
      lines.push(`${it.is_completed ? '✅' : '❌'} ${it.task_title || 'عمل'}`)
    })

    lines.push('')
    lines.push('✨ الحمد لله الذي بنعمته تتم الصالحات')

    setReportText(lines.join('\n'))
  }, [report, items, tasks, profile, user])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText)
      setCopyConfirmation(true)
      setTimeout(() => setCopyConfirmation(false), 2000)
      if (onToast) onToast('success', 'تم نسخ التقرير إلى الحافظة')
    } catch {
      if (onToast) onToast('error', 'فشل النسخ إلى الحافظة')
    }
  }

  const handleWhatsApp = () => {
    window.open('https://wa.me/?text=' + encodeURIComponent(reportText), '_blank')
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 text-slate-400">
        <p className="animate-pulse">جاري تحميل التقرير...</p>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center max-w-md">
          <p className="text-red-400 font-medium mb-4">التقرير غير موجود أو لا تملك صلاحية عرضه.</p>
          <button
            onClick={onBack}
            className="bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 px-5 py-2.5 rounded-xl text-sm transition-all cursor-pointer"
          >
            العودة إلى التقارير السابقة
          </button>
        </div>
      </div>
    )
  }

  const displayItems = items.length > 0
    ? items
    : tasks.map(t => ({ id: t.id, task_title: t.title, is_completed: false }))

  const completedCount = displayItems.filter(i => i.is_completed).length
  const totalCount = displayItems.length
  const percentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 1000) / 10

  return (
    <div className="space-y-6 dir-rtl">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          type="button"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 rotate-180" />
          <span>العودة إلى التقارير السابقة</span>
        </button>
        <span className="text-xs text-slate-500 font-mono">{report.report_date}</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-400" />
            تقرير الإنجاز اليومي
          </h2>
          <p className="text-slate-400 text-sm flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>{report.gregorian_date || report.report_date}</span>
            {report.hijri_date && <span className="text-slate-500">| {report.hijri_date} هـ</span>}
          </p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-end justify-between gap-4 mb-3">
            <div>
              <div className="text-xs text-slate-400 mb-1">نسبة الإنجاز لهذا اليوم</div>
              <div className="text-3xl font-bold text-emerald-400">
                {completedCount} <span className="text-lg text-slate-500">من {totalCount}</span>
                <span className="text-lg text-slate-300 mr-2">({percentage}%)</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>إنجاز</span>
            </div>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleCopy}
            disabled={copyConfirmation}
            className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 py-3 rounded-xl font-medium disabled:opacity-60 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {copyConfirmation ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>تم النسخ</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>نسخ التقرير</span>
              </>
            )}
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>مشاركة عبر واتساب</span>
          </button>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            تفاصيل الأعمال اليومية
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {displayItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm ${
                  item.is_completed
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400'
                }`}
              >
                {item.is_completed ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-slate-600 shrink-0" />
                )}
                <span className="leading-relaxed">{item.task_title || 'عمل'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-300">نص التقرير الجاهز للمشاركة</h3>
            <button
              onClick={loadReport}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              تحديث من قاعدة البيانات
            </button>
          </div>
          <textarea
            readOnly
            value={reportText}
            className="w-full h-64 rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm leading-relaxed text-slate-300 focus:outline-none resize-none"
          />
        </div>
      </div>
    </div>
  )
}
