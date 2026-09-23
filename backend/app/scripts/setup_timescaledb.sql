-- ==========================================================
-- VayuBudhi: PostgreSQL & TimescaleDB Production Migration
-- Converts station_observations into a time-series hypertable
-- ==========================================================

-- 1. Enable TimescaleDB extension if available
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- 2. Ensure stations table exists
CREATE TABLE IF NOT EXISTS stations (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    agency VARCHAR(100),
    source VARCHAR(50) NOT NULL DEFAULT 'cpcb_caaqms',
    ward_id VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS ix_stations_city ON stations (city);
CREATE INDEX IF NOT EXISTS ix_stations_ward_id ON stations (ward_id);

-- 3. Ensure station_observations table exists
CREATE TABLE IF NOT EXISTS station_observations (
    id BIGSERIAL,
    station_id VARCHAR(100) NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    pm25 DOUBLE PRECISION,
    pm10 DOUBLE PRECISION,
    no2 DOUBLE PRECISION,
    so2 DOUBLE PRECISION,
    co DOUBLE PRECISION,
    o3 DOUBLE PRECISION,
    nh3 DOUBLE PRECISION,
    aqi_in DOUBLE PRECISION,
    aqi_us DOUBLE PRECISION,
    primary_pollutant VARCHAR(50),
    source VARCHAR(50) NOT NULL DEFAULT 'cpcb_caaqms',
    raw_payload JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc'),
    PRIMARY KEY (station_id, timestamp)
);

CREATE INDEX IF NOT EXISTS ix_station_observations_time ON station_observations (timestamp DESC);
CREATE INDEX IF NOT EXISTS ix_station_observations_station_time ON station_observations (station_id, timestamp DESC);

-- 4. Convert into TimescaleDB hypertable (chunk by 7 days for fast queries & compression)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'
    ) THEN
        PERFORM create_hypertable(
            'station_observations',
            'timestamp',
            if_not_exists => TRUE,
            chunk_time_interval => INTERVAL '7 days'
        );
        RAISE NOTICE 'TimescaleDB hypertable created successfully for station_observations.';
    ELSE
        RAISE NOTICE 'TimescaleDB extension not present; standard partitioned/indexed PostgreSQL table in use.';
    END IF;
END $$;
