-- ══════════════════════════════════════════════════════════════════════
--  Singa World 追加テーブル （これ1本を貼って Run すれば全部そろいます）
--
--  ・何度実行しても壊れません（すでにあるものは素通りします）
--  ・貼る場所：Supabase → SQL Editor → New query → 貼り付け → Run
--  ・「Success. No rows returned」と出れば成功です
--
--  入っているもの
--   0 土台（quest_cards / higher_quest / link_letter / goals）
--   1 guardians          内なる子の神殿で解放したガーディアン
--   2 skill_cards        ワークで手に入れたカード（金銀銅）
--   3 deep_reads         ディープアイデンティティの読み取り
--   4 methods            発信スタジオで育てるメソッド
--   5 broadcast_posts    生成したカルーセル投稿
--   6 work_sessions      ワーク1回ぶんの記録（発信の素材）
--   7 manual_answers     取扱説明書の16問の回答
--   8 manuals            生成した取扱説明書
--   9 lean_cache         メーターの所見（起動を速くするため）
--  10 push_subscriptions 通知の宛先（これが無いと通知が届きません）
--  11 step_logs          歩数
--  12 weight_logs        体重・体脂肪率
--  13 custom_works       じぶんワーク
--  ＋ user_settings に referred_by 列を追加（紹介リンク用）
-- ══════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════
--  土台のテーブル（これが無いと下の ALTER でエラーになります）
--   quest_cards   未来からのクエストカード（1日1枚）
--   higher_quest  ハイヤークエスト（今日の一手）
--   link_letter   未来からの手紙
--   goals         年・月・週の目標
-- ══════════════════════════════════════════════════════════════

create table if not exists public.quest_cards (
  id             bigserial primary key,
  user_id        text not null,
  date           text not null,
  symbol         integer not null default 1,
  title          text,
  interpretation text not null default '',
  challenge      text not null default '',
  done           boolean not null default false,
  created_at     timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists quest_cards_user_idx on public.quest_cards (user_id, date desc);

create table if not exists public.higher_quest (
  id          bigserial primary key,
  user_id     text not null,
  date        text not null,
  items       jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists higher_quest_user_idx on public.higher_quest (user_id, date desc);

create table if not exists public.link_letter (
  id          bigserial primary key,
  user_id     text not null,
  date        text not null,
  kind        text not null default 'future',
  body        text not null default '',
  source      text,
  read        boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists link_letter_user_idx on public.link_letter (user_id, date desc);

create table if not exists public.goals (
  id          bigserial primary key,
  user_id     text not null,
  scope       text not null,              -- year / month / week
  period      text not null,              -- 2026 / 2026-08 / 2026-W31 など
  vision      text not null default '',
  emotion     text not null default '',
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (user_id, scope, period)
);
create index if not exists goals_user_idx on public.goals (user_id, scope);

alter table public.quest_cards  enable row level security;
alter table public.higher_quest enable row level security;
alter table public.link_letter  enable row level security;
alter table public.goals        enable row level security;

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

-- 発信スタジオ（SNSアウトプット）

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

-- 紹介リンク（?ref=）で来た人の記録。user_settings は既存テーブル。
-- 万一まだ無くても、ここで止まらないようにする
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'user_settings') then
    alter table public.user_settings add column if not exists referred_by text;
  end if;
end $$;

alter table public.methods         enable row level security;
alter table public.broadcast_posts enable row level security;

-- 自分の取扱説明書

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

-- 発信の素材：ワーク1回ぶんの記録

--      （直近の会話をまとめて漁ると、やってもいない話題が主役になるため）

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

-- プッシュ通知の購読先

--      ※ これが無いと「通知ON」を押しても保存されず、
--        テスト送信で「購読が見つからなかった」になる

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

-- 散歩のおとも（歩数）

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

-- 偏り所見のキャッシュ

create table if not exists public.lean_cache (
  user_id     text primary key,
  lean        jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.lean_cache enable row level security;

-- じぶんワーク（ユーザーが自分で作るワーク／カードワーク）

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

-- からだの記録（毎朝の体重・体脂肪率）

--      numeric(6,2) = 小数第2位まで（例 62.35kg / 18.40%）

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

-- 未来からのクエスト：受け取ったときに入れる「一手」を覚えておく列
alter table public.quest_cards add column if not exists action text;

-- ═══ ⑦ 影獣の鏡（リアルバース・光回収） ═══
-- 保存するのは回収の結果（カード）だけ。相談の生の本文はここに入れない。

create table if not exists public.shadow_encounters (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  date        text not null,              -- JSTの日付 YYYY-MM-DD
  pair_id     text not null,              -- fire_self / wind_self など8種
  card        jsonb not null,             -- ShadowCard（光・許可の一文・境界線・一歩・Before/After）
  created_at  timestamptz not null default now()
);
create index if not exists shadow_encounters_user_idx on public.shadow_encounters (user_id, created_at desc);

alter table public.shadow_encounters enable row level security;
