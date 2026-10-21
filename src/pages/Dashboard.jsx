import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  CheckCircle,
  X,
  User,
  Flag,
  Calendar,
  Moon,
  Sun,
  Copy,
  Share2,
  Loader2,
  Edit2,
} from 'lucide-react'

export default function Dashboard({ user, onViewReport, onToast, onNavigateReports }) {
  const [tasks, setTasks] = useState([])
  const [items, setItems] = useState({}) // task_id -> { is_completed, ... }
  const [reportId, setReportId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(new Set())
  const [today, setToday] = useState(new Date().toISOString().slice(0, 10))
  const [hijriAuto, setHijriAuto] = useState('')
  const [hijriManual, setHijriManual] = useState('')
  const [fullName, setFullName] = useState(user.user_metadata?.full_name || '')
  const [circleName, setCircleName] = useState('')
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportText, setReportText] = useState('')
  const [copyConfirmation, setCopyConfirmation] = useState(false)

  // تحميل الملف الشخصي والمهام عند الدخول
  useEffect(() => {
    loadProfile()
    loadTasks()
  }, [user.id])

  // حساب التاريخ الهجري تلقائياً عند التحميل (مع fallback يدوي)
  useEffect(() => {
    let computed = ''
    try {
      computed = new Intl.DateTimeFormat('ar-SA', {
        calendar: 'islamic-umalqura',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date())
    } catch (e) {
      computed = ''
    }
    setHijriAuto(computed)
  }, [])

  const loadProfile = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, circle_name')
      .eq('id', user.id)
      .maybeSingle()
    if (data) {
      setFullName(data.full_name || user.user_metadata?.full_name || '')
      setCircleName(data.circle_name || '')
    }
    setProfileLoaded(true)
  }, [user.id])

  const loadTasks = useCallback(async () => {
    setLoading(true)
    const { data: tasksData } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    setTasks(tasksData || [])
    await ensureReport()
    setLoading(false)
  }, [user.id])

  // التأكد من وجود تقرير لهذا اليوم للمستخدم الحالي؛ وإن لم يوجد، ينشئ تقريراً جديداً
  const ensureReport = useCallback(async () => {
    const { data: existing } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('user_id', user.id)
      .eq('report_date', today)
      .maybeSingle()

    if (existing) {
      setReportId(existing.id)
      await loadItems(existing.id)
      return
    }

    const gregorian = new Date(today).toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const hijri = hijriManual || hijriAuto || null

    const { data: newReport, error } = await supabase
      .from('daily_reports')
      .insert({
        user_id: user.id,
        report_date: today,
        gregorian_date: gregorian,
        hijri_date: hijri,
      })
      .select()
      .single()

    if (!error && newReport) {
      setReportId(newReport.id)
      await loadItems(newReport.id)
    } else if (error) {
      console.error('فشل إنشاء التقرير:', error.message)
    }
  }, [user.id, today, hijriManual, hijriAuto])

  const loadItems = useCallback(async (id) => {
    const { data } = await supabase
      .from('daily_report_items')
      .select('*')
      .eq('report_id', id)
    const map = {}
    ;(data || []).forEach((it) => {
      map[it.task_id] = it
    })
    setItems(map)
  }, [])

  // Toggle إتمام مهمة مع الحفظ الفوري في Supabase والتحقق من ملكية التقرير عبر RLS
  const toggleTask = useCallback(
    async (task) => {
      if (!reportId) return
      setSaving((prev) => new Set([...prev, task.id]))
      const isDone = !(items[task.id]?.is_completed)

      const { error } = await supabase
        .from('daily_report_items')
        .upsert(
          {
            report_id: reportId,
            user_id: user.id,
            task_id: task.id,
            task_title: task.title,
            is_completed: isDone,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'report_id, task_id' },
        )

      if (!error) {
        setItems((prev) => ({
          ...prev,
          [task.id]: { ...(prev[task.id] || {}), is_completed: isDone },
        }))
        onToast('success', `تم ${isDone ? 'تحديد' : 'إلغاء تحديد'} العمل: ${task.title}`)
      } else {
        onToast('error', 'فشل حفظ الحالة. يرجى المحاولة لاحقاً.')
      }
      setSaving((prev) => {
        const next = new Set(prev)
        next.delete(task.id)
        return next
      })
    },
    [reportId, user.id, items, onToast],
  )

  // حفظ البيانات الشخصية (الاسم الكامل، اسم الحلقة)
  const saveProfile = useCallback(async () => {
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName || null,
      circle_name: circleName || null,
      updated_at: new Date().toISOString(),
    })
    if (!error) {
      onToast('success', 'تم حفظ بياناتك الشخصية')
    } else {
      onToast('error', 'فشل حفظ البيانات الشخصية')
    }
  }, [user.id, fullName, circleName, onToast])

  const completedCount = Object.values(items).filter((i) => i.is_completed).length
  const totalCount = tasks.length
  const pct = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 1000) / 10

  const categories = [...new Set(tasks.map((t) => t.category))]

  const gregorianDisplay = new Date(today).toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const hijriDisplay = hijriManual || hijriAuto || 'غير متاح (يمكن إدخاله يدوياً)'

  // توليد نص التقرير منقّح من بيانات قاعدة البيانات الفعلية
  const generateReport = useCallback(() => {
    const lines = []
    lines.push('📊 [تقرير إنجاز طالب - حاسب نفسك]')
    lines.push(`👤 الطالب: ${fullName || 'المستخدم'}`)
    lines.push(`📅 اليوم والتاريخ الميلادي: ${gregorianDisplay}`)
    lines.push(`🌙 الموافق هجرياً: ${hijriDisplay}`)
    lines.push(`🕌 الحلقة: ${circleName || 'غير محدد'}`)
    lines.push(`📈 نتيجة الإنجاز: ${completedCount} من ${totalCount} (${pct}%)`)
    lines.push('📋 تفاصيل الأعمال اليومية:')

    tasks.forEach((t) => {
      const done = items[t.id]?.is_completed
      lines.push(`${done ? '✅' : '❌'} ${t.title}`)
    })

    lines.push('')
    lines.push('✨ الحمد لله الذي بنعمته تتم الصلح')

    setReportText(lines.join('\n'))
    setShowReport(true)
  }, [fullName, gregorianDisplay, hijriDisplay, circleName, completedCount, totalCount, pct, tasks, items])

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
    const url = 'https://wa.me/?text=' + encodeURIComponent(reportText)
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-slate-600">جاري تحميل أعمالك اليومية...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* بطاقة معلومات اليوم والملف الشخصي */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          <div className="col-span-full sm:col-span-2">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-600">اليوم والتاريخ الميلادي:</span>
            </div>
            <div className="text-lg font-bold text-slate-900">{gregorianDisplay}</div>
          </div>
          <div className="col-span-full sm:col-span-2">
            <div className="flex items-center gap-2 mb-1">
              <Moon className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-600">الموافق هجرياً:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-emerald-700">{hijriDisplay}</span>
              {hijriAuto === '' && (
                <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">غير مؤكد</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <User className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">الاسم الكامل:</span>
          </div>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="أدخل اسمك الكامل"
            className="input-field mb-3"
          />
          <div className="flex items-center gap-3 mb-2">
            <Flag className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">اسم الحلقة:</span>
          </div>
          <input
            type="text"
            value={circleName}
            onChange={(e) => setCircleName(e.target.value)}
            placeholder="اسم الحلقة (اختياري)"
            className="input-field mb-3"
          />
          <button onClick={saveProfile} className="btn-outline w-auto">
            <Edit2 className="w-4 h-4 mr-1" /> حفظ البيانات الشخصية
          </button>
        </div>
      </div>

      {/* بطاقات الإحصاء */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-emerald-100 p-4 text-center shadow-sm">
          <div className="text-emerald-600 mb-1"><CheckCircle className="w-6 h-6" /></div>
          <div className="text-2xl font-bold text-slate-900">{completedCount}</div>
          <div className="text-xs text-slate-500">أعمال منجزة</div>
        </div>
        <div className="bg-white rounded-xl border border-rose-100 p-4 text-center shadow-sm">
          <div className="text-rose-600 mb-1"><X className="w-6 h-6" /></div>
          <div className="text-2xl font-bold text-slate-900">{totalCount - completedCount}</div>
          <div className="text-xs text-slate-500">أعمال متبقية</div>
        </div>
        <div className="bg-white rounded-xl border border-amber-100 p-4 text-center shadow-sm">
          <div className="text-amber-600 mb-1"><Sun className="w-6 h-6" /></div>
          <div className="text-2xl font-bold text-slate-900">{pct}%</div>
          <div className="text-xs text-slate-500">نسبة الإنجاز</div>
        </div>
      </div>

      {/* قائمة الأعمال */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">قائمة الأعمال اليومية</h3>
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
            {totalCount} عمل
          </span>
        </div>

        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2.5 px-2">
                {cat}
              </h4>
              <div className="space-y-1.5">
                {tasks.filter((t) => t.category === cat).map((t) => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    done={items[t.id]?.is_completed === true}
                    onToggle={toggleTask}
                    saving={saving.has(t.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* أزرار التقرير */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={generateReport}
          disabled={totalCount === 0}
          className="btn-primary w-full sm:w-auto"
        >
          <Flag className="w-5 h-5" /> إنشاء تقرير اليوم
        </button>
        {showReport && (
          <div className="flex-1 sm:w-auto">
            <button
              onClick={() => onNavigateReports?.()}
              className="w-full btn-outline text-sm"
            >
                            عرض التقارير السابقة
            </button>
          </div>
        )}
      </div>

      {/* نافذة تقرير اليوم */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowReport(false)}>
          <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 sm:mx-6 shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">تقرير اليوم</h3>
              <button onClick={() => setShowReport(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <textarea
              readOnly
              value={reportText}
              className="w-full h-64 mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-700 focus:outline-none resize-none"
            />
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={handleCopy}
                disabled={copyConfirmation}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-lg font-medium disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {copyConfirmation ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> تم النسخ
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> نسخ التقرير
                  </>
                )}
              </button>
              <button
                onClick={handleWhatsApp}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" /> مشاركة عبر واتساب
              </button>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={generateReport} className="flex-1 btn-outline text-sm">تجديد التقرير</button>
              <button onClick={() => setShowReport(false)} className="flex-1 btn-outline text-sm">العودة إلى المحاسبة اليومية</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TaskItem({ task, done, onToggle, saving }) {
  return (
    <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer group">
      <span className="flex-1 text-right text-slate-800 font-medium">{task.title}</span>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          className="w-5 h-5 rounded border border-slate-300 accent-emerald-600 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
          checked={done}
          onChange={() => onToggle(task)}
          disabled={saving}
        />
        {done ? (
          <CheckCircle className="w-5 h-5 text-emerald-500" />
        ) : (
          <X className="w-5 h-5 text-slate-400" />
        )}
      </div>
    </label>
  )
}
