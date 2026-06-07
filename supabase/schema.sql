-- secretary-ai-next データベーススキーマ
-- Supabase の SQL Editor で実行してください

-- users テーブル (NextAuth が auto-create するので不要だが、参考)
-- create table public.users (
--   id uuid primary key default uuid_generate_v4(),
--   email text unique,
--   name text,
--   image text,
--   created_at timestamptz default now()
-- );

-- ユーザーごとの設定（APIキー・通知トピック等）
create table if not exists public.user_settings (
  user_id text primary key,
  gemini_api_key text,                  -- 暗号化推奨だが今はプレーン
  ntfy_topic text,
  work_email text,                       -- 仕事用メールアドレス
  drive_root_folder_id text,
  google_refresh_token text,             -- Google API用 refresh token (calendar/tasks/drive/gmail)
  google_scopes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 会話履歴
create table if not exists public.conversations (
  id bigserial primary key,
  user_id text not null,
  date date not null,
  mode text not null check (mode in ('morning', 'evening')),
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);
create index if not exists idx_conv_user_date on public.conversations(user_id, date, mode);

-- 抽出タスク履歴
create table if not exists public.extracted_tasks (
  id bigserial primary key,
  user_id text not null,
  date date not null,
  mode text,
  source text,
  title text not null,
  notes text,
  due date,
  category text,
  urgency text,
  importance text,
  time_label text,
  google_task_id text,
  status text default 'pending',
  created_at timestamptz default now()
);

-- ブリーフィング（朝/夜の本文・通知用に再利用）
create table if not exists public.briefings (
  id bigserial primary key,
  user_id text not null,
  date date not null,
  mode text not null,
  body text not null,
  created_at timestamptz default now(),
  unique(user_id, date, mode)
);

-- 通知ログ
create table if not exists public.notifications (
  id bigserial primary key,
  user_id text not null,
  channel text not null,
  type text not null,
  body text not null,
  sent_at timestamptz default now(),
  success boolean default true,
  error text
);
create index if not exists idx_notif_user_sent on public.notifications(user_id, sent_at);

-- クイックメモ（1ユーザー1レコード）
create table if not exists public.quickmemo (
  user_id text primary key,
  body text default '',
  updated_at timestamptz default now()
);

-- タスク手動分類（Googleタスクと紐づけ、AIで上書きさせない用）
create table if not exists public.manual_labels (
  user_id text not null,
  google_task_id text not null,
  category text,
  urgency text,
  importance text,
  time_label text,
  reason text,
  updated_at timestamptz default now(),
  primary key (user_id, google_task_id)
);

-- AI分類キャッシュ
create table if not exists public.classify_cache (
  user_id text not null,
  cache_key text not null,
  category text,
  urgency text,
  importance text,
  time_label text,
  reason text,
  cached_at timestamptz default now(),
  primary key (user_id, cache_key)
);

-- Row Level Security（各ユーザーが自分のデータだけ見られる）
alter table public.user_settings enable row level security;
alter table public.conversations enable row level security;
alter table public.extracted_tasks enable row level security;
alter table public.briefings enable row level security;
alter table public.notifications enable row level security;
alter table public.quickmemo enable row level security;
alter table public.manual_labels enable row level security;
alter table public.classify_cache enable row level security;

-- ポリシー（service_role キーは bypass されるので、サーバー側で user_id 一致を保証）
-- 今はサービスロール経由で全アクセスする想定。クライアントから直接読まない。
