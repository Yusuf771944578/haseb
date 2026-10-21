import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // تحذير فقط في بيئة التطوير؛ لا يوقف العمل حتى يُضاف الملف .env
  console.warn(
    '[Supabase] لم يتم العثور على إعدادات الاتصال. يرجى إنشاء ملف .env من نموذج .env.example وإضافة VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
