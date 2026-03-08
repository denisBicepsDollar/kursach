CREATE TABLE IF NOT EXISTS test_table (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO test_table (name) VALUES ('sample1'), ('sample2');

