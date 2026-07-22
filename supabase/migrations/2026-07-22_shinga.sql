-- ============================================================
-- シンガワールド用の追加ぶんだけ（2026-07-22）
--
-- このファイルの中身を全部コピーして、Supabase の SQL Editor に貼って実行するだけ。
-- ・既存のデータには一切触りません（新しく4つ増やすだけ）
-- ・2回流しても壊れません（if not exists なので、すでにあれば何もしない）
-- ============================================================

-- ① クエスト: シンガワールドで見つけた「人生で体験したいこと」
create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  body text default '',
  category text default 'life',
  status text not null default 'active',
  source_conversation_id bigint,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_quests_user on public.quests(user_id, status, updated_at desc);

-- ② タスクとクエストのつながりを覚えておく場所
--    タスク本体は Google ToDo 側にあるので、ここで外付けして紐づける。
--    ここに無いタスク（＝今までのタスク）は「出自なし」として今まで通り動く。
create table if not exists public.task_links (
  user_id text not null,
  google_task_id text not null,
  source_type text,
  source_quest_id uuid,
  source_conversation_id bigint,
  created_at timestamptz default now(),
  primary key (user_id, google_task_id)
);
create index if not exists idx_task_links_quest on public.task_links(user_id, source_quest_id);

-- ③ 振り返り記録
create table if not exists public.quest_reflections (
  id bigserial primary key,
  user_id text not null,
  quest_id uuid not null,
  google_task_id text,
  body text not null,
  emotion_before int,
  emotion_after int,
  gap text,
  next_step text,
  created_at timestamptz default now()
);
create index if not exists idx_reflections_quest on public.quest_reflections(user_id, quest_id, created_at desc);

-- ④ 感情の10段階記録
create table if not exists public.emotion_logs (
  id bigserial primary key,
  user_id text not null,
  date date not null,
  level int not null check (level between 1 and 10),
  note text default '',
  quest_id uuid,
  created_at timestamptz default now()
);
create index if not exists idx_emotion_user_date on public.emotion_logs(user_id, date desc);

-- 他人のデータが見えないようにする設定（既存テーブルと同じ扱い）
alter table public.quests enable row level security;
alter table public.task_links enable row level security;
alter table public.quest_reflections enable row level security;
alter table public.emotion_logs enable row level security;
