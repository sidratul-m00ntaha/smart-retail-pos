-- ============================================================
-- Creates the application database if it does not exist yet.
-- Runs automatically on "docker compose up". Safe to run again.
-- Tables are NOT created here - the backend will create them.
-- ============================================================
IF DB_ID(N'smart_retail_pos') IS NULL
BEGIN
    CREATE DATABASE smart_retail_pos;
    PRINT 'Created database smart_retail_pos';
END
ELSE
BEGIN
    PRINT 'Database smart_retail_pos already exists - nothing to do';
END
GO