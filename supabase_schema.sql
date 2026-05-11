-- ======================================================
-- PhotoCloud — Supabase Database Schema
-- Run this in your Supabase project → SQL Editor
-- ======================================================

-- Enable UUID extension (usually already enabled)
create extension if not exists "pgcrypto";

-- ── Photos table ────────────────────────────────────────
create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  url text not null,
  thumbnail_url text,
  album_id uuid,
  taken_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- ── Albums table ─────────────────────────────────────────
create table if not exists albums (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text not null,
  cover_url text,
  created_at timestamp with time zone default now()
);

-- ── Add foreign key: photos.album_id → albums.id ─────────
alter table photos
  add constraint photos_album_id_fkey
  foreign key (album_id)
  references albums(id)
  on delete set null;

-- ── Row Level Security ────────────────────────────────────
alter table photos enable row level security;
alter table albums enable row level security;

-- Photos: users only see/modify their own photos
create policy "Users can view their own photos"
  on photos for select
  using (auth.uid() = user_id);

create policy "Users can insert their own photos"
  on photos for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own photos"
  on photos for update
  using (auth.uid() = user_id);

create policy "Users can delete their own photos"
  on photos for delete
  using (auth.uid() = user_id);

-- Albums: users only see/modify their own albums
create policy "Users can view their own albums"
  on albums for select
  using (auth.uid() = user_id);

create policy "Users can insert their own albums"
  on albums for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own albums"
  on albums for update
  using (auth.uid() = user_id);

create policy "Users can delete their own albums"
  on albums for delete
  using (auth.uid() = user_id);

-- ── Indexes for performance ───────────────────────────────
create index if not exists photos_user_id_taken_at_idx
  on photos (user_id, taken_at desc);

create index if not exists photos_album_id_idx
  on photos (album_id);

create index if not exists albums_user_id_idx
  on albums (user_id, created_at desc);
