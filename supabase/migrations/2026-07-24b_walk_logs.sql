-- パラレルウォークの記録（ChatGPTでのワーク後、要約を貼って蓄積する）
-- 中身をコピーして Supabase の SQL Editor で Run するだけ。既存データは壊れない。
create table if not exists public.walk_logs (
  id bigserial primary key,
  user_id text not null,
  date date not null,
  summary text not null,          -- ChatGPTでのワークの要約（本人が貼る）
  created_at timestamptz default now()
);
create index if not exists idx_walk_logs_user on public.walk_logs(user_id, created_at desc);
alter table public.walk_logs enable row level security;
