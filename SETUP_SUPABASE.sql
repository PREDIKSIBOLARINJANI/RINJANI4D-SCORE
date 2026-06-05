-- ============================================================
-- RINJANI4D — Setup SQL untuk Supabase
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- LANGKAH 1: Buat tabel matches
CREATE TABLE IF NOT EXISTS public.matches (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  league      TEXT        NOT NULL,
  team1       TEXT        NOT NULL,
  team2       TEXT        NOT NULL,
  match_time  TIMESTAMPTZ NOT NULL,
  prediction  TEXT,
  logo1_url   TEXT,
  logo2_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_matches_match_time
  ON public.matches (match_time ASC);

-- LANGKAH 2: Aktifkan Row Level Security
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read matches"
  ON public.matches FOR SELECT USING (true);

CREATE POLICY "Anyone can insert matches"
  ON public.matches FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can delete matches"
  ON public.matches FOR DELETE USING (true);

-- LANGKAH 3: Storage Policy (jalankan SETELAH buat bucket via Dashboard)
-- Buat bucket: Storage → New Bucket → Nama: club-logos → Public: ✅

CREATE POLICY "Public read club logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'club-logos');

CREATE POLICY "Anyone can upload club logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'club-logos');
