import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Calendar, FileText, TrendingUp, Loader2, ChevronLeft } from 'lucide-react'

const formatDate = (dateString) => {
  if (!dateString) return ''
  try {
    return new Date(`${dateString}T12:00:00`).toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateString
  }
}

const getHijriDate = (dateString) => {
  if (!dateString) return ''
  try {
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${dateString}T12:00:00`))
  } catch {
    return ''
  }
}

export default function PreviousReports({ user, onBack, onSelectReport }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadReports()
  }, [user.id])

  const loadReports = async () => {
    try {
      setLoading(true)
      setError('')

      const { data: reportsData, error: reportsError } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('report_date', { ascending: false })

      if (reportsError) throw reportsError

      const ids = (reportsData || []).map(r => r.id)
      let items = []

      if (ids.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('daily_report_items')
          .select('report_id, is_completed')
          .in('report_id', ids)

        if (itemsError) throw itemsError
        items = itemsData || []
      }

      const statsByReport = {}
      items.forEach(it => {
        if (!statsByReport[it.report_id]) statsByReport[it.report_id] = { total: 0, completed: 0 }
        statsByReport[it.report_id].total += 1
        if (it.is_completed) statsByReport[it.report_id].completed += 1
      })

      setReports((reportsData || []).map(r => {
        const stats = statsByReport[r.id] || { total: 0, completed: 0 }
        return {
          ...r,
          total: stats.total,
          completed: stats.completed,
          percentage: stats.total === 0 ? 0 : Math.round((stats.completed / stats.total) * 100),
        }
      }))
    } catch (err) {
      console.error(err)
      setError('تعذر تحميل التقارير السابقة. تأكد من اتصال قاعدة البيانات.')
    } finally {
      setLoading(false)
    }
  }

  const average = reports.length
    ? Math.round(reports.reduce((sum, r) => sum + r.percentage, 0) / reports.length)
    : 0

  return (
    <div className="space-y-6 dir-rtl">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          type="button"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 rotate-180" />
          <span>العودة للرئيسية</span>
        </button>
        <span className="text-xs text-slate-500">{reports.length} تقرير محفوظ</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
              <FileText className="w-6 h-6 text-emerald-400" />
              التقارير السابقة
            </h2>
            <p className="text-slate-400 text-sm">سجل إنجازاتك اليومية ونسبة تقدمك في كل يوم.</p>
          </div>

          {reports.length > 0 && (
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl px-4 py-3 text-center">
              <div className="text-[11px] text-slate-400 mb-0.5">متوسط الإنجاز</div>
              <div className="text-xl font-bold text-emerald-400 flex items-center gap-1.5 justify-center">
                <TrendingUp className="w-4 h-4" />
                {average}%
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span>جاري تحميل التقارير...</span>
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl p-4 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500">
              <Calendar className="w-7 h-7" />
            </div>
            <p className="text-slate-300 font-medium">لا توجد تقارير محفوظة بعد</p>
            <p className="text-slate-500 text-sm">ابدأ بتعبئة تقرير اليوم وسيظهر هنا مباشرة.</p>
          </div>
        )}

        {!loading && !error && reports.length > 0 && (
          <div className="space-y-3">
            {reports.map((report) => (
              <button
                key={report.id}
                onClick={() => onSelectReport(report.id)}
                className="w-full text-right bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 md:p-5 transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                      <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                      {formatDate(report.report_date)}
                    </div>
                    <div className="text-xs text-slate-500 pr-6">
                      {report.hijri_date ? `${report.hijri_date} هـ` : getHijriDate(report.report_date)}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-32 md:w-44">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">{report.completed} من {report.total}</span>
                        <span className={report.percentage >= 50 ? 'text-emerald-400' : 'text-amber-400'}>
                          {report.percentage}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${report.percentage >= 50 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${report.percentage}%` }}
                        />
                      </div>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
