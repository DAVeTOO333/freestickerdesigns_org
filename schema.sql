-- FreeStickerDesigns.org Database Schema
-- Run this in your Neon SQL editor

CREATE TABLE IF NOT EXISTS stickers (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  artist_name VARCHAR(100) NOT NULL,
  artist_url  TEXT,
  description TEXT,
  tags        TEXT[] DEFAULT '{}',
  download_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  status      VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for approved stickers (most common query)
CREATE INDEX IF NOT EXISTS idx_stickers_status_created 
  ON stickers(status, created_at DESC);

-- Index for tag filtering
CREATE INDEX IF NOT EXISTS idx_stickers_tags 
  ON stickers USING GIN(tags);

-- Index for artist filtering
CREATE INDEX IF NOT EXISTS idx_stickers_artist 
  ON stickers(artist_name);
