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

-- ═══ ⑧ 状態チェックの3点セット＋レポート履歴＋ワークの鍵 ═══

-- どんな一日だったか（夜のチェック。8種類・1日1件で上書き）
create table if not exists public.day_marks (
  user_id     text not null,
  date        text not null,              -- JSTの日付 YYYY-MM-DD
  kind        text not null,              -- full/burn/calm/wave/fog/spark/hold/empty
  updated_at  timestamptz not null default now(),
  primary key (user_id, date)
);
alter table public.day_marks enable row level security;

-- 「この頃のわたし」レポートの履歴（1日1件で上書き）
create table if not exists public.reports (
  user_id     text not null,
  date        text not null,
  report      text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, date)
);
alter table public.reports enable row level security;

-- アプリ全体の設定（ワークの鍵など）
create table if not exists public.app_config (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
alter table public.app_config enable row level security;

-- ═══ ⑨ 今日のあなたの取扱説明書（10年後の自分から届く・1日1通） ═══
create table if not exists public.today_manuals (
  user_id     text not null,
  date        text not null,              -- JSTの日付 YYYY-MM-DD
  data        jsonb not null,             -- headline / good[2] / care / closing
  updated_at  timestamptz not null default now(),
  primary key (user_id, date)
);
alter table public.today_manuals enable row level security;

-- ═══ ⑩ 現実で終わらせたこと（メーターの「現実」側の材料） ═══
-- これが無かったので、リアルバースで日常タスクをこなしてもメーターに反映されなかった。
-- aligned = 理想（クエスト）から生まれたタスクを終わらせた＝「今日つないだ」
create table if not exists public.real_actions (
  id          bigserial primary key,
  user_id     text not null,
  date        text not null,              -- JSTの日付 YYYY-MM-DD
  kind        text not null,              -- task / quest / card
  title       text,
  aligned     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists real_actions_user_idx on public.real_actions (user_id, date desc);
alter table public.real_actions enable row level security;

-- ═══ ⑪ 明日への引き継ぎ（夜の振り返りで決めたもの） ═══
-- weekday と decided_at を持つ理由：
--  ・週刊レポートで「何曜日にどう感じていたか」を並べるのに要る
--  ・あとから「いつ決めたのか」を辿れないと、振り返りの精度が落ちる
create table if not exists public.tomorrow_focus (
  user_id     text not null,
  date        text not null,              -- 振り返りをした日（JST）
  target_date text not null,              -- 対象の日（＝明日）
  weekday     smallint not null,          -- 0=日 〜 6=土（JST）
  emotion     text,                       -- 明日の夜、どんな感情でいたいか
  why         text,
  actions     jsonb not null default '[]'::jsonb,
  decided_at  timestamptz not null default now(),   -- 決めた瞬間の実時刻
  updated_at  timestamptz not null default now(),
  primary key (user_id, date)
);
create index if not exists tomorrow_focus_target_idx on public.tomorrow_focus (user_id, target_date);
alter table public.tomorrow_focus enable row level security;

-- ═══ ⑫ 週刊レポート（金曜に作り、マスターが承認してから届く） ═══
create table if not exists public.weekly_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  week_start  text not null,              -- その週の月曜（JST）
  body        text not null,
  status      text not null default 'draft',   -- draft / approved / sent
  approved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, week_start)
);
create index if not exists weekly_reports_status_idx on public.weekly_reports (status, week_start desc);
alter table public.weekly_reports enable row level security;

-- 週刊レポートに「中身」を持たせる（宝箱で、悩み→解釈→進みを並べるため）
alter table public.weekly_reports add column if not exists facets jsonb;

-- ミールレンズ（食事の写真 → カロリーとPFCの目安）
-- mealens-app で作ったものを、この世界の中へ移したときに足した表。
create table if not exists public.meal_records (
  id                 uuid primary key default gen_random_uuid(),
  user_id            text not null,
  date               date not null,
  meal_type          text not null default 'other',
  meal_name          text not null default '',
  foods              jsonb not null default '[]'::jsonb,
  total_kcal         integer not null default 0,
  protein_g          real not null default 0,
  fat_g              real not null default 0,
  carbs_g            real not null default 0,
  confidence         integer not null default 0,
  estimate_min_kcal  integer not null default 0,
  estimate_max_kcal  integer not null default 0,
  uncertainty_reason text not null default '',
  created_at         timestamptz not null default now()
);
create index if not exists meal_records_user_date_idx on public.meal_records (user_id, date);
alter table public.meal_records enable row level security;

-- ミールレンズ：消費カロリーを出すのに要る3つ
-- （体重は weight_logs、年齢と性別は誕生日の設定から取れるので、足りないのはこれだけ）
alter table public.user_settings add column if not exists height_cm        numeric(5,1);
alter table public.user_settings add column if not exists activity_level   text;
alter table public.user_settings add column if not exists goal_kg_per_month numeric(4,2);
-- 写真から見たビタミン・ミネラル（あとから足した列）
alter table public.meal_records add column if not exists micros jsonb not null default '{}'::jsonb;

-- 優先順位（1・2・3）と、そこに至る道のりの分解
-- ※ 既存の goals テーブル（年→月→週の青写真）とは別物
create table if not exists public.priority_goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,
  rank          smallint not null default 1,
  title         text not null default '',
  subject       text not null default 'me',   -- me / others（誰のための目標か）
  kind          text not null default '',     -- money / state / mixed（お金か状態か）
  metric        text not null default '',
  target_value  numeric,
  unit          text not null default '',
  due           date,
  status        text not null default 'active',
  plan          jsonb,                        -- 分解の途中経過（段ごとに増える）
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists priority_goals_user_idx on public.priority_goals (user_id, rank);
alter table public.priority_goals enable row level security;

create table if not exists public.goal_steps (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  goal_id    uuid not null,
  milestone  text not null default '',
  title      text not null default '',
  minutes    smallint not null default 30,   -- 1日30分の粒
  due        date,
  done       boolean not null default false,
  order_no   integer not null default 0,
  task_id    text,                           -- Googleタスクに置いたときのID
  created_at timestamptz not null default now()
);
create index if not exists goal_steps_goal_idx on public.goal_steps (user_id, goal_id, order_no);
alter table public.goal_steps enable row level security;

-- マインドマップ・スケジューラー（淳くん専用）
-- 話した内容を構造にして、30分の粒まで割って、フェーズのロードマップに組む
create table if not exists public.mind_maps (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  title      text not null default '',
  tree       jsonb not null default '{}'::jsonb,
  schedule   jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mind_maps_user_idx on public.mind_maps (user_id, updated_at desc);
alter table public.mind_maps enable row level security;
