import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Calendar, Copy, Share2, ArrowLeft, BarChart3, Clock } from 'lucide-react'

export default function PreviousReports({ user, onViewReport, onToast }) {
  const [reports, setReports] = useState([])
  const [itemsByReport, setItemsByReport] = useState({})
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const [viewMode, setViewMode] = useState('list') // 'list' | 'view'

  useEffect(() => {
    loadData()
  }, [user.id])

  const loadData = async () => {
    setLoading(true)
    const [rRes, iRes, tRes] = await Promise.all([
      supabase
        .from('daily_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('report_date', { ascending: false }),
      supabase.from('daily_report_items').select('report_id, is_completed'),
      supabase.from('daily_tasks').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
    ])
    setReports(rRes.data || [])
    setTasks(tRes.data || [])

    const map = {}
    ;(iRes.data || []).forEach((it) => {
      if (!map[it.report_id]) map[it.report_id] = []
      map[it.report_id].push(it)
    })
    setItemsByReport(map)
    setLoading(false)
  }

  const reportStats = (report) => {
    const items = itemsByReport[report.id] || []
    const completed = items.filter((i) => i.is_completed).length
    const total = items.length
    const pct = total === 0 ? 0 : Math.round((completed / total) * 1000) / 10
    return { completed, total, pct }
  }

  const buildReportText = (report) => {
    const items = itemsByReport[report.id] || []
    const itemMap = {}
    items.forEach((it) => { itemMap[it.task_id] = it })
    const { completed, total, pct } = reportStats(report)

    const lines = []
    lines.push('📊 [تقرير إنجاز طالب - حاسب نفسك]')
    lines.push(`👤 الطالب: ${user.user_metadata?.full_name || 'المستخدم'}`)
    lines.push(`📅 اليوم والتاريخ الميلادي: ${report.gregorian_date || report.report_date}`)
    lines.push(`🌙 الموافق هجرياً: ${report.hijri_date || 'غير متاح'}`)
    lines.push(`🕌 الحلقة: ${report.circle_name || 'غير محدد'}`)
    lines.push(`📈 نتيجة الإنجاز: ${completed} من ${total} (${pct}%)`)
    lines.push('📋 تفاصيل الأعمال اليومية:')

    const orderedTasks = [...tasks].sort((a, b) => a.sort_order - b.sort_order)
    orderedTasks.forEach((t) => {
      const it = itemMap[t.id]
      const done = it ? it.is_completed : false
      lines.push(`${done ? '✅' : '❌'} ${t.title || it?.task_title || 'عمل'}`)
    })

    lines.push('')
    lines.push('✨ الحمد لله الذي بنعمته تتم الصلحت')
    return lines.join('\n')
  }

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      onToast('success', 'تم نسخ التقرير القديم إلى الحافظة')
    } catch (err) {
      onToast('error', 'فشل النسخ')
    }
  }

  const handleWhatsApp = (text) => {
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 text-emerald-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-slate-600">جاري تحميل تقاريرك السابقة...</p>
        </div>
      </div>
    )
  }

  if (viewMode === 'view' && selectedReport) {
    const stats = reportStats(selectedReport)
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setViewMode('list')} className="btn-outline text-sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> العودة لقائمة التقارير
          </button>
          <span className="text-sm text-slate-500">| تقاريرك السابقة</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-2">تقرير يوم {selectedReport.report_date}</h2>
          <p className="text-sm text-slate-600 mb-4">
            {selectedReport.gregorian_date ? `الميلادي: ${selectedReport.gregorian_date}` : ''}
            {selectedReport.hijri_date ? ` | الهجري: ${selectedReport.hijri_date}` : ''}
          </p>
          <div className="text-2xl font-bold text-emerald-700 mb-1">
            {stats.completed} من {stats.total} — {stats.pct}%
          </div>
          <p className="text-sm text-slate-500 mb-4">نسبة الإنجاز لهذا اليوم</p>

          <div className="flex gap-2 sm:gap-3 mb-6">
            <button
              onClick={() => handleCopy(buildReportText(selectedReport))}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4 mr-1" /> نسخ التقرير
            </button>
            <button
              onClick={() => handleWhatsApp(buildReportText(selectedReport))}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4 mr-1" /> مشاركة عبر واتساب
            </button>
          </div>

          <div className="bg-slate-50 rounded-lg border border-slate-100 p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">تفاصيل الأعمال:</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {([...tasks].sort((a, b) => a.sort_order - b.sort_order)).map((t) => {
                const it = itemsByReport[selectedReport.id]?.find((x) => x.task_id === t.id)
                const done = it ? it.is_completed : false
                return (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded bg-white border border-slate-100">
                    <span className="text-sm">{t.title}</span>
                    <span className={done ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {done ? '✅ منجز' : '❌ غير منجز'}
                    </span>
                  </div>
                )
              })}
              {tasks.length === 0 && <p className="text-sm text-slate-400">لا توجد تفاصيل محفوظة لهذا اليوم.</p>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" /> التقارير السابقة
          </h2>
          <p className="text-sm text-slate-600">استعراض تقارير الإنجاز حسب التاريخ وبياناتك المحفوظة فقط.</p>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">لا توجد تقارير بعد</h3>
          <p className="text-slate-600 mb-4">ابدأ بتسجيل أعمالك اليومية لإنشاء أول تقرير لك.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => {
            const { completed, total, pct } = reportStats(report)
            return (
              <div key={report.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => {
                setSelectedReport(report)
                setViewMode('view')
              }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">{report.report_date}</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    {pct}%
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-900 mb-2">{completed} / {total}</div>
                <div className="text-xs text-slate-500 mb-4">
                  {report.gregorian_date ? report.gregorian_date : ''}
                  {report.hijri_date ? ` • ${report.hijri_date}` : ''}
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-3 text-xs text-slate-500 text-right">
                  انقر لعرض التفاصيل، النسخ أو المشاركة
                </p>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-600">
        <p className="font-medium">ملاحظة مهمة:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
      <li>هذه الصفحة تُظهر تقارير حسابك فقط ولا تُظهر تقارير أي مستخدم آخر.</li>
          <li>كل تقرير محفوظ بتاريخه بشكل مستقل؛ تعديل أعمال اليوم لا يغيّر تقارير الأيام السابقة.</li>
        </ul>
      </div>
    </div>
  )
}
