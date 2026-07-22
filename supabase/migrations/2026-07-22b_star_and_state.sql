-- ============================================================
-- 追加ぶん その2（2026-07-22）
--   ① 生年月日と名前（AIがその人に合わせて話すため）
--   ② 状態パラメーターを1日2回（朝・夜）までにする
--
-- このファイルの中身を全部コピーして、Supabase の SQL Editor に貼って実行するだけ。
-- 何度流しても壊れません。
-- ============================================================

-- ① 生年月日と、名前の読み
alter table public.user_settings add column if not exists birth_date date;
alter table public.user_settings add column if not exists birth_name text;

-- ② 状態パラメーター（旧: 感情の10段階）
--    朝と夜で1回ずつ。同じ枠に2回目を入れようとしても入らないようにする。
alter table public.emotion_logs add column if not exists slot text;
alter table public.emotion_logs add column if not exists energy int;

-- 既存データがあれば朝扱いにしてから、1日2回の制約をかける
update public.emotion_logs set slot = 'morning' where slot is null;

create unique index if not exists uq_emotion_user_date_slot
  on public.emotion_logs(user_id, date, slot);

-- ③ シンガワールドでの会話
--    既存の会話テーブルは「朝」「夜」しか入らない作りなので、こちらは分ける。
create table if not exists public.shinga_conversations (
  id bigserial primary key,
  user_id text not null,
  date date not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  place text,                            -- そのとき地図のどこにいたか
  created_at timestamptz default now()
);
create index if not exists idx_shinga_conv_user on public.shinga_conversations(user_id, created_at desc);
alter table public.shinga_conversations enable row level security;
