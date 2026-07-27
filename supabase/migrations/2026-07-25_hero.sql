-- 主人公レベルアップ機能。1ユーザー1行（主人公設定＋最新のレベル評価をキャッシュ）。
-- 中身をコピーして Supabase の SQL Editor で Run するだけ。既存データは壊れない。
create table if not exists public.hero (
  user_id text primary key,
  enemy_world text default '',      -- 減らしたい世界
  desired_world text default '',    -- 増やしたい世界
  needed_people text default '',    -- その世界に必要な人
  hero_statement text default '',   -- 生きると決めた主人公像
  levels jsonb,                     -- {inner,embodiment,relationship,delivery,socialization}
  assessment jsonb,                 -- 最新のAI評価（summary/strongest/growth/nextAction 等）
  history jsonb,                    -- レベルの推移（変化の線形用）[{at, levels}]
  updated_at timestamptz default now(),
  assessed_at timestamptz
);
alter table public.hero enable row level security;
