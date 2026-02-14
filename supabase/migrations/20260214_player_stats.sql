-- Player Statistics Table
CREATE TABLE IF NOT EXISTS player_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_kills INTEGER DEFAULT 0,
  total_damage BIGINT DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  highest_wave INTEGER DEFAULT 0,
  champion_stats JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index for faster leaderboard queries
CREATE INDEX idx_player_stats_damage ON player_stats(total_damage DESC);
CREATE INDEX idx_player_stats_kills ON player_stats(total_kills DESC);

-- Function to update player stats
CREATE OR REPLACE FUNCTION update_player_stats(
  p_user_id UUID,
  p_kills INTEGER,
  p_damage BIGINT,
  p_wave INTEGER,
  p_champion_id TEXT
) RETURNS void AS $$
BEGIN
  INSERT INTO player_stats (user_id, total_kills, total_damage, games_played, highest_wave, champion_stats)
  VALUES (
    p_user_id,
    p_kills,
    p_damage,
    1,
    p_wave,
    jsonb_build_object(p_champion_id, 1)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_kills = player_stats.total_kills + p_kills,
    total_damage = player_stats.total_damage + p_damage,
    games_played = player_stats.games_played + 1,
    highest_wave = GREATEST(player_stats.highest_wave, p_wave),
    champion_stats = player_stats.champion_stats || 
      jsonb_build_object(
        p_champion_id, 
        COALESCE((player_stats.champion_stats->>p_champion_id)::int, 0) + 1
      ),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
