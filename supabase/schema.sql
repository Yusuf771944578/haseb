-- ============================================================================
-- موقع "حاسب نفسك" | قاعدة بيانات Supabase (PostgreSQL)
-- الغرض: تخزين ملفات المستخدمين، الأعمال اليومية، التقارير، وبنود التقارير
-- مع تفعيل Row Level Security (RLS) لعزل بيانات كل مستخدم عن غيره
-- ============================================================================

-- تفعيل امتداد UUID إن لم يكن مفعلاً
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- الجدول الأول: profiles (ملفات المستخدمين الشخصية الإضافية)
-- مرتبط بمعرّف المستخدم في Supabase auth.users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  circle_name text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- الجدول الثاني: daily_tasks (الأعمال اليومية الافتراضية المشتركة)
-- قائمة أعمال افتراضية قابلة للتعديل والتطوير مستقبلاً
-- ---------------------------------------------------------------------------
create table public.daily_tasks (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  category text not null,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- الجدول الثالث: daily_reports (تقرير المستخدم في يوم محدد)
-- قيد فريد يضمن تقريراً يومياً واحداً لكل مستخدم لكل تاريخ
-- ---------------------------------------------------------------------------
create table public.daily_reports (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  report_date date not null,
  gregorian_date text,
  hijri_date text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint one_report_per_user_per_day unique (user_id, report_date)
);

-- ---------------------------------------------------------------------------
-- الجدول الرابع: daily_report_items (ربط الأعمال بتقرير المستخدم يومياً)
-- يضمن عدم تكرار العمل نفسه داخل التقرير الواحد، والتحقق من ملكية التقرير
-- ---------------------------------------------------------------------------
create table public.daily_report_items (
  id uuid default uuid_generate_v4() primary key,
  report_id uuid references public.daily_reports(id) on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  task_id uuid references public.daily_tasks(id) on delete set null,
  task_title text not null, -- اسم العمل وقت تسجيله (للمحافظة على محتوى التقارير القديمة)
  is_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint one_task_per_report unique (report_id, task_id)
);

-- فهارس لتحسين أداء الاستعلامات
create index idx_daily_reports_user_date on public.daily_reports(user_id, report_date);
create index idx_daily_report_items_report on public.daily_report_items(report_id);
create index idx_daily_report_items_user on public.daily_report_items(user_id);

-- ---------------------------------------------------------------------------
-- زرع الأعمال اليومية الافتراضية (35 عملاً) gemäß المتطلبات
-- ---------------------------------------------------------------------------
insert into public.daily_tasks (title, category, sort_order) values
-- أعمال الليل والعشاء
('ترديد أذان العشاء', 'أعمال الليل والعشاء', 1),
('صلاة العشاء', 'أعمال الليل والعشاء', 2),
('أذكار بعد صلاة العشاء', 'أعمال الليل والعشاء', 3),
('سنة العشاء', 'أعمال الليل والعشاء', 4),
('قيام الليل', 'أعمال الليل والعشاء', 5),
('الوتر', 'أعمال الليل والعشاء', 6),
('دعاء السحر', 'أعمال الليل والعشاء', 7),
('استغفار السحر', 'أعمال الليل والعشاء', 8),
-- أعمال الفجر والصباح
('ترديد أذان الفجر', 'أعمال الفجر والصباح', 9),
('سنة الفجر', 'أعمال الفجر والصباح', 10),
('صلاة الفجر', 'أعمال الفجر والصباح', 11),
('أذكار بعد صلاة الفجر', 'أعمال الفجر والصباح', 12),
('أذكار الصباح', 'أعمال الفجر والصباح', 13),
('الورد القرآني', 'أعمال الفجر والصباح', 14),
('صلاة الشروق', 'أعمال الفجر والصباح', 15),
('صلاة الضحى', 'أعمال الفجر والصباح', 16),
-- أعمال الظهر
('ترديد أذان الظهر', 'أعمال الظهر', 17),
('سنة الظهر القبلية', 'أعمال الظهر', 18),
('صلاة الظهر', 'أعمال الظهر', 19),
('أذكار بعد صلاة الظهر', 'أعمال الظهر', 20),
('سنة الظهر البعدية', 'أعمال الظهر', 21),
-- أعمال العصر والمساء
('ترديد أذان العصر', 'أعمال العصر والمساء', 22),
('سنة العصر', 'أعمال العصر والمساء', 23),
('صلاة العصر', 'أعمال العصر والمساء', 24),
('أذكار بعد صلاة العصر', 'أعمال العصر والمساء', 25),
('أذكار المساء', 'أعمال العصر والمساء', 26),
-- أعمال المغرب
('ترديد أذان المغرب', 'أعمال المغرب', 27),
('صلاة المغرب', 'أعمال المغرب', 28),
('أذكار بعد صلاة المغرب', 'أعمال المغرب', 29),
('سنة المغرب', 'أعمال المغرب', 30),
-- أعمال عامة
('أذكار النوم', 'أعمال عامة', 31),
('الاستغفار', 'أعمال عامة', 32),
('الحوقلة', 'أعمال عامة', 33),
('الصلاة على النبي ﷺ', 'أعمال عامة', 34),
('الصدقة', 'أعمال عامة', 35)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- تفعيل Row Level Security (RLS) على جميع الجداول التي تحتوي على بيانات خاصة
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.daily_reports enable row level security;
alter table public.daily_report_items enable row level security;
alter table public.daily_tasks enable row level security;

-- ---------------------------------------------------------------------------
-- سياسات جدول profiles
-- ---------------------------------------------------------------------------
-- قراءة الملف الشخصي الخاص فقط
create policy "المستخدم يستطيع قراءة ملفه الشخصي فقط"
  on public.profiles for select
  using ( auth.uid() = id );

-- إنشاء الملف الشخصي أثناء التسجيل (تُنفذ عبر دالة المحفّز أو الواجهة)
create policy "المستخدم يستطيع إنشاء ملفه الشخصي"
  on public.profiles for insert
  with check ( auth.uid() = id );

-- تعديل الملف الشخصي الخاص فقط
create policy "المستخدم يستطيع تعديل ملفه الشخصي"
  on public.profiles for update
  using ( auth.uid() = id );

-- حذف الملف الشخصي الخاص فقط
create policy "المستخدم يستطيع حذف ملفه الشخصي"
  on public.profiles for delete
  using ( auth.uid() = id );

-- ---------------------------------------------------------------------------
-- سياسات جدول daily_tasks (قائمة عامة مشتركة)
-- يُسمح للجميع بقراءة الأعمال النشطة فقط، ولا يُسمح للمستخدم العادي بتعديلها أو حذفها
-- ---------------------------------------------------------------------------
create policy "الجميع يستطيع عرض الأعمال النشطة فقط"
  on public.daily_tasks for select
  using ( is_active = true );

-- ---------------------------------------------------------------------------
-- سياسات جدول daily_reports (تقارير المستخدم)
-- ---------------------------------------------------------------------------
create policy "المستخدم يستطيع قراءة تقاريره فقط"
  on public.daily_reports for select
  using ( auth.uid() = user_id );

create policy "المستخدم يستطيع إنشاء تقرير خاص به"
  on public.daily_reports for insert
  with check ( auth.uid() = user_id );

create policy "المستخدم يستطيع تعديل تقاريره فقط"
  on public.daily_reports for update
  using ( auth.uid() = user_id );

create policy "المستخدم يستطيع حذف تقاريره فقط"
  on public.daily_reports for delete
  using ( auth.uid() = user_id );

-- ---------------------------------------------------------------------------
-- سياسات جدول daily_report_items (بنود التقارير)
-- متطلب أساسي: التحقق من ملكية التقرير المرتبط بالسجل، وليس الاكتفاء بأن
-- user_id المرسل يساوي معرّف المستخدم الحالي.
-- ---------------------------------------------------------------------------
create policy "المستخدم يستطيع قراءة بنود تقاريره فقط"
  on public.daily_report_items for select
  using ( auth.uid() = user_id );

create policy "المستخدم يستطيع إضافة بنود إلى تقاريره فقط"
  on public.daily_report_items for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.daily_reports
      where id = report_id and user_id = auth.uid()
    )
  );

create policy "المستخدم يستطيع تعديل بنود تقاريره فقط"
  on public.daily_report_items for update
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.daily_reports
      where id = report_id and user_id = auth.uid()
    )
  );

create policy "المستخدم يستطيع حذف بنود تقاريره فقط"
  on public.daily_report_items for delete
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.daily_reports
      where id = report_id and user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- محفّز تلقائي لإنشاء ملف شخصي عند إنشاء حساب جديد في Supabase Auth
-- (يُنفّذ بصلاحية المسؤول داخل قاعدة البيانات، ولا يكشف أي مفتاح سري للواجهة)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, circle_name, created_at)
  values (
    new.id,
    coalesce(raw_user_meta_data(new) ->> 'full_name', null),
    null,
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- ============================================================================
-- نهاية سكربت قاعدة البيانات
-- ملاحظة: لا تضع مفتاح service_role في واجهة المستخدم. استخدمanon public key فقط.
-- ============================================================================
