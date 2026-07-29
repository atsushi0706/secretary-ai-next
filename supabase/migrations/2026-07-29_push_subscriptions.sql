-- ブラウザ・プッシュ通知（Web Push / VAPID）の購読情報。
-- 1ユーザーが複数端末を持てるので endpoint 単位で1行。endpoint がユニーク。
create table if not exists push_subscriptions (
  id          bigint generated always as identity primary key,
  user_id     text not null,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on push_subscriptions (user_id);
