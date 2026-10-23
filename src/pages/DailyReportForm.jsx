import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Calendar, CheckSquare, Square, Send } from 'lucide-react'

export default function DailyReportForm({ user, onBack, onSaved, onToast }) {
  const [tasks, setTasks] = useState([])
  const [taskStatus, setTaskStatus] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadTasks()
  }, [])

  // تحميل حالة تقرير اليوم نفسه إن كان محفوظاً سابقاً (لتعديله بدل إنشاء تقرير مكرر)
  useEffect(() => {
    if (tasks.length === 0) return
    let cancelled = false

    const loadSavedStatus = async () => {
      const { data: report } = await supabase
        .from('daily_reports')
        .select('id')
        .eq('user_id', user.id)
        .eq('report_date', reportDate)
        .maybeSingle()

      if (!report) {
        if (!cancelled) setTaskStatus({})
        return
      }

      const { data: items } = await supabase
        .from('daily_report_items')
        .select('task_id, is_completed')
        .eq('report_id', report.id)

      if (!cancelled) {
        const map = {}
        ;(items || []).forEach(it => { if (it.task_id) map[it.task_id] = it.is_completed })
        setTaskStatus(map)
      }
    }

    loadSavedStatus()
    return () => { cancelled = true }
  }, [reportDate, tasks.length, user.id])

  const getHijriDate = (dateString) => {
    try {
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
        day: 'numeric', month: 'long', year: 'numeric'
      }).format(new Date(`${dateString}T12:00:00`))
    } catch {
      return null
    }
  }

  const loadTasks = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('daily_tasks')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error

      if (data) {
        setTasks(data)
        const initialMap = {}
        data.forEach(t => { initialMap[t.id] = false })
        setTaskStatus(initialMap)
      }
    } catch (err) {
      console.error(err)
      if (onToast) onToast('error', 'فشل في تحميل المهام اليومية')
    } finally {
      setLoading(false)
    }
  }

  const toggleTask = (taskId) => {
    setTaskStatus(prev => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      // التحقق أولاً إن كان هناك تقرير محفوظ لنفس اليوم (قيد: تقرير واحد لكل مستخدم لكل تاريخ)
      const { data: existingReport, error: findError } = await supabase
        .from('daily_reports')
        .select('id')
        .eq('user_id', user.id)
        .eq('report_date', reportDate)
        .maybeSingle()

      if (findError) throw findError

      let reportId = existingReport?.id

      if (reportId) {
        // تحديث التقرير الموجود وحذف بنوده القديمة قبل إعادة إدخالها
        const { error: updateError } = await supabase
          .from('daily_reports')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', reportId)
          .eq('user_id', user.id)

        if (updateError) throw updateError

        const { error: deleteError } = await supabase
          .from('daily_report_items')
          .delete()
          .eq('report_id', reportId)
          .eq('user_id', user.id)

        if (deleteError) throw deleteError
      } else {
        const { data: reportData, error: reportError } = await supabase
          .from('daily_reports')
          .insert([
            {
              user_id: user.id,
              report_date: reportDate,
              gregorian_date: reportDate,
              hijri_date: getHijriDate(reportDate)
            }
          ])
          .select()
          .single()

        if (reportError) throw reportError
        reportId = reportData.id
      }

      // إدخال بنود التقرير مع الحقول الإلزامية (user_id و task_title) المطلوبة في المخطط
      const reportItems = tasks.map(t => ({
        report_id: reportId,
        user_id: user.id,
        task_id: t.id,
        task_title: t.title,
        is_completed: !!taskStatus[t.id]
      }))

      const { error: itemsError } = await supabase
        .from('daily_report_items')
        .insert(reportItems)

      if (itemsError) throw itemsError

      if (onToast) onToast('success', 'تم حفظ التقرير اليومي بنجاح!')
      if (onSaved) onSaved(reportId)
    } catch (err) {
      console.error(err)
      if (onToast) onToast('error', `حدث خطأ أثناء حفظ التقرير: ${err.message || ''}`)
    } finally {
      setSaving(false)
    }
  }

  const completedCount = Object.values(taskStatus).filter(Boolean).length
  const completionPercentage = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-slate-400">
        <p className="animate-pulse">جاري تحميل المهام اليومية...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 dir-rtl">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          type="button"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 rotate-180" />
          <span>العودة للرئيسية</span>
        </button>
        <div className="text-xs text-slate-500 font-mono">تاريخ اليوم: {reportDate}</div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">تعبئة التقرير اليومي</h2>
          <p className="text-slate-400 text-sm">حدد الأفعال والأعمال التي قمت بإنجازها اليوم.</p>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400">نسبة إنجاز اليوم</span>
            <div className="text-xl font-bold text-emerald-400">{completedCount} من {tasks.length} ({completionPercentage}%)</div>
          </div>
          <div className="w-24 h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" /> تاريخ التقرير
            </label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-300 block">الأعمال اليومية والعبادات:</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tasks.map((task) => {
                const isDone = !!taskStatus[task.id]
                return (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                      isDone 
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200' 
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {isDone ? (
                      <CheckSquare className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-600 shrink-0" />
                    )}
                    <span className="text-sm font-medium leading-relaxed">{task.title}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4 rotate-180" />
            <span>{saving ? 'جاري حفظ التقرير...' : 'حفظ التقرير'}</span>
          </button>
        </form>
      </div>
    </div>
  )
}