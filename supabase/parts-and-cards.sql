-- ══════════════════════════════════════════════════════════════
-- Singa World 追加テーブル（まとめて1回で流せます）
--   1) guardians   … 内なる子の神殿で解放したガーディアン（四守の環）
--   2) skill_cards … ワークで手に入れたスキルカード（金・銀・銅）
--   3) deep_reads  … ディープアイデンティティの読み取り記録
-- 何度流しても壊れません（IF NOT EXISTS）。
-- ══════════════════════════════════════════════════════════════

-- 1) 解放したガーディアン（色ごとに1体）
create table if not exists public.guardians (
  id          bigserial primary key,
  user_id     text not null,
  color       text not null check (color in ('red','blue','green','yellow')),
  wish        text,                       -- 「本当はどうしたい？」の答え
  date        text not null,              -- JSTの日付 YYYY-MM-DD
  created_at  timestamptz not null default now(),
  unique (user_id, color)
);
create index if not exists guardians_user_idx on public.guardians (user_id);

-- 2) スキルカード（同じ key は1枚だけ）
create table if not exists public.skill_cards (
  id          bigserial primary key,
  user_id     text not null,
  key         text not null,
  title       text not null,
  body        text,
  rarity      text not null default 'bronze' check (rarity in ('bronze','silver','gold')),
  source      text,
  date        text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, key)
);
create index if not exists skill_cards_user_idx on public.skill_cards (user_id, created_at desc);

-- 3) ディープアイデンティティの読み取り
create table if not exists public.deep_reads (
  id          bigserial primary key,
  user_id     text not null,
  date        text not null,
  body        text,
  created_at  timestamptz not null default now()
);
create index if not exists deep_reads_user_idx on public.deep_reads (user_id, date desc);

-- サーバ（service role）からのみ触るので RLS は有効化して全拒否のままでOK
alter table public.guardians   enable row level security;
alter table public.skill_cards enable row level security;
alter table public.deep_reads  enable row level security;

-- ══════════════════════════════════════════════════════════════
-- 発信スタジオ（SNSアウトプット）
--   4) methods         … 育てるメソッド（1ユーザー1つ・資産がたまる）
--   5) broadcast_posts … 生成したカルーセル投稿
--   6) user_settings.referred_by … 紹介リンク（?ref=）で来た人の記録
-- ══════════════════════════════════════════════════════════════

create table if not exists public.methods (
  user_id     text primary key,
  name        text not null default '',
  tagline     text not null default '',
  assets      jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create table if not exists public.broadcast_posts (
  id          bigserial primary key,
  user_id     text not null,
  date        text not null,
  angle       text not null default '',
  format      text not null default '',
  title       text not null default '',
  slides      jsonb not null default '[]'::jsonb,
  caption     text not null default '',
  hashtags    jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists broadcast_posts_user_idx on public.broadcast_posts (user_id, created_at desc);

alter table public.user_settings add column if not exists referred_by text;

alter table public.methods         enable row level security;
alter table public.broadcast_posts enable row level security;

-- ══════════════════════════════════════════════════════════════
-- 自分の取扱説明書
--   7) manual_answers … 16問の回答（1ユーザー1件・上書き）
--   8) manuals        … 生成した取扱説明書（何度でも作れる／履歴が残る）
-- ══════════════════════════════════════════════════════════════

create table if not exists public.manual_answers (
  user_id     text primary key,
  answers     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create table if not exists public.manuals (
  id          bigserial primary key,
  user_id     text not null,
  date        text not null,
  headline    text not null default '',
  sections    jsonb not null default '[]'::jsonb,
  actions     jsonb not null default '[]'::jsonb,
  scores      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists manuals_user_idx on public.manuals (user_id, created_at desc);

alter table public.manual_answers enable row level security;
alter table public.manuals        enable row level security;

-- ══════════════════════════════════════════════════════════════
-- 発信の素材：ワーク1回ぶんの記録
--   9) work_sessions … ワークが終わるたびに1件たまる。投稿はここから作る
--      （直近の会話をまとめて漁ると、やってもいない話題が主役になるため）
-- ══════════════════════════════════════════════════════════════

create table if not exists public.work_sessions (
  id          bigserial primary key,
  user_id     text not null,
  date        text not null,
  mode        text not null,
  title       text not null default '',
  summary     text not null default '',
  insights    jsonb not null default '[]'::jsonb,
  quotes      jsonb not null default '[]'::jsonb,
  used        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists work_sessions_user_idx on public.work_sessions (user_id, created_at desc);

alter table public.work_sessions enable row level security;

-- ══════════════════════════════════════════════════════════════
-- プッシュ通知の購読先
--  10) push_subscriptions … 端末ごとの通知の宛先
--      ※ これが無いと「通知ON」を押しても保存されず、
--        テスト送信で「購読が見つからなかった」になる
-- ══════════════════════════════════════════════════════════════

create table if not exists public.push_subscriptions (
  id          bigserial primary key,
  user_id     text not null,
  endpoint    text not null unique,   -- 端末ごとに1件（upsert のキー）
  p256dh      text not null,
  auth        text not null,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- ══════════════════════════════════════════════════════════════
-- 散歩のおとも（歩数）
--  11) step_logs … 1日1行。アプリを開いて歩いたぶんが積み上がる
-- ══════════════════════════════════════════════════════════════

create table if not exists public.step_logs (
  id          bigserial primary key,
  user_id     text not null,
  date        text not null,              -- JSTの日付 YYYY-MM-DD
  steps       integer not null default 0,
  seconds     integer not null default 0, -- 歩いた時間の合計
  sessions    integer not null default 0, -- その日に歩いた回数
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists step_logs_user_idx on public.step_logs (user_id, date desc);

alter table public.step_logs enable row level security;

-- ══════════════════════════════════════════════════════════════
-- 偏り所見のキャッシュ
--  12) lean_cache … メーターの「読み」を保存。開くたびにAI生成しない
-- ══════════════════════════════════════════════════════════════

create table if not exists public.lean_cache (
  user_id     text primary key,
  lean        jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.lean_cache enable row level security;

-- ══════════════════════════════════════════════════════════════
-- じぶんワーク（ユーザーが自分で作るワーク／カードワーク）
--  13) custom_works … 名前・進め方（問いとカード）・じぶんの札
-- ══════════════════════════════════════════════════════════════

create table if not exists public.custom_works (
  id          bigserial primary key,
  user_id     text not null,
  name        text not null,
  emoji       text not null default '🌟',
  purpose     text not null default '',
  intro       text not null default '',
  closing     text not null default '',
  steps       jsonb not null default '[]'::jsonb,
  cards       jsonb not null default '[]'::jsonb,
  runs        integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists custom_works_user_idx on public.custom_works (user_id, created_at);

alter table public.custom_works enable row level security;

-- ══════════════════════════════════════════════════════════════
-- からだの記録（毎朝の体重・体脂肪率）
--  14) weight_logs … 1日1行。消さずにずっと貯め続ける
--      numeric(6,2) = 小数第2位まで（例 62.35kg / 18.40%）
-- ══════════════════════════════════════════════════════════════

create table if not exists public.weight_logs (
  id          bigserial primary key,
  user_id     text not null,
  date        text not null,              -- JSTの日付 YYYY-MM-DD
  weight      numeric(6,2),               -- kg
  fat         numeric(5,2),               -- %
  note        text,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists weight_logs_user_idx on public.weight_logs (user_id, date desc);

alter table public.weight_logs enable row level security;
