-- Add missing columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended'));

-- Update name to full_name for consistency
UPDATE public.profiles SET full_name = name WHERE full_name IS NULL;

-- Add missing columns to audit_logs
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS entity TEXT,
ADD COLUMN IF NOT EXISTS entity_id UUID;