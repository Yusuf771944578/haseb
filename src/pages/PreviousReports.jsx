import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Sparkles, CheckCircle2, Flame, 
  ArrowRight, Share2, TrendingUp, ShieldCheck, FileText, LogOut 
} from 'lucide-react'

export default function Dashboard({ user, onStartReport, onViewPrevious, onLogout }) {
  const [streak, setStreak] = useState(0)
  const [quote, setQuote] = useState('')

  const quotes = [
    "«حَاسِبُوا أَنْفُسَكُمْ قَبْلَ أَنْ تُحَاسَبُوا، وَزِنُوا أَنْفُسَكُمْ قَبْلَ أَنْ تُوَزَنُوا»",
    "«أَحَبُّ الأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ»",
    "«الكَيِّسُ مَنْ دَانَ نَفْسَهُ وَعَمِلَ لِمَا بَعْدَ المَوْتِ»"
  ]

  useEffect(() => {
    setQuote(quotes[Math.floor(Math.random() * quotes.length)])
    if (user?.id) loadUserStreak()
  }, [user?.id])

  const loadUserStreak = async () => {
    try {
      const { data } = await supabase
        .from('daily_reports')
        .select('id')
        .eq('user_id', user.id)

      if (data) setStreak(data.length)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans dir-rtl">
      {/* الهيدر العلوي */}
      <header className="max-w-5xl mx-auto flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
              منصة حاسب نفسك
            </h1>
            <p className="text-xs text-slate-400">محطتك اليومية للتطوير والارتقاء الذاتي</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-xs font-medium text-amber-400">
            <Flame className="w-4 h-4 fill-amber-400" />
            <span>{streak} تقارير أنجزتها</span>
          </div>

          <button
            onClick={onLogout}
            type="button"
            title="تسجيل الخروج"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-slate-400 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* القسم الرئيسي / البنر التحفيزي */}
      <main className="max-w-5xl mx-auto space-y-6">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900/40 via-slate-900 to-slate-950 border border-emerald-500/20 p-6 md:p-10 shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" /> أهلاً بك، {user?.user_metadata?.full_name || user?.email || 'يا بطل الإنجاز'}
            </span>
            <h2 className="text-2xl md:text-4xl font-extrabold text-white leading-tight">
              اجعل يومك مقياساً لتقدمك ورسالة لنجاحك القادم
            </h2>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
              {quote}
            </p>
            
            {/* الأزرار التفاعلية */}
            <div className="pt-2 flex flex-wrap gap-3">
              <button 
                type="button"
                onClick={onStartReport}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span>تعبئة تقرير اليوم</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>

              <button 
                type="button"
                onClick={onViewPrevious}
                className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold px-5 py-3 rounded-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>التقارير السابقة</span>
              </button>
            </div>
          </div>

          <div className="absolute -left-10 -bottom-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        </section>

        {/* بطاقات الميزات الإضافية */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-200 text-base mb-1">محاسبة دقيقة</h3>
            <p className="text-xs text-slate-400">تتبع أداءك العبادي واليومي بكل سهولة ووضوح عبر جداول منظمّة.</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-200 text-base mb-1">تقارير إحصائية</h3>
            <p className="text-xs text-slate-400">استعرض سجلات إنجازك والأيام السابقة لملاحظة استمراريتك.</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
              <Share2 className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-200 text-base mb-1">مشاركة فورية</h3>
            <p className="text-xs text-slate-400">صمّم تقريرك بضغطة زر وشاركه مع معلمك أو إمام الحلقة عبر الواتساب.</p>
          </div>
        </section>
      </main>
    </div>
  )
}