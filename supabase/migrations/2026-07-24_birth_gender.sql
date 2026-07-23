-- 大運（人生の10年周期）の順行/逆行に性別が要るため追加
-- 中身をコピーして Supabase の SQL Editor で Run するだけ。既存データは壊れない。
alter table public.user_settings add column if not exists birth_gender text; -- 'male' / 'female'
