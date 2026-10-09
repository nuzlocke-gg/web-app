-- Deadlines for every connection to this database (technical design,
-- "Deadlines"). They are database defaults, not session settings: Neon's
-- pooler runs PgBouncer in transaction mode, which refuses startup options and
-- drops a session SET. A default applies when a backend starts, so a backend
-- that was already open keeps its old values until it reconnects.
-- idle_in_transaction_session_timeout stops a leaked transaction from holding
-- the Run lock for every player. scripts/migrate.ts turns all three off for its
-- own session.
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET lock_timeout = %L', current_database(), '2s');
  EXECUTE format('ALTER DATABASE %I SET statement_timeout = %L', current_database(), '3s');
  EXECUTE format('ALTER DATABASE %I SET idle_in_transaction_session_timeout = %L', current_database(), '5s');
END
$$;
