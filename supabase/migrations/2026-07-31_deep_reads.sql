-- アカシックの深層記録。レベル(%)到達で解放された章を、一度読んだらそのまま保存する。
create table if not exists deep_reads (
  id         bigint generated always as identity primary key,
  user_id    text not null,
  chapter    text not null,        -- nature / strength / shadow / mission / hidden
  body       text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, chapter)
);
create index if not exists deep_reads_user_idx on deep_reads (user_id);
