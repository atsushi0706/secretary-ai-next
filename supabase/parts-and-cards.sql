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
