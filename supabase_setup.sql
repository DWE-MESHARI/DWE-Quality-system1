-- =====================================================================
-- نظام إدارة جودة خدمة العملاء — إعداد قاعدة البيانات في Supabase
-- طريقة الاستخدام: افتحي SQL Editor من القائمة اليسرى ← New query
-- الصقي هذا الملف كاملًا ← اضغطي Run
-- =====================================================================

-- 1) جدول الموظفات
create table if not exists emp (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name       text not null,
  role       text,
  active     boolean not null default true
);

-- 2) جدول التقييمات (كل تقييم مرتبط بموظفة عبر emp_id)
create table if not exists ev (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  emp_id     bigint not null references emp(id) on delete cascade,
  date       date not null,
  calls      int8   not null default 0,
  q          float8 not null default 0,   -- Quality %
  fcr        float8 not null default 0,   -- FCR %
  com        float8 not null default 0,   -- الالتزام %
  cs         float8 not null default 0,   -- CSAT %
  comp       int8   not null default 0,   -- عدد الشكاوى
  note       text,
  -- لا يمكن تسجيل أكثر من تقييم واحد لنفس الموظفة في نفس اليوم
  unique (emp_id, date)
);

-- 3) جدول ملاحظات تقرير كل موظفة (نقاط القوة والتحسين والإجراء المقترح)
create table if not exists rep (
  emp_id bigint primary key references emp(id) on delete cascade,
  s      text,  -- نقاط القوة
  i      text,  -- نقاط التحسين
  a      text   -- الإجراء المقترح
);

-- 4) سجل التغييرات (من عدّل ماذا ومتى)
create table if not exists log (
  id         bigint generated always as identity primary key,
  t          timestamptz not null default now(),
  user_id    uuid references auth.users(id),
  user_name  text,
  action     text not null,   -- إضافة / تعديل / حذف / استيراد
  details    text not null
);

-- 5) إعدادات النظام (صف واحد فقط: الأوزان وحدود التنبيهات والأهداف)
create table if not exists cfg (
  id   int primary key default 1,
  wq   float8 not null default 40,  -- وزن Quality
  wf   float8 not null default 30,  -- وزن FCR
  wc   float8 not null default 30,  -- وزن الالتزام
  wa   float8 not null default 0,   -- وزن CSAT
  t1   float8 not null default 90,  -- حد "ممتاز"
  t2   float8 not null default 80,  -- حد "جيد جدًا"
  t3   float8 not null default 70,  -- حد "يحتاج تحسين"
  tq   float8 not null default 90,  -- هدف Quality الشهري
  tf   float8 not null default 85,  -- هدف FCR الشهري
  tc   float8 not null default 90,  -- هدف الالتزام الشهري
  ta   float8 not null default 85,  -- هدف CSAT الشهري
  tp   float8 not null default 90,  -- هدف الأداء العام الشهري
  constraint cfg_single_row check (id = 1)
);
insert into cfg (id) values (1) on conflict (id) do nothing;

-- 6) صلاحيات المستخدمين (admin / editor / viewer)
create table if not exists roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role    text not null check (role in ('admin','editor','viewer'))
);

-- =====================================================================
-- تفعيل الحماية على مستوى الصفوف (RLS) على كل جدول
-- =====================================================================
alter table emp   enable row level security;
alter table ev    enable row level security;
alter table rep   enable row level security;
alter table log   enable row level security;
alter table cfg   enable row level security;
alter table roles enable row level security;

-- دالة مساعدة: هل المستخدم الحالي مسجَّل في roles؟ وما دوره؟
create or replace function has_role() returns boolean
language sql security definer stable as $$
  select exists (select 1 from roles where user_id = auth.uid());
$$;

create or replace function my_role() returns text
language sql security definer stable as $$
  select role from roles where user_id = auth.uid();
$$;

create or replace function can_write() returns boolean
language sql security definer stable as $$
  select my_role() in ('admin','editor');
$$;

-- roles: كل مستخدم يقرأ صفّه فقط، ولا يكتب أحد فيه من التطبيق
create policy "read own role" on roles for select using (auth.uid() = user_id);

-- emp / ev / rep: قراءة لمن له دور، كتابة لمن هو admin أو editor
create policy "emp read" on emp for select using (has_role());
create policy "emp write" on emp for all using (can_write()) with check (can_write());

create policy "ev read" on ev for select using (has_role());
create policy "ev write" on ev for all using (can_write()) with check (can_write());

create policy "rep read" on rep for select using (has_role());
create policy "rep write" on rep for all using (can_write()) with check (can_write());

-- log: قراءة لمن له دور، وإضافة فقط بلا تعديل أو حذف (سجل يبقى كما هو)
create policy "log read" on log for select using (has_role());
create policy "log insert" on log for insert with check (can_write());

-- cfg: قراءة لمن له دور، وتعديل لـ admin فقط
create policy "cfg read" on cfg for select using (has_role());
create policy "cfg write" on cfg for all using (my_role() = 'admin') with check (my_role() = 'admin');

-- =====================================================================
-- تفعيل التحديث اللحظي (Realtime) على الجداول التي تحتاجه
-- =====================================================================
alter publication supabase_realtime add table emp, ev, rep, log, cfg;
