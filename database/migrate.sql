-- Safe to run against an existing local database after pulling this project.
-- It delegates to the canonical schema so new installations and upgrades stay aligned.
\i database/schema.sql
