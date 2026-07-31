-- ワークの中でブロックが壊れた／新しい力が生まれたときに授かる「スキルカード」。
-- 金・銀・銅のレアリティを持つ。同じ key は1枚だけ（重複して増えない）。
create table if not exists skill_cards (
  id         bigint generated always as identity primary key,
  user_id    text not null,
  key        text not null,
  title      text not null,
  body       text not null default '',
  rarity     text not null default 'bronze',   -- bronze / silver / gold
  source     text not null default '',          -- どのワークで手に入れたか
  date       text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, key)
);
create index if not exists skill_cards_user_idx on skill_cards (user_id);
