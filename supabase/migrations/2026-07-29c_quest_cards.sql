-- 未来からのクエストカード（3日連続で使うと届く・1日1枚）。
create table if not exists quest_cards (
  id             bigint generated always as identity primary key,
  user_id        text not null,
  date           text not null,          -- 引いた日（JST）
  symbol         int  not null,          -- 1..16（抽象シンボル）
  interpretation text default '',         -- 本人の解釈
  challenge      text default '',         -- AIが深めた今日の課題
  done           boolean default false,   -- 立ち向かった＝完了
  created_at     timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists quest_cards_user_idx on quest_cards (user_id);
