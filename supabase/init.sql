create extension if not exists pgcrypto;

create table if not exists public.users (
  id serial primary key,
  username varchar(50) not null unique,
  password varchar(255) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id varchar(36) primary key default gen_random_uuid()::text,
  user_id integer not null references public.users(id) on delete cascade,
  avatar_url text,
  nickname varchar(50) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.wardrobe_items (
  id varchar(36) primary key default gen_random_uuid()::text,
  user_id integer not null references public.users(id) on delete cascade,
  image_url text not null,
  category varchar(20) not null,
  color varchar(20) not null,
  style_tags jsonb default '[]'::jsonb,
  season varchar(20) not null,
  ai_description text,
  user_description text,
  created_at timestamptz not null default now()
);

create table if not exists public.outfit_recommendations (
  id varchar(36) primary key default gen_random_uuid()::text,
  user_id integer not null references public.users(id) on delete cascade,
  user_requirement text not null,
  scene varchar(20),
  recommended_style varchar(20),
  reason text,
  result_image_url text,
  is_selected integer default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.outfit_items (
  id varchar(36) primary key default gen_random_uuid()::text,
  outfit_id varchar(36) not null references public.outfit_recommendations(id) on delete cascade,
  item_id varchar(36) not null references public.wardrobe_items(id) on delete cascade,
  display_order integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_feedback (
  id varchar(36) primary key default gen_random_uuid()::text,
  outfit_id varchar(36) not null references public.outfit_recommendations(id) on delete cascade,
  user_id integer not null references public.users(id) on delete cascade,
  feedback_type varchar(20) not null,
  feedback_reason text,
  created_at timestamptz not null default now()
);

create index if not exists users_username_idx on public.users (username);
create index if not exists profiles_user_id_idx on public.profiles (user_id);
create index if not exists wardrobe_items_user_id_idx on public.wardrobe_items (user_id);
create index if not exists wardrobe_items_category_idx on public.wardrobe_items (category);
create index if not exists wardrobe_items_created_at_idx on public.wardrobe_items (created_at);
create index if not exists outfit_recommendations_user_id_idx on public.outfit_recommendations (user_id);
create index if not exists outfit_recommendations_created_at_idx on public.outfit_recommendations (created_at);
create index if not exists outfit_items_outfit_id_idx on public.outfit_items (outfit_id);
create index if not exists outfit_items_item_id_idx on public.outfit_items (item_id);
create index if not exists user_feedback_outfit_id_idx on public.user_feedback (outfit_id);
create index if not exists user_feedback_user_id_idx on public.user_feedback (user_id);

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.wardrobe_items enable row level security;
alter table public.outfit_recommendations enable row level security;
alter table public.outfit_items enable row level security;
alter table public.user_feedback enable row level security;

drop policy if exists "users_allow_select" on public.users;
drop policy if exists "users_allow_insert" on public.users;
drop policy if exists "users_block_update" on public.users;
drop policy if exists "users_block_delete" on public.users;
create policy "users_allow_select" on public.users for select to public using (true);
create policy "users_allow_insert" on public.users for insert to public with check (true);
create policy "users_block_update" on public.users for update to public using (false);
create policy "users_block_delete" on public.users for delete to public using (false);

drop policy if exists "profiles_allow_select" on public.profiles;
drop policy if exists "profiles_allow_insert" on public.profiles;
drop policy if exists "profiles_allow_update" on public.profiles;
drop policy if exists "profiles_block_delete" on public.profiles;
create policy "profiles_allow_select" on public.profiles for select to public using (true);
create policy "profiles_allow_insert" on public.profiles for insert to public with check (true);
create policy "profiles_allow_update" on public.profiles for update to public using (true);
create policy "profiles_block_delete" on public.profiles for delete to public using (false);

drop policy if exists "wardrobe_items_allow_select" on public.wardrobe_items;
drop policy if exists "wardrobe_items_allow_insert" on public.wardrobe_items;
drop policy if exists "wardrobe_items_allow_update" on public.wardrobe_items;
drop policy if exists "wardrobe_items_block_delete" on public.wardrobe_items;
create policy "wardrobe_items_allow_select" on public.wardrobe_items for select to public using (true);
create policy "wardrobe_items_allow_insert" on public.wardrobe_items for insert to public with check (true);
create policy "wardrobe_items_allow_update" on public.wardrobe_items for update to public using (true);
create policy "wardrobe_items_block_delete" on public.wardrobe_items for delete to public using (false);

drop policy if exists "outfit_recommendations_allow_select" on public.outfit_recommendations;
drop policy if exists "outfit_recommendations_allow_insert" on public.outfit_recommendations;
drop policy if exists "outfit_recommendations_allow_update" on public.outfit_recommendations;
drop policy if exists "outfit_recommendations_block_delete" on public.outfit_recommendations;
create policy "outfit_recommendations_allow_select" on public.outfit_recommendations for select to public using (true);
create policy "outfit_recommendations_allow_insert" on public.outfit_recommendations for insert to public with check (true);
create policy "outfit_recommendations_allow_update" on public.outfit_recommendations for update to public using (true);
create policy "outfit_recommendations_block_delete" on public.outfit_recommendations for delete to public using (false);

drop policy if exists "outfit_items_allow_select" on public.outfit_items;
drop policy if exists "outfit_items_allow_insert" on public.outfit_items;
drop policy if exists "outfit_items_allow_update" on public.outfit_items;
drop policy if exists "outfit_items_block_delete" on public.outfit_items;
create policy "outfit_items_allow_select" on public.outfit_items for select to public using (true);
create policy "outfit_items_allow_insert" on public.outfit_items for insert to public with check (true);
create policy "outfit_items_allow_update" on public.outfit_items for update to public using (true);
create policy "outfit_items_block_delete" on public.outfit_items for delete to public using (false);

drop policy if exists "user_feedback_allow_select" on public.user_feedback;
drop policy if exists "user_feedback_allow_insert" on public.user_feedback;
drop policy if exists "user_feedback_allow_update" on public.user_feedback;
drop policy if exists "user_feedback_block_delete" on public.user_feedback;
create policy "user_feedback_allow_select" on public.user_feedback for select to public using (true);
create policy "user_feedback_allow_insert" on public.user_feedback for insert to public with check (true);
create policy "user_feedback_allow_update" on public.user_feedback for update to public using (true);
create policy "user_feedback_block_delete" on public.user_feedback for delete to public using (false);
