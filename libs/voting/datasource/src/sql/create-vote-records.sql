CREATE TABLE IF NOT EXISTS vote_records (
  id VARCHAR(26) PRIMARY KEY,
  target_id VARCHAR(26) NOT NULL,
  voter_ip_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT vote_records_target_ip_unique UNIQUE (target_id, voter_ip_hash)
);
CREATE INDEX IF NOT EXISTS vote_records_ip_time_idx ON vote_records (voter_ip_hash, created_at);