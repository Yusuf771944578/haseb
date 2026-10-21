import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Copy, Share2, Flag, RefreshCw } from 'lucide-react'

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

    if (rRes.data) {
      setReport(rRes.data)
      setItems(iRes.data || [])
      setTasks(tRes.data || [])
      setProfile(pRes.data || null)
      buildText()
    }
    setLoading(false)
  }

  const buildText = () => {
    if (!report) return
    const itemMap = {}
    items.forEach((it) => { itemMap[it.task_id] = it })
    const completed = items.filter((i) => i.is_completed).length
    const total = tasks.length
    const pct = total === 0 ? 0 : Math.round((completed / total) * 1000) / 10

    const lines = []
    lines.push('📊 [تقرير إنجاز طالب - حاسب نفسك]')
    lines.push(`👤 الطالب: ${user.user_metadata?.full_name || profile?.full_name || 'المستخدم'}`)
    lines.push(`📅 اليوم والتاريخ الميلادي: ${report.gregorian_date || report.report_date}`)
    lines.push(`🌙 الموافق هجرياً: ${report.hijri_date || 'غير متاح'}`)
    lines.push(`🕌 الحلقة: ${profile?.circle_name || 'غير محدد'}`)
    lines.push(`📈 نتيجة الإنجاز: ${completed} من ${total} (${pct}%)`)
    lines.push('📋 تفاصيل الأعمال اليومية:')

    const ordered = [...tasks].sort((a, b) => a.sort_order - b.sort_order)
    ordered.forEach((t) => {
      const it = itemMap[t.id]
      const done = it ? it.is_completed : false
      lines.push(`${done ? '✅' : '❌'} ${t.title}`)
    })

    lines.push('')
    lines.push('✨ الحمد لله الذي بنعمته تتم الصلحت')

    setReportText(lines.join('\n'))
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText)
      setCopyConfirmation(true)
      setTimeout(() => setCopyConfirmation(false), 2000)
      onToast('success', 'تم نسخ التقرير إلى الحافظة')
    } catch (err) {
      onToast('error', 'فشل النسخ')
    }
  }

  const handleWhatsApp = () => {
    window.open('https://wa.me/?text=' + encodeURIComponent(reportText), '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">جاري تحميل التقرير...</p>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-red-600 font-medium mb-3">التقرير غير موجود أو لا تملك صلاحية عرضه.</p>
          <button onClick={onBack} className="btn-outline">العودة إلى التقارير السابقة</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn-outline text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> العودة إلى التقارير السابقة
        </button>
        <span className="text-sm text-slate-500">| تقرير يوم {report.report_date}</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-1">تقرير الإنجاز اليومي</h2>
        <p className="text-sm text-slate-600 mb-4">
          {report.gregorian_date ? `التاريخ الميلادي: ${report.gregorian_date}` : ''}
          {report.hijri_date ? ` | الهجري: ${report.hijri_date}` : ''}
        </p>
        <div className="text-2xl font-bold text-emerald-700 mb-1">
          {items.filter((i) => i.is_completed).length} من {tasks.length} — {
          tasks.length === 0 ? '0%' : Math.round((items.filter((i) => i.is_completed).length / tasks.length) * 1000) / 10
        }%
        </div>
        <p className="text-sm text-slate-500 mb-4">نسبة الإنجاز لهذا اليوم</p>

        <div className="flex gap-2 sm:gap-3 mb-6">
          <button
            onClick={handleCopy}
            disabled={copyConfirmation}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-lg font-medium disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {copyConfirmation ? (
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              تم النسخ
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1" /> نسخ التقرير
              </>
            )}
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4 mr-1" /> مشاركة عبر واتساب
          </button>
        </div>

        <div className="bg-slate-50 rounded-lg border border-slate-100 p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">نص التقرير المنسوخ (جاهز للواتساب):</h4>
          <textarea
            readOnly
            value={reportText}
            className="w-full h-64 mb-3 rounded-lg border border-slate-200 bg-white p-3 font-mono text-sm text-slate-700 focus:outline-none resize-none"
          />
          <div className="flex gap-2">
            <button onClick={handleCopy} className="flex-1 btn-outline text-sm">إعادة نسخ النص</button>
            <button onClick={buildText} className="flex-1 btn-outline text-sm">
              <RefreshCw className="w-4 h-4 mr-1" /> تحديث التقرير من قاعدة البيانات
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
