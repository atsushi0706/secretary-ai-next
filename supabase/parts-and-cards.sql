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
