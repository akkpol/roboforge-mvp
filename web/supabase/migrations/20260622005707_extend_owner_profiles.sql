-- Extend owner_profiles with platform profile fields
ALTER TABLE public.owner_profiles 
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS role_type text DEFAULT 'enthusiast',
  ADD COLUMN IF NOT EXISTS skill_level text DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS organization_name text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'owner_profiles_role_type_check' AND conrelid = 'public.owner_profiles'::regclass) THEN
    ALTER TABLE public.owner_profiles ADD CONSTRAINT owner_profiles_role_type_check CHECK (role_type IN ('maker', 'educator', 'enthusiast', 'parent', 'developer', 'other'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'owner_profiles_skill_level_check' AND conrelid = 'public.owner_profiles'::regclass) THEN
    ALTER TABLE public.owner_profiles ADD CONSTRAINT owner_profiles_skill_level_check CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'expert'));
  END IF;
END $$;
