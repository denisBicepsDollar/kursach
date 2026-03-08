CREATE DATABASE reports;

\connect reports

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  title TEXT,
  params JSONB,
  status TEXT DEFAULT 'В ожидании...',
  result_path TEXT,
  mime TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS reports_source_idx ON reports (source_db_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports (status);
