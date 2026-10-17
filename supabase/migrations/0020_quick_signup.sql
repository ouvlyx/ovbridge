-- =====================================================
-- OvBridge — Migration 0020: Quick Signup & Pseudo Availability
-- =====================================================

-- a) Constraint UNIQUE on ovbridge_profiles.display_name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ovbridge_profiles_display_name_key'
  ) THEN
    ALTER TABLE ovbridge.ovbridge_profiles
      ADD CONSTRAINT ovbridge_profiles_display_name_key UNIQUE (display_name);
  END IF;
END $$;

-- b) Index on display_name (case insensitive)
CREATE INDEX IF NOT EXISTS ovbridge_profiles_display_name_idx
  ON ovbridge.ovbridge_profiles (lower(display_name));

-- c) Function ovbridge.generate_available_pseudos(p_count int)
CREATE OR REPLACE FUNCTION ovbridge.generate_available_pseudos(p_count int DEFAULT 4)
RETURNS TABLE (pseudo text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = 'ovbridge'
AS $$
DECLARE
  v_prefixes text[] := ARRAY[
    'Nova', 'Pixel', 'Astra', 'Cosmo', 'Cyber', 'Hyper', 'Orion', 'Pulse',
    'Chrono', 'Vortex', 'Apex', 'Zenith', 'Krypton', 'Lyra', 'Stellar',
    'Aether', 'Nexus', 'Solar', 'Lunar', 'Echo', 'Helios', 'Vector', 'Spectra'
  ];
  v_suffixes text[] := ARRAY[
    'Xyl', 'Orion', 'Vortex', 'Pulse', 'Zen', 'Flux', 'Nova', 'Rift',
    'Spark', 'Wave', 'Core', 'Link', 'Shift', 'Beat', 'Drift', 'Storm',
    'Peak', 'Byte', 'Glow', 'Grid', 'Forge', 'Vault', 'Sync', 'Ray'
  ];
  v_cand text;
  v_generated int := 0;
  v_attempts int := 0;
  v_max_attempts int := 100;
  v_prefix text;
  v_suffix text;
  v_result text[] := ARRAY[]::text[];
BEGIN
  IF p_count IS NULL OR p_count < 1 THEN
    p_count := 4;
  END IF;

  WHILE v_generated < p_count AND v_attempts < v_max_attempts LOOP
    v_attempts := v_attempts + 1;
    v_prefix := v_prefixes[1 + floor(random() * array_length(v_prefixes, 1))::int];
    v_suffix := v_suffixes[1 + floor(random() * array_length(v_suffixes, 1))::int];

    IF v_prefix = v_suffix THEN
      v_suffix := v_suffixes[1 + (floor(random() * array_length(v_suffixes, 1))::int % array_length(v_suffixes, 1))];
    END IF;

    v_cand := v_prefix || '-' || v_suffix;

    IF NOT EXISTS (
      SELECT 1 FROM ovbridge.ovbridge_profiles WHERE lower(display_name) = lower(v_cand)
    ) AND NOT (v_cand = ANY(v_result)) THEN
      v_result := array_append(v_result, v_cand);
      v_generated := v_generated + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT unnest(v_result);
END;
$$;

-- d) Function ovbridge.check_pseudo_availability(p_pseudo text) returns boolean
CREATE OR REPLACE FUNCTION ovbridge.check_pseudo_availability(p_pseudo text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'ovbridge'
AS $$
DECLARE
  v_clean text;
BEGIN
  IF p_pseudo IS NULL THEN
    RETURN false;
  END IF;

  v_clean := trim(p_pseudo);
  IF length(v_clean) < 3 OR length(v_clean) > 30 THEN
    RETURN false;
  END IF;

  IF v_clean !~ '^[a-zA-Z0-9_-]+$' THEN
    RETURN false;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1
    FROM ovbridge.ovbridge_profiles
    WHERE lower(display_name) = lower(v_clean)
  );
END;
$$;

-- e) Grants (anon + authenticated)
GRANT EXECUTE ON FUNCTION ovbridge.generate_available_pseudos(int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION ovbridge.check_pseudo_availability(text) TO anon, authenticated;

-- f) NOTIFY pgrst to reload schema cache
NOTIFY pgrst, 'reload schema';
