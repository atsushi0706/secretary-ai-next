-- 管理画面で「誰が使っているか」を出すため、ログイン時のメールと表示名を保存する。
-- JWT方式でDBにユーザー表が無いので user_settings に持たせる。任意（無くても管理画面は動く）。
alter table user_settings add column if not exists email text;
alter table user_settings add column if not exists display_name text;
