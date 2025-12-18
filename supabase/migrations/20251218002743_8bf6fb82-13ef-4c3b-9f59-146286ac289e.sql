-- Create security_codes table for 2FA-like security
CREATE TABLE public.security_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '30 days'),
  last_used_at timestamp with time zone
);

-- Create unique index on user_id for active codes
CREATE UNIQUE INDEX idx_security_codes_user_active ON public.security_codes(user_id) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.security_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own security codes"
ON public.security_codes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert security codes"
ON public.security_codes
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own security codes"
ON public.security_codes
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all security codes
CREATE POLICY "Admins can view all security codes"
ON public.security_codes
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create system_settings table for configurations
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, setting_key)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own settings"
ON public.system_settings
FOR ALL
USING (auth.uid() = user_id);

-- Create ai_training_rules table for user-defined AI training
CREATE TABLE public.ai_training_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('financial', 'security', 'monitoring', 'compliance', 'integration')),
  rule_content text NOT NULL,
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  version integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.ai_training_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own AI rules"
ON public.ai_training_rules
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all AI rules"
ON public.ai_training_rules
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create system_health table for monitoring
CREATE TABLE public.system_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type text NOT NULL CHECK (check_type IN ('database', 'auth', 'storage', 'functions', 'integration')),
  status text NOT NULL CHECK (status IN ('healthy', 'degraded', 'critical', 'unknown')),
  message text,
  metadata jsonb DEFAULT '{}',
  checked_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view system health"
ON public.system_health
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert health checks"
ON public.system_health
FOR INSERT
WITH CHECK (true);

-- Function to generate security code on user creation
CREATE OR REPLACE FUNCTION public.generate_security_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
BEGIN
  -- Generate a 6-character alphanumeric code
  new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
  
  INSERT INTO public.security_codes (user_id, code)
  VALUES (NEW.id, new_code);
  
  RETURN NEW;
END;
$$;

-- Trigger to generate security code after user profile creation
CREATE TRIGGER on_profile_created_generate_code
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_security_code();

-- Create updated_at triggers
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_training_rules_updated_at
  BEFORE UPDATE ON public.ai_training_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();